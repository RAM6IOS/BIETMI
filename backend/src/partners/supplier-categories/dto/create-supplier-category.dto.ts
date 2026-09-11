import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSupplierCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
