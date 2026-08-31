import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { CurrencyInterceptor } from './currency.interceptor';

@Module({
  controllers: [InvoicesController],
  providers: [InvoicesService, CurrencyInterceptor],
})
export class InvoicesModule {}
