import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import type { Company } from '@prisma/client';

const COMPANY_ID = '00000000-0000-4000-8000-000000000001';

const DEFAULT_ROW = {
  id: COMPANY_ID,
  name: 'EURL BIETMI PLUS',
  logoUrl: null,
  siegeSocial: null,
  mobile: null,
  telFax: null,
  rc: null,
  nif: null,
  ain: null,
  banqueBaraka: null,
};

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async get(): Promise<Company> {
    const existing = await this.prisma.company.findUnique({
      where: { id: COMPANY_ID },
    });
    if (existing) return existing;

    const hasAny = await this.prisma.company.count();
    if (hasAny > 0) {
      const first = await this.prisma.company.findFirst();
      if (first) return first;
    }

    return this.prisma.company.create({ data: DEFAULT_ROW });
  }

  async update(dto: UpdateCompanyDto): Promise<Company> {
    const current = await this.get();
    return this.prisma.company.update({
      where: { id: current.id },
      data: dto,
    });
  }
}
