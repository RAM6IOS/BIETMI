import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PartnersModule } from './partners/partners.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { QuotesModule } from './quotes/quotes.module';
import { CompanyModule } from './company/company.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AuthModule,
    PartnersModule,
    InvoicesModule,
    PurchaseOrdersModule,
    QuotesModule,
    CompanyModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
