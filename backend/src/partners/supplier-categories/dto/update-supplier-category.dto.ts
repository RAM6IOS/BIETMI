import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateSupplierCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
