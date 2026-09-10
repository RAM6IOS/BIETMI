import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  ArrayMaxSize,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceLineDto } from './create-line.dto';
import { PaymentMethodDto } from '../../common/dto/payment-method.dto';

export class CreateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  partnerId: string;

  @IsString()
  @IsOptional()
  issueDate?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  internalReference?: string;

  @IsString()
  @IsOptional()
  objet?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;

  @IsArray()
  @IsOptional()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  paymentMethods?: PaymentMethodDto[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  lines: CreateInvoiceLineDto[];
}
