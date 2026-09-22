import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PartnerType, Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { ListPartnersDto } from './dto/list-partners.dto';

const SUPPLIER_TYPE = PartnerType.supplier;

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.admin, Role.purchasing)
export class SuppliersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthUser,
    @Body() createPartnerDto: CreatePartnerDto,
  ) {
    return this.partnersService.create(
      createPartnerDto,
      SUPPLIER_TYPE,
      user.workspace,
    );
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListPartnersDto) {
    return this.partnersService.findAll(query, SUPPLIER_TYPE, user.workspace);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.partnersService.findOne(id, SUPPLIER_TYPE, user.workspace);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ) {
    return this.partnersService.update(
      id,
      updatePartnerDto,
      SUPPLIER_TYPE,
      user.workspace,
    );
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.partnersService.remove(id, SUPPLIER_TYPE, user.workspace);
  }
}
