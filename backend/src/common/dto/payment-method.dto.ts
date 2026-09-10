import { Type } from 'class-transformer';
import { IsNumber, IsString, IsNotEmpty, Max, MaxLength, Min } from 'class-validator';

export class PaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  label: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}