import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartnerCurrency } from '@prisma/client';
import { CreateContactDto } from './create-contact.dto';

export class CreatePartnerDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  commercialRegister?: string;

  @IsString()
  @IsOptional()
  nif?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @IsEnum(PartnerCurrency)
  @IsOptional()
  currency?: PartnerCurrency;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContactDto)
  @IsOptional()
  contacts?: CreateContactDto[];

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  categoryIds?: string[];
}
