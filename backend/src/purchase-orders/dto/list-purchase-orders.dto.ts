import { IsString, IsOptional, IsEnum, IsIn } from 'class-validator';
import { PurchaseOrderStatus } from '@prisma/client';

export class ListPurchaseOrdersDto {
  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  @IsIn(['orderNumber', 'orderDate', 'totalAmount', 'createdAt'])
  sortBy?: string = 'createdAt';

  @IsString()
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';

  @IsString()
  @IsOptional()
  page?: string = '1';

  @IsString()
  @IsOptional()
  limit?: string = '20';
}
