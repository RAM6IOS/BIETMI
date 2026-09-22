import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Workspace, type Company } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

const DEFAULT_NAME = 'EURL BIETMI PLUS';

function defaultRow(workspace: Workspace) {
  return {
    id: randomUUID(),
    workspace,
    name: DEFAULT_NAME,
    logoUrl: null,
    siegeSocial: null,
    mobile: null,
    telFax: null,
    rc: null,
    nif: null,
    ain: null,
    banqueBaraka: null,
  };
}

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async get(workspace: Workspace): Promise<Company> {
    const existing = await this.prisma.company.findUnique({
      where: { workspace },
    });
    if (existing) return existing;

    return this.prisma.company.create({ data: defaultRow(workspace) });
  }

  async update(workspace: Workspace, dto: UpdateCompanyDto): Promise<Company> {
    const current = await this.get(workspace);
    return this.prisma.company.update({
      where: { id: current.id },
      data: dto,
    });
  }
}
