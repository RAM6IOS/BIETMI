import { Module } from '@nestjs/common';
import { SupplierCategoriesController } from './supplier-categories.controller';
import { SupplierCategoriesService } from './supplier-categories.service';

@Module({
  controllers: [SupplierCategoriesController],
  providers: [SupplierCategoriesService],
  exports: [SupplierCategoriesService],
})
export class SupplierCategoriesModule {}
