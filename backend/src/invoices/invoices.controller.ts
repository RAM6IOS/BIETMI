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
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { CurrencyInterceptor } from './currency.interceptor';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ListInvoicesDto } from './dto/list-invoices.dto';

const WRITE_ROLES = [Role.admin, Role.commercial];
const READ_ROLES = [Role.admin, Role.commercial, Role.accountant];

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(CurrencyInterceptor)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(user, dto);
  }

  @Post(':id/issue')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  issue(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.issue(user, id);
  }

  @Get('reports/outstanding')
  @Roles(...READ_ROLES)
  outstanding(
    @CurrentUser() user: AuthUser,
    @Query('overdue') overdue?: string,
  ) {
    return this.invoicesService.outstanding(
      user,
      overdue === 'true' || overdue === '1',
    );
  }

  @Get()
  @Roles(...READ_ROLES)
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListInvoicesDto) {
    return this.invoicesService.findAll(user, query);
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.invoicesService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.remove(user, id);
  }
}
