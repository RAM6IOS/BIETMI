# Task List — Quotes (Devis) module

## Phase 0: DB
- [x] 0.1 Schema: `QuoteStatus`, `Quote`, `QuoteLine`, `QuoteCounter`, `Invoice.quoteId`, remove `devis` from `InvoiceStatus`, User/Partner relations
- [x] 0.2 Write migration `20260906XXXXXX_add_quotes` + apply `prisma migrate deploy` + `prisma generate`

### Checkpoint 0
- [x] `prisma migrate status` clean; DB has quotes tables; invoices.type/devise state verified

## Phase 1: Backend core
- [x] 1.1 Extract `backend/src/common/money.ts` (round2/computeTotals/TVA_RATE); refactor invoices.service to use it; remove `quote()` + devis guards; update invoices.service.spec
- [x] 1.2 Update invoices.controller (drop `/quote`), invoices.controller.spec, invoices.e2e-spec
- [x] 1.3 `quotes.service.ts` — create + numbering + validatePartner(customer) [RED spec first]
- [x] 1.4 `quotes.service.ts` — send + updateStatus (state machine) [RED spec first]
- [x] 1.5 `quotes.service.ts` — update (draft|revision_requested) + remove (draft) [RED spec first]
- [x] 1.6 `quotes.service.ts` — convertToInvoice (accepted, idempotent) + findOne/findAll [RED spec first]
- [x] 1.7 DTOs: create-quote, update-quote, list-quotes, update-quote-status
- [x] 1.8 `quotes.controller.ts` + `quotes.module.ts` + register in app.module; currency interceptor reuse
- [x] 1.9 `quotes.controller.spec.ts`

### Checkpoint 1
- [x] `npm test` green (old + new units); `npm run build` passes

## Phase 2: e2e
- [x] 2.1 `test/quotes.e2e-spec.ts`: create(supplier→400), numbering, send, status machine, edit/delete guards, convert (amounts+idempotent+409), permissions 403, list filters
- [x] 2.2 `npm run test:e2e` green (jest e2e set to `maxWorkers:1` — suites share the dev DB)

## Phase 3: Frontend
- [x] 3.1 `api/quotes.ts`; clean `api/invoices.ts` + `invoice-labels.ts` (devis)
- [x] 3.2 `PrintableDocument` refactor + `InvoiceDocument`/`QuoteDocument`; update invoice pages/detail (remove quote button + filter)
- [x] 3.3 `QuotesPage.tsx` (list + filters + actions) + `quote-labels.ts` + `QuoteStatusBadge`
- [x] 3.4 `QuoteFormPage.tsx` (/new + /:id/edit)
- [x] 3.5 `QuoteDetailPage.tsx` (status actions + convert→navigate + PDF print)
- [x] 3.6 Routes `App.tsx` + `Sidebar.tsx` (canQuotes)

### Checkpoint 3
- [x] frontend build, lint, check:design green; no `devis`/quote leftovers on invoice code

## Phase 4: Final
- [x] Full verification block: backend unit+e2e+build; frontend build+lint+design
- [ ] Manual browser check of devis flow (chrome-devtools MCP not available in this session)