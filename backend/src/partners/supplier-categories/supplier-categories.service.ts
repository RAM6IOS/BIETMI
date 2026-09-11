import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierCategoryDto } from './dto/create-supplier-category.dto';
import { UpdateSupplierCategoryDto } from './dto/update-supplier-category.dto';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class SupplierCategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.supplierCategory.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.supplierCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    return category;
  }

  async create(dto: CreateSupplierCategoryDto) {
    try {
      return await this.prisma.supplierCategory.create({
        data: { name: dto.name },
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  async update(id: string, dto: UpdateSupplierCategoryDto) {
    await this.ensureExists(id);

    try {
      return await this.prisma.supplierCategory.update({
        where: { id },
        data: { name: dto.name },
      });
    } catch (error) {
      this.rethrowUniqueConflict(error);
      throw error;
    }
  }

  async remove(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    const category = await this.prisma.supplierCategory.findUnique({
      where: { id },
      include: { _count: { select: { partners: true } } },
    });

    if (!category) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    if (category._count.partners > 0) {
      throw new ConflictException('لا يمكن حذف التصنيف لأنه مرتبط بموردين');
    }

    return this.prisma.supplierCategory.delete({ where: { id } });
  }

  private async ensureExists(id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new NotFoundException('التصنيف غير موجود');
    }

    const existing = await this.prisma.supplierCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('التصنيف غير موجود');
    }
  }

  private rethrowUniqueConflict(
    error: unknown,
    message = 'اسم التصنيف مستخدم بالفعل',
  ) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(message);
    }
  }
}
