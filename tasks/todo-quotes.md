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
- [x] 1.5 `quotes.service.ts` — update (draft, 409 otherwise) + remove (draft) [RED spec first]
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

## Phase 5: Revision-by-create (Default-on-Revision) — revokes old PATCH/re-send in revision_requested
- [x] 5.1 Schema+migration `20260915000000_add_quote_revision_and_year`: `Quote.supersedesQuoteId`
      (self FK, nullable, NOT unique, ON DELETE SET NULL) + `Quote.revisions` back-relation;
      `QuoteCounter.year` + unique(year); backfill existing numbers to `QT-YYYY-XXXXX`;
      apply via `migrate deploy` + `generate` (migrate dev is non-interactive here)
- [x] 5.2 RED: quotes.service.spec — new-number expectations (`QT-2026-00001`…), `send`/`update`
      revoked from revision_requested (Conflict), `createRevision` describe (copy, DbNull, it.each 409, 404, 403)
- [x] 5.3 GREEN: `createRevision` in quotes.service (year-based counter like invoices, clone
      partner/objet/discount/payment methods/lines via computeTotals, `supersedesQuoteId`, no write on original);
      `send`/`update` restricted to draft; QUOTE_INCLUDE + supersedesQuote + revisions
- [x] 5.4 Controller `POST :id/create-revision` (CREATED) + controller.spec
- [x] 5.5 e2e: `QT-2026-\d{5}` regex, re-send/PATCH-revision → 409, create-revision integration
      (new draft + number, original frozen incl. updatedAt, 409 non-revision, 404, 403)
- [x] 5.6 Backend checkpoint: unit (215), build, e2e (93), quotes lint clean
- [x] 5.7 Frontend: api/quotes (supersedes/revisions/createQuoteRevision), DetailPage (create-revision
      button + revision links, isEditable=draft), QuotesPage (draft actions; revision action), FormPage
      (draft-only guard), i18n ar/fr
- [x] 5.8 Frontend checkpoint: build, lint, check:design
- [x] 5.9 Docs: TDD_v1.md §5.8 (Quote data model + frozen state machine) + decision log #12/#13
      (revokes old PATCH-in-revision_requested per BIETMI feedback); plan.md + todo-quotes updated