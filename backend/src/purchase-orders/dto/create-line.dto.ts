import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderLineDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @Type(() => Number)
  quantity: number;

  @Type(() => Number)
  unitPrice: number;
}
