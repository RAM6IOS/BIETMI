# Implementation Plan: Customers List & Detail UI (REQ-103 + REQ-104)

## Overview
Implement the customer list screen (REQ-104) and customer detail screen (REQ-103) to match the
provided design HTML (`bietmi_customers_list_with_sort.html`, `bietmi_customer_detail_screen.html`).

## User Decisions
1. Use **React Router** (`react-router-dom`) — detail at `/customers/:id`.
2. Extend backend search to cover **name + commercialRegister + NIF** together.
3. Green success toast appears **at top of the list card**, auto-hides after ~3s.

## Architecture Decisions
- List page (`/`) and detail page (`/customers/:id`) as separate routed views.
- Success toast via small client-side state in `CustomersPage`; auto-dismiss with `setTimeout`.
- Sort: both a dropdown (الأحدث / الاسم أ-ي / الاسم ي-أ) and clickable table headers (↕) using
  the same `sortBy`/`sortOrder` query params already supported by the backend.
- Detail screen fetches customer via `GET /customers/:id` (already returns invoices/contracts arrays).
- Match design tokens (surface, accent, success green, danger) using Tailwind utilities in the
  existing style (RTL layout).

## Task List

### Phase 1: Backend
- [ ] Task 1: Extend `findAll` search to include `commercialRegister`; add tests.

### Phase 2: Frontend foundation
- [ ] Task 2: Install `react-router-dom`; add routes + navigate structure in `App.tsx`.
- [ ] Task 3: Extend `api/customers.ts` (list params sort/search mapping, `getCustomer`).

### Phase 3: UI
- [ ] Task 4: Customer detail page (`CustomerDetailPage`) with tabs + counters + Edit/Delete.
- [ ] Task 5: Enhance list page — success toast, sort dropdown, sortable headers, 3-field search.

### Checkpoint
- [ ] Backend `npm test` passes, `npm run lint` clean
- [ ] Frontend `npm run build` + `npm run lint` clean
- [ ] Manual E2E: create → green toast + list refresh; open detail → tabs show counts; edit/delete work

## Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| React Router version / TS types | Med | Use stable v6/react-router-dom latest; `npm run build` verify |
| Design tokens differ from current Tailwind-only setup | Med | Map tokens to equivalent Tailwind utilities per component |
