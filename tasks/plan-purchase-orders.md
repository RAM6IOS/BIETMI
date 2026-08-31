# Implementation Plan: Bon de Commande (Purchase Orders) — REQ-207

## Overview

New purchase-order module as an extension of the suppliers domain. A
**Bon de Commande** is the purchase request BIETMI sends to a supplier before
delivery — distinct from a purchase invoice (received after delivery). Backend
model + API with simple sequential numbering (`"087"`), `draft/sent` status,
`purchasing+admin`-only access, and a frontend list + create form.

## Architecture Decisions

1. **Numbering**: single global sequence (`001`, `087`) — 3-digit minimum, no
   year segment. Assigned immediately at create inside a Prisma `$transaction`
   via a one-row counter upsert (`INSERT ... ON CONFLICT DO UPDATE
   RETURNING`). A `@unique` on `orderNumber` guarantees uniqueness
   structurally. No strict concurrency test (per decision) — normal tests only.
2. **Status**: `draft` automatically on create; `POST /:id/send` transitions
   `draft → sent` (409 if already sent). No invoice-style lifecycle.
3. **Lines**: same computed structure as `InvoiceLine` plus optional `unit
   String?` (unit of measure), per the real document template.
4. **Money**: totals computed server-side only, reusing the invoice rounding
   logic (per-line `round2` → subtotal → TVA 19% → total). A module-local copy
   of the helpers keeps the module self-contained and leaves the locked
   invoices module untouched.
5. **Serialization**: reuse `CurrencyInterceptor` (imported from
   `../invoices/currency.interceptor`) — it already detects `lines`/`status`
   records and formats the same field names (`subtotal`/`tvaAmount`/`totalAmount`
   at 2dp, `quantity`/`unitPrice` at 3dp).
6. **Permissions**: all endpoints `@Roles(admin, purchasing)` — matching the
   purchase-invoice write scope. Accountant and commercial cannot read.
7. **Frontend**: duplicate `request`/`ApiError` pattern (as customers/suppliers
   do); list page + create form modeled on the invoices screen; shared
   `formatAmount`/`formatDate` imported from `invoice-labels`.

## Task List

### Phase 1: Backend
- [x] T1: Prisma schema + migration
  - Acceptance: `PurchaseOrder`, `PurchaseOrderLine`, `PurchaseOrderStatus`
    enum, one-row counter; relations on `Partner` and `User`; migration applied
  - Verify: `npx prisma migrate dev --name add_purchase_orders` + `npx prisma generate`
  - Files: `backend/prisma/schema.prisma`
- [x] T2: DTOs
  - Acceptance: `CreatePurchaseOrderDto`, `ListPurchaseOrdersDto` matching
    invoice DTO conventions
  - Files: `backend/src/purchase-orders/dto/{create,list}-purchase-order.dto.ts`
- [x] T3 (RED): `purchase-orders.service.spec.ts` — orderNumber assignment,
  totals, supplier-type validation, send flow, list/search/sort, 404s
- [x] T4 (GREEN): service + controller + module + `app.module.ts` wiring +
  `purchase-orders.controller.spec.ts`
- [x] Checkpoint 1: `npm test` + `npm run build` (backend green, invoices intact)
- [x] T5: `test/purchase-orders.e2e-spec.ts` with isolated `po_*` users
- [x] Checkpoint 2: all e2e files together + build + lint

