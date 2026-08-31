import { Module } from '@nestjs/common';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { CurrencyInterceptor } from '../invoices/currency.interceptor';

@Module({
  controllers: [QuotesController],
  providers: [QuotesService, CurrencyInterceptor],
})
export class QuotesModule {}
