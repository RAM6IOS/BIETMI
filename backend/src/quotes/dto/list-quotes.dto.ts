import { IsString, IsOptional, IsEnum, IsIn } from 'class-validator';
import { QuoteStatus } from '@prisma/client';

export class ListQuotesDto {
  @IsEnum(QuoteStatus)
  @IsOptional()
  status?: QuoteStatus;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  @IsIn(['quoteNumber', 'totalAmount', 'createdAt'])
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
