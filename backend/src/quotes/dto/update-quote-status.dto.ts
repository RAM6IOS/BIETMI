import { IsEnum } from 'class-validator';
import { QuoteStatus } from '@prisma/client';

const SENT_OUTCOMES = [
  QuoteStatus.accepted,
  QuoteStatus.rejected,
  QuoteStatus.revision_requested,
];

export class UpdateQuoteStatusDto {
  @IsEnum(SENT_OUTCOMES)
  status: QuoteStatus;
}
