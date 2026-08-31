# Implementation Plan: Contracts (العقود) — REQ-401→403 (Sprint 3)

## Overview

First-class `Contract` entity for sale contracts (with customers) and purchase
contracts (with suppliers). Status `active`/`expired` is **computed** from
`endDate` vs today (REQ-403) — never stored. Three future reference fields
(`projectId`, `contractTypeDetail`, `renewalAlertDate`) exist in the DB only
(REQ-402, per TDD §5.4) and are excluded from DTOs/API/UI. RBAC is split by
contract type: sale → admin+commercial, purchase → admin+purchasing (same
philosophy as invoices, but type-scoped).

## Authoritative Sources

- `docs/TDD_v1.md` §5.4 (Contract model) + §5.6 (relations) — reference only
- SRS REQ-401/402/403 (requirements)

## Point-by-Point Requirement Mapping

- **REQ-401** — fields: `contractNumber(unique)`, `type(sale/purchase)`,
  `partnerId(FK)`, `createdByUserId(FK User)`, `startDate`, `endDate(nullable)`,
  `totalValue Decimal(12,2)`, `description(nullable)`. Replaces the Sprint-1
  stub table (`number`/`title`/stored `status`).
- **REQ-402** — `projectId`, `contractTypeDetail`, `renewalAlertDate` in Prisma
  + migration only; NOT in DTOs/API/UI. Service uses explicit
  `select`/`omit` so they can never leak into responses; `PARTNER_INCLUDE`
  narrowed to visible fields too.
- **REQ-403** — derived `status`:
  - `active` ⟺ `endDate IS NULL OR endDate >= today00:00Z`
  - `expired` ⟺ `endDate < today00:00Z`
  - computed in service; `?status=` filter applied as WHERE in query.

## Architecture Decisions

1. Drop + recreate the empty `contracts` table (drop SVN-1 stub, create per
   TDD §5.4). Migration `20260907000000_contracts`.
2. Contract number = user free text, `@unique` → 409 on duplicate. No auto
   numbering (contract is not a sequential financial document).
3. RBAC type-scoped:
   - Controller: `@Roles(admin, commercial, purchasing)` coarse gate.
   - Service fine-grain: `sale` → {admin, commercial}; `purchase` →
     {admin, purchasing}. Accountant excluded entirely.
   - `findAll`: admin sees both; commercial sale only; purchasing purchase only.
   - `create`: authorize by DTO type + partner.type must match (sale→customer,
     purchase→supplier) else 400.
   - `findOne/update/remove`: load contract, assert access to its type (403).
   - `update` changing `type` re-validates the partner.
4. Validation: `startDate` required, `endDate` optional and `>= startDate`,
   `totalValue > 0` required, `description` optional, `contractNumber` trimmed
   and required. Delete unrestricted.
5. Calendar / timezone: status boundary compared at `00:00:00Z` of today.
6. Response: contract + `partner{id,name,type}` +`createdBy{id,username,fullName}`
   + derived `status`; `totalValue` serialized 2dp. Add `totalValue` to
   `CurrencyInterceptor.MONEY_FIELDS` (additive).

## Endpoints (contract-first)

```
POST   /api/v1/contracts          → 201 create
GET    /api/v1/contracts          → list (status|type|search|sortBy|sortOrder|page|limit)
GET    /api/v1/contracts/:id      → get
PATCH  /api/v1/contracts/:id      → update (partial)
DELETE /api/v1/contracts/:id      → 204 delete
```

## Task List

See `tasks/todo.md` (Phase 0..12, TDD). Build order: P0 DB → P1-P5 backend
service/controller (unit specs first) → P6 e2e → P7-P11 frontend
(api/labels/list/form/detail/routes/tabs) → P12 final verification.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `CurrencyInterceptor` change affects invoices/quotes | Med | Additive `MONEY_FIELDS` entry only; existing invoice/quote e2e guard it |
| Type-scoped RBAC misconfig | High | Unit + e2e cross-type 403 tests (commercial→purchase, purchasing→sale) |
| Status timezone boundary drift | Low | Compare at `00:00:00Z`; e2e uses explicit past/future dates |
| Stub-table drop surprises | Low | Verified 0 rows, no FK references it |

## Open Questions

- None (all resolved). Customer/supplier «العقود» tabs wired now (user choice).