# Implementation Plan: Quotes (Devis) module + Invoice quoteId

## Overview

Devis is the mandatory entry point for creating sale invoices in BIETMI. This
plan replaces the legacy "devis-as-invoice-status" shortcut with a first-class
`Quote` entity (statuses draft/sent/accepted/rejected/revision_requested) that
converts — only when accepted — into a draft Invoice. Also removes the legacy
`InvoiceStatus.devis` flow entirely.

## Approved Decisions

1. Remove `InvoiceStatus.devis` + `POST /invoices/:id/quote` + the invoice→devis
   UI. Migration flips any existing `devis` invoice rows to `draft`.
2. Quote numbering: per-year `QuoteCounter` (like Invoices) — one counter row
   per `year`, `quoteNumber` = `QT-YYYY-XXXXX` (year + 5-digit padded).
3. Permissions: write AND read = `admin` + `commercial` only.
4. Endpoints:
   - `POST   /quotes`                      → create draft
   - `GET    /quotes`                      → list (status/search/sort/pagination)
   - `GET    /quotes/:id`                  → detail
   - `PATCH  /quotes/:id`                  → edit; only status = draft, else 409
   - `DELETE /quotes/:id`                  → delete; only status = draft, else 409
   - `POST   /quotes/:id/send`             → draft → sent, else 409
   - `PATCH  /quotes/:id/status`           → sent → accepted|rejected|revision_requested (strict machine)
   - `POST   /quotes/:id/create-revision`  → revision_requested only, else 409; clones into a
     new draft quote (partner+objet+discount+payment methods+lines), new sequential number,
     sets `supersedesQuoteId` = original; original is NEVER written (fully frozen)
   - `POST   /quotes/:id/convert-to-invoice` → accepted only; creates draft Invoice,
     copies partner+lines+objet, sets Invoice.quoteId + Quote.convertedToInvoiceId;
     idempotent (returns existing invoice if already converted)
5. State machine: draft → sent ; sent → accepted|rejected|revision_requested ;
   revision_requested is FINAL/frozen for the original (no PATCH, no re-send — 409);
   a revised quote is created ONLY via `create-revision`.
6. Same rounding logic as invoices (subtotal 2dp, TVA 19%, total 2dp).
7. PDF: unified printable document template with `mode: 'facture' | 'devis'`;
   Devis shows Délais de réalisation / Validité de l'offre, Facture does not.
8. UI: quote detail/list expose revision links (supersedesQuote → «نسخة معدَّلة من…», revisions → «استُبدِل بـ…») and a «إنشاء نسخة معدَّلة» action for revision_requested quotes.

## Schema / Migration

Migration `20260906XXXXXX_add_quotes`:
- New types: `QuoteStatus` enum.
- New tables: `quote_counters` (single row), `quotes`, `quote_lines`.
- `invoices.quote_id UUID` (nullable, unique) FK → quotes ON DELETE SET NULL.
- `Quote.convertedToInvoiceId` (unique) FK → invoices ON DELETE SET NULL.
- Remove `devis` from `InvoiceStatus` (UPDATE devis→draft, then
  rename→rebuild→recast→drop Postgres pattern).

## Backend

- Extract `round2/computeTotals/TVA_RATE` to `backend/src/common/money.ts`,
  reused by invoices + quotes (behavior pinned by existing tests).
- `InvoicesService`: remove `quote()`, remove devis from issue/update/remove
  guards (draft only). Update unit/controller/e2e specs.
- New `QuotesModule` (`quotes.module/controller/service`, DTOs
  `create-quote`, `update-quote`, `list-quotes`, `update-quote-status`).
- Controller uses `CurrencyInterceptor` (money fields share invoice names).
- Tests: `quotes.service.spec.ts` + `quotes.controller.spec.ts` (TDD, RED
  first) and `test/quotes.e2e-spec.ts`.

## Frontend

- `api/quotes.ts`: listQuotes/getQuote/createQuote/updateQuote/deleteQuote/
  sendQuote/updateQuoteStatus/convertQuoteToInvoice; types `QuoteStatusValue`,
  `Quote`, `QuoteInput`, `QuoteUpdateInput`.
- Clean `api/invoices.ts` + `invoice-labels.ts` of `devis`.
- Refactor `InvoiceDocument.tsx` → `components/documents/PrintableDocument.tsx`
  (`mode`) + thin `InvoiceDocument` / `QuoteDocument` wrappers.
- New screens under `components/Quotes/`: `QuotesPage` (list+status filter,
  edit/delete/send actions), `QuoteFormPage` (/new + /:id/edit), `QuoteDetailPage`
  (status actions + convert button only when accepted → navigate to invoice).
- `App.tsx` routes + `Sidebar.tsx` link gated by `canQuotes` (admin.
  commercial). Semantic design tokens only.

## Verification

1. `npm test` (backend), `npm run build` (backend), `prisma migrate deploy`,
   `npm run test:e2e` (backend).
2. Frontend: `npm run build`, `npm run lint`, `npm run check:design`.
3. Manual/browser: create quote → send → accept → convert → navigate to invoice.

## Risks

| Risk | Mitigation |
|---|---|
| Migration touches enum in place | Standard renamed-type recipe; data flip devis→draft first |
| `CurrencyInterceptor` generic detection on quotes | Field names identical; verified in e2e |
| e2e mutates shared dev DB | Existing suite already cleans up; quotes spec follows same pattern |

## Open Questions

(none — all resolved by user)