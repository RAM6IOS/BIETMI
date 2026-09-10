# PDF/Print Template Specification

Reference for the printable document templates (Devis / Facture / Bon de
Commande). Source of truth for layout and money math; drifts from backend
`common/computeTotals` must be fixed in the same change.

## Calculation chain (must match backend)

All money values are strings serialized to 2 decimal places.

1. `subtotal` = Σ line totals
2. `discountAmount` = `round2(subtotal × discountPercent / 100)`
3. `amountAfterDiscount` = `subtotal − discountAmount` (derived in view only)
4. `tvaAmount` = `round2(amountAfterDiscount × 0.19)` — TVA applies **after**
   the discount
5. `totalAmount` = `amountAfterDiscount + tvaAmount`

Worked examples (approved):

- subtotal `1000`, discount 10% → discount `100.00`, after `900`, TVA `171.00`,
  TTC `1071.00`
- subtotal `35.61`, discount 5% → discount `1.78`, after `33.83`, TVA `6.43`,
  TTC `40.26`

## Documents and components

| Document | Component | Notes |
|---|---|---|
| Facture | `frontend/src/components/Invoices/InvoiceDocument.tsx` | wraps `PrintableDocument` |
| Devis | `frontend/src/components/documents/QuoteDocument.tsx` | wraps `PrintableDocument` |
| Devis/Facture shared | `frontend/src/components/documents/PrintableDocument.tsx` | |
| Bon de Commande | `frontend/src/components/PurchaseOrders/PurchaseOrderDocument.tsx` | own template |
| Company block | `frontend/src/components/PurchaseOrders/CompanyHeader.tsx` | shared by all three |

## Layout rules

1. **Header** — all three documents render the company block via
   `CompanyHeader` (logo + name + Siège social + Mobile/Tel/Fax + RC/NIF/AIN +
   Banque). On Facture/Devis a green stripe (`bg-success-600`, `h-2`) follows.
2. **"Etabli par"** — positioned **below the customer (CLIENT) box**, on the
   same row as the date (`` `${ville} le ${date}` ``), in `PrintableDocument`.
3. **Totals box** — rows in order: `MONTANT TOTAL` (subtotal) · `REMISE (x%)`
   → `amount` (shown positive, no minus sign) · `MONTANT APRÈS REMISE` · `TVA 19%`
   · `MONTANT EN TTC`. The two discount rows render only when
   `discountAmount > 0`.
4. **Modalités de paiement** — printed **below the totals box**, right-aligned,
   shown only when the list is non-empty. Each line renders as
   `` `{percentage}% — {label}` ``. Stored as JSON array of `{ label, percentage }`
   (`paymentMethods`); legacy free-text `paymentModalities` was migrated to a
   single line at 100% during the `20260913000000_add_payment_methods` migration.
   Percentage is formatted with `formatNumberFR`.
5. **Unit column** — cell values come from the line `unit`; free entry backed by
   a `Combobox` on the forms (`U, KG, M, M², L` suggestions, not locked).

## Money formatting

`formatAmountFR` (IBM-style French decimals) via
`frontend/src/utils/numberFormat.ts`; table totals use `tabular-nums`.

## Where discount/payment data comes from

- API entities expose `discountPercent`, `discountAmount` (strings) and
  `paymentMethods` (`{ label, percentage }[]` / `null`).
- `InvoiceDocument`, `QuoteDocument`, `PurchaseOrderDocument` read them off the
  entity and forward to the template.