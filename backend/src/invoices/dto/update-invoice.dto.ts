import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceLineDto } from './create-line.dto';

export class UpdateInvoiceDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  partnerId?: string;

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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineDto)
  @IsOptional()
  lines?: CreateInvoiceLineDto[];
}
