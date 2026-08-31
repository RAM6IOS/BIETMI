import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceLineDto } from '../../invoices/dto/create-line.dto';

export class UpdateQuoteDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  partnerId?: string;

  @IsString()
  @IsOptional()
  objet?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  @IsOptional()
  lines?: CreateInvoiceLineDto[];
}
