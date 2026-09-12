import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { QuotesService } from './quotes.service';
import { CurrencyInterceptor } from '../invoices/currency.interceptor';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { ListQuotesDto } from './dto/list-quotes.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';

const QUOTE_ROLES = [Role.admin, Role.commercial];

@Controller('quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(CurrencyInterceptor)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @Roles(...QUOTE_ROLES)
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateQuoteDto) {
    return this.quotesService.create(user, dto);
  }

  @Get()
  @Roles(...QUOTE_ROLES)
  findAll(@CurrentUser() user: AuthUser, @Query() query: ListQuotesDto) {
    return this.quotesService.findAll(user, query);
  }

  @Get(':id')
  @Roles(...QUOTE_ROLES)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.findOne(user, id);
  }

  @Patch(':id')
  @Roles(...QUOTE_ROLES)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.quotesService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(...QUOTE_ROLES)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.remove(user, id);
  }

  @Post(':id/send')
  @Roles(...QUOTE_ROLES)
  @HttpCode(HttpStatus.OK)
  send(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.send(user, id);
  }

  @Patch(':id/status')
  @Roles(...QUOTE_ROLES)
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
  ) {
    return this.quotesService.updateStatus(user, id, dto);
  }

  @Post(':id/create-revision')
  @Roles(...QUOTE_ROLES)
  @HttpCode(HttpStatus.CREATED)
  createRevision(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.createRevision(user, id);
  }

  @Post(':id/convert-to-invoice')
  @Roles(...QUOTE_ROLES)
  @HttpCode(HttpStatus.OK)
  convertToInvoice(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.quotesService.convertToInvoice(user, id);
  }
}
