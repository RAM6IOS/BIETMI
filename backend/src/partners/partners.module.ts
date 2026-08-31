import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { SuppliersController } from './suppliers.controller';
import { PartnersService } from './partners.service';

@Module({
  controllers: [CustomersController, SuppliersController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
