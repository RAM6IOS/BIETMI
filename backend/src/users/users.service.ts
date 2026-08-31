import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { conflictWithCode } from '../common/errors/app-errors';
import type { AuthUser } from '../common/decorators/current-user.decorator';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BCRYPT_ROUNDS = 12;

// Readable, copy-pasteable, speakable temp password: URL-safe alphanumerics.
function generateTempPassword(): string {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

const USER_PUBLIC_SELECT = {
  id: true,
  username: true,
  fullName: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private assertAdmin(user: AuthUser) {
    if (user.role !== Role.admin) {
      throw new ForbiddenException('فقط المدير يمكنه إدارة المستخدمين');
    }
  }

  async create(user: AuthUser, dto: CreateUserDto) {
    this.assertAdmin(user);

    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
      select: { id: true },
    });
    if (existing) {
      throw conflictWithCode(
        'CONFLICT_USERNAME_EXISTS',
        'اسم المستخدم مستخدم بالفعل',
      );
    }

    const tempPassword = dto.tempPassword ?? generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const created = await this.prisma.user.create({
      data: {
        username: dto.username,
        fullName: dto.fullName,
        role: dto.role,
        passwordHash,
        mustChangePassword: true,
      },
      select: USER_PUBLIC_SELECT,
    });

    return { ...created, mustChangePassword: true, tempPassword };
  }

  async findAll(user: AuthUser, query: ListUsersDto) {
    this.assertAdmin(user);

    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const search = query.search?.trim();

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { fullName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        select: USER_PUBLIC_SELECT,
        where,
        orderBy:
          query.sortBy && query.sortOrder
            ? { [query.sortBy]: query.sortOrder }
            : { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(user: AuthUser, id: string, dto: UpdateUserDto) {
    this.assertAdmin(user);

    if (
      !UUID_REGEX.test(id) ||
      !(await this.prisma.user.findUnique({ where: { id } }))
    ) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const updateData: { fullName?: string; role?: Role; isActive?: boolean } =
      {};
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_PUBLIC_SELECT,
    });

    return updated;
  }

  async resetUserPassword(user: AuthUser, id: string) {
    this.assertAdmin(user);

    if (
      !UUID_REGEX.test(id) ||
      !(await this.prisma.user.findUnique({ where: { id } }))
    ) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });

    return { tempPassword, mustChangePassword: true };
  }

  async remove(user: AuthUser, id: string) {
    this.assertAdmin(user);

    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const found = await this.prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            createdInvoices: true,
            createdQuotes: true,
            createdPurchaseOrders: true,
          },
        },
      },
    });

    if (!found) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    if (id === user.userId) {
      throw new BadRequestException({
        statusCode: 400,
        errorCode: 'SELF_DELETE_FORBIDDEN',
        message: 'لا يمكنك حذف حسابك الخاص',
      });
    }

    const hasRecords =
      found._count.createdInvoices +
        found._count.createdQuotes +
        found._count.createdPurchaseOrders >
      0;
    if (hasRecords) {
      throw conflictWithCode(
        'CONFLICT_USER_HAS_RECORDS',
        'لا يمكن حذف المستخدم لأنه مرتبط بفواتير أو عروض أسعار أو طلبات شراء. يمكنك إلغاء تفعيله بدلاً من ذلك.',
      );
    }

    if (found.role === Role.admin && found.isActive) {
      const activeAdmins = await this.prisma.user.count({
        where: { role: Role.admin, isActive: true },
      });
      if (activeAdmins <= 1) {
        throw conflictWithCode(
          'CONFLICT_LAST_ADMIN',
          'لا يمكن حذف آخر مدير نشط في النظام',
        );
      }
    }

    await this.prisma.user.delete({ where: { id } });

    return { id, deleted: true };
  }

  async changeOwnPassword(user: AuthUser, dto: ChangePasswordDto) {
    const found = await this.prisma.user.findUnique({
      where: { id: user.userId },
    });
    if (!found) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const isCurrentValid = await bcrypt.compare(
      dto.currentPassword,
      found.passwordHash,
    );
    if (!isCurrentValid) {
      throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    }

    const sameAsOld = await bcrypt.compare(dto.newPassword, found.passwordHash);
    if (sameAsOld) {
      throw new BadRequestException(
        'كلمة المرور الجديدة يجب أن تختلف عن الحالية',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return { success: true };
  }
}
