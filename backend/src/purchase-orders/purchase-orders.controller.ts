import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CurrencyInterceptor } from '../invoices/currency.interceptor';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';

const PURCHASE_ORDER_ROLES = [Role.admin, Role.purchasing];

@Controller('purchase-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(CurrencyInterceptor)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @Roles(...PURCHASE_ORDER_ROLES)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(user, dto);
  }

  @Post(':id/send')
  @Roles(...PURCHASE_ORDER_ROLES)
  @HttpCode(HttpStatus.OK)
  send(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.purchaseOrdersService.send(user, id);
  }

  @Get()
  @Roles(...PURCHASE_ORDER_ROLES)
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ListPurchaseOrdersDto,
  ) {
    return this.purchaseOrdersService.findAll(user, query);
  }

  @Get(':id')
  @Roles(...PURCHASE_ORDER_ROLES)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.purchaseOrdersService.findOne(user, id);
  }
}
