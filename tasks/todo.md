# Task List — Contracts (العقود) module — REQ-401→403 (Sprint 3)

## Phase 0: DB
- [x] 0.1 Schema: `ContractType` enum, `Contract` per TDD §5.4, `User.createdContracts`; PARTNER_INCLUDE narrows to visible fields (P11)
- [x] 0.2 Migration `20260907000000_contracts`: DROP stub `contracts` (empty) + CREATE; `prisma migrate deploy` + `prisma generate`

### Checkpoint 0
- [x] `prisma migrate status` clean; `contracts` table matches TDD §5.4; no FK broken

## Phase 1: Service create [RED spec first]
- [x] 1.1 `contracts.service.spec.ts` (RED): RBAC type 403; partner missing/wrong-type 400; dup contractNumber 409; endDate<startDate 400; create shaped
- [x] 1.2 `contracts.service.ts` create + `assertTypeAccess` + `validatePartner`

## Phase 2: Service read [RED spec first]
- [x] 2.1 `findAll` (derived status filter, type-scoped by role, search/sort/pagination)
- [x] 2.2 `findOne` + derived `status` (past→expired, null→active); silent fields omitted

## Phase 3: Service update/remove [RED spec first]
- [x] 3.1 `update` (type change re-validates partner; partial fields)
- [x] 3.2 `remove`

## Phase 4: HTTP layer
- [x] 4.1 DTOs: `create-contract`, `update-contract`, `list-contracts`
- [x] 4.2 `contracts.controller.ts` (`@Roles` coarse gate) + `CurrencyInterceptor` MONEY_FIELDS += `totalValue`
- [x] 4.3 `contracts.module.ts` + register in `app.module.ts`
- [x] 4.4 `contracts.controller.spec.ts`

### Checkpoint 1
- [x] `npm test` green; `npm run build` passes

## Phase 5: e2e
- [x] 5.1 `test/contracts.e2e-spec.ts`: sale via commercial / purchase via purchasing / admin both; cross-type 403; partner mismatch 400; dup 409; status filter; search/sort/pagination; update/delete
- [x] 5.2 `npm run test:e2e` green (keep `maxWorkers:1`)

## Phase 6: Frontend foundation
- [x] 6.1 `api/contracts.ts` (types + CRUD + list params)
- [x] 6.2 `contract-labels.ts` + status helper `contractStatus(endDate, today)` + `ContractStatusBadge`/type badge
- [x] 6.3 `contract-permissions.ts` (`canContracts`)

## Phase 7: Contracts UI
- [x] 7.1 `ContractsPage.tsx` (list + status/type filter + search + pagination + actions)
- [x] 7.2 `ContractFormPage.tsx` (/new + /:id/edit, simple form)
- [x] 7.3 `ContractDetailPage.tsx`
- [x] 7.4 Routes `App.tsx` + `Sidebar.tsx` (canContracts = admin|commercial|purchasing)

### Checkpoint 3
- [x] frontend build, lint, check:design green

## Phase 8: Tabs + Final
- [x] 8.1 Wire «العقود» tab on CustomerDetailPage + SupplierDetailPage (`unknown[]`→`Contract[]`); Backend: narrow `PARTNER_INCLUDE.contracts` select + update `partners.service.spec.ts` expectations
- [x] 8.2 Full verification: backend unit+e2e+build; frontend build+lint+design