### Phase 2: Frontend
- [x] T6: `frontend/src/api/purchaseOrders.ts`
- [x] T7: `PurchaseOrdersPage` (list, search, status filter, sort, pagination, send)
- [x] T8: `PurchaseOrderFormPage` (supplier select, dynamic lines, live totals)
- [x] T9: `App.tsx` routes + role-gated nav link
- [x] Checkpoint 3: build + lint + check:design + live curl proof + cleanup

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration conflicts with existing DB state | High | `prisma migrate dev` requested a destructive reset (repo's 3 migrations were never applied; DB was built via `db push`). Applied the additive PO change with `npx prisma db push` instead — zero data loss, consistent with the repo's actual workflow. |
| Cross-suite e2e user collisions | Med | Isolated `po_*` users (never `test_admin`) |
| Interceptor touches unrelated payloads | Med | Reuse checks `lines`/`status` — PO records match |

## Point-by-Point Prompt Review

1. ✅ Model: id, unique sequential orderNumber ("087"), supplierId FK
   (supplier-only), orderDate, lines (description/unit/quantity/unitPrice/
   lineTotal), subtotal/tvaAmount/totalAmount, draft/sent status,
   createdByUserId
2. ✅ Endpoints: POST /purchase-orders, GET (list, search/sort),
   GET /:id, plus POST /:id/send (per user decision)
3. ✅ Permissions: purchasing + admin only (same scope as purchase invoices)
4. ✅ Frontend: list + create form, dynamic lines, live calc, UI Kit
5. ✅ No PDF (deferred — shared document round later)
6. ✅ TDD with normal tests (no invoice-grade concurrency stress)
7. ✅ Prompt re-reviewed point by point above

---

# Sprint Follow-up: Document Matching & Company Settings (REQ-207-b)

## Overview

User compared the printed **Bon de Commande** against the office's paper
master and reported differences. Vision comparison (reference paper vs
platform screenshot) identified the gaps. The generated document now matches
the office layout; the company header is driven by database settings with an
admin settings screen.

## User Decisions

1. Company info (header) → **database settings**: `Company` model + API +
   admin settings screen. Not a frontend constant.
2. Supplier N.I.F line in the document → **removed**.
3. Scope → apply matching to **both** the detail/print document and the
   live form (they share the same layout).

## Differences Fixed

| Paper (reference) | Platform (before) | After |
|-------------------|-------------------|-------|
| Company letterhead (Siege/Mobile/Tel-Fax/R.C/N.I.F/A.I.N/Banque el baraka) | absent on platform | `CompanyHeader` shared block, values from DB `company` row |
| `Date : 16/08/2026` (dd/mm/yyyy) | unstructured | boxed grid N°/Date(French)/FOURNISSEUR |
| row numbers `01/02/03` | `1/2/3` | `pad2` |
| amounts `19 870,50` (fr-FR, sep milliers, pas « DZD ») | `10.00 دج` | `formatAmountFR` (2dp), `formatNumberFR` (2–3dp) |
| supplier N.I.F absent | `N.I.F :` present | removed |
| «Cachet et signature» free text | boxed signature | plain text |
| footer absent | Arabic footer | removed |

## Task List

### Phase 3: Backend — Company
- [x] T10: `Company` model + `npx prisma db push` (no migrations in this repo)
- [x] T11: `company` module (controller/service/dto/module) wired in `app.module.ts`
- [x] T12: unit tests `company.service.spec.ts` (6) + `company.controller.spec.ts` (3)
- [x] Checkpoint 4: `npm test` (97/97, 11 suites) + build + lint 0 errors

### Phase 4: Frontend — Document Match + Settings
- [x] T13: `src/api/company.ts` + `src/hooks/useCompany.ts`
- [x] T14: `src/utils/numberFormat.ts` (`formatAmountFR`/`formatNumberFR`/`formatDateFR`/`pad2`)
- [x] T15: `CompanyHeader.tsx` shared block; `PurchaseOrderDocument.tsx` +
      `PurchaseOrderDetailPage.tsx` rewritten to paper layout
- [x] T16: `PurchaseOrderFormPage.tsx` matched (same layout)
- [x] T17: `CompanySettingsPage.tsx` + route `/settings/company` +
      admin-only nav link
- [x] Checkpoint 5: build + lint + check:design green

### Wire-proof (live, port 3000 dev server)
- [x] `GET /api/v1/company` → auto-creates fixed seed row
      `00000000-0000-4000-8000-000000000001` (`EURL BIETMI PLUS`, nulls)
- [x] `PATCH` as admin → persists all fields; `GET` returns them
- [x] `PATCH` as commercial → 403; `GET` as commercial → 200
- [x] unauthenticated `PATCH` → 401
- [x] row reset to clean defaults (null legal numbers) after test

## API Contract (Company)

`PATCH /api/v1/company` — `admin` only (RolesGuard via `@Roles(Role.admin)`).
Body: partial `{ name?, logoUrl?, siegeSocial?, mobile?, telFax?, rc?, nif?,
ain?, banqueBaraka? }` (null clears a field). Responds with the updated row.
`GET /api/v1/company` — any authenticated role.

## Risks and Open Questions

| Item | Status |
|------|--------|
| Legal numbers (R.C/N.I.F/A.I.N/Banque) not prefilled | Open — user enters via `/settings/company`; test values cleared, not persisted |
| Signature substyle (dashed box / «BIETMI - المدير العام» footer) | Follow-up per reference paper |
| `logoUrl` exists but no file-upload this pass | Open — wire a URL or defer |
| Invoice docs intentionally untouched | Kept `formatAmount`/`formatDate` (Arabic «دج») in `invoice-labels.ts` |