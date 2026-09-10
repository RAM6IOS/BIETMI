# BIETMI Design System

> This document describes exactly what is implemented in the codebase today.
> Keep it in sync whenever design tokens, UI Kit components, or their
> responsive rules change. It must never drift from the actual implementation.

## Design Tokens

Defined in `frontend/src/index.css` (Tailwind v4 `@theme`). All semantic
alias utilities (`bg-primary-600`, `text-success-700`, `border-danger-100`,
etc.) are generated from these tokens.

### Primary (brand — based on the existing indigo palette)

| Token             | Value   |
|-------------------|---------|
| `--color-primary-50`  | `#eef2ff` |
| `--color-primary-100` | `#e0e7ff` |
| `--color-primary-200` | `#c7d2fe` |
| `--color-primary-500` | `#6366f1` |
| `--color-primary-600` | `#4f46e5` |
| `--color-primary-700` | `#4338ca` |
| `--color-primary-800` | `#3730a3` |

### Success

| Token             | Value   |
|-------------------|---------|
| `--color-success-50`  | `#f0fdf4` |
| `--color-success-100` | `#dcfce7` |
| `--color-success-600` | `#16a34a` |
| `--color-success-700` | `#15803d` |

### Warning

| Token             | Value   |
|-------------------|---------|
| `--color-warning-50`  | `#fffbeb` |
| `--color-warning-100` | `#fef3c7` |
| `--color-warning-700` | `#b45309` |

### Danger

| Token             | Value   |
|-------------------|---------|
| `--color-danger-50`  | `#fef2f2` |
| `--color-danger-100` | `#fee2e2` |
| `--color-danger-600` | `#dc2626` |
| `--color-danger-700` | `#b91c1c` |

### Surfaces

| Token             | Value   |
|-------------------|---------|
| `--color-surface-1`  | `#ffffff` |
| `--color-surface-2`  | `#f9fafb` |
| `--color-on-accent`  | `#ffffff` |

### Borders & text

| Token                     | Value   |
|---------------------------|---------|
| `--color-border`          | `#e5e7eb` |
| `--color-border-strong`   | `#d1d5db` |
| `--color-text-secondary`  | `#6b7280` |

### Radii

| Token        | Value  |
|--------------|--------|
| `--radius-sm`| `4px`  |
| `--radius-md`| `6px`  |
| `--radius-lg`| `8px`  |
| `--radius-xl`| `12px` |

### Shadows

| Token           | Value |
|-----------------|-------|
| `--shadow-card` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |

## UI Kit Components

Located in `frontend/src/components/ui/`. Every component consumes semantic
tokens only (no raw `indigo-*` / `green-*` / `red-*` classes) unless it is the
token definition itself.

| Component      | File                    | Description |
|----------------|-------------------------|-------------|
| `Button`       | `ui/Button.tsx`         | Variants `primary` \| `secondary` \| `danger` \| `ghost`; sizes `sm` \| `md`; supports `block` (full width) and `ref`. |
| `Card`         | `ui/Card.tsx`           | Rounded surface container (`rounded-xl`, `border border-border`, `shadow-card`). |
| `Input`        | `ui/Input.tsx`          | Text input within a styled label; supports `ref`. |
| `Textarea`     | `ui/Textarea.tsx`       | Multi-line text input styled to match `Input`; slots in the same label pattern. |
| `Combobox`     | `ui/Combobox.tsx`       | Free-text input with suggestions — `<input list>` + `<datalist>` (`options` prop), no selection lock-in; supports `ref`. |
| `Select`       | `ui/Select.tsx`         | Dropdown select styled to match `Input`. |
| `Badge`        | `ui/Badge.tsx`          | Small rounded counter (used on detail tabs). |
| `Toast`        | `ui/Toast.tsx`          | Success status bar (`role="status"`, green). **Final name is `Toast`, not `SuccessBanner`.** |
| `Spinner`      | `ui/Spinner.tsx`        | Loading indicator with `role="status"`. |
| `EmptyState`   | `ui/EmptyState.tsx`     | Centered empty/placeholder state (title + optional description/children). |
| `Modal`        | `ui/Modal.tsx`          | Dialog wrapper: header + close, scrollable body, optional footer; supports `ref` for initial focus. |
| `ConfirmDialog`| `ui/ConfirmDialog.tsx`  | Delete-confirmation wrapper built on `Modal` (size `md`). |
| `Table`        | `ui/Table.tsx`          | Configurable data table (columns + render + sorting + actions). |
| `PageHeader`   | `ui/PageHeader.tsx`     | Page title/subtitle + optional primary action button. |

## Responsive Rules

Explicit behavior for each component across breakpoints:

| Component | `< md` (below 768px) | `md–lg` | `lg` (≥1024px) |
|---|---|---|---|
| `Table` | **Stacked cards** — each row renders as a card (fields above actions). | **Stacked cards** (below md only; table from md up). | Normal table. |
| `PageHeader` | **Vertical** — title on top, full-width action button below. | Vertical. | **Horizontal** — title at the reading start, action at the opposite end (respects current `dir`). |
| `Modal` | **Full-screen** (no rounded corners, fills viewport). | Full-screen. | **Centered fixed-width** card (`max-w-md`/`max-w-2xl`). |
| `Card` | Padding `p-4`/`p-6` via consumer class. | — | — |
| `Input` / `Select` / `Textarea` / `Combobox` | `w-full` by default. | `w-full`; consumer may constrain (`sm:w-52`). | — |
| `Badge` | Fixed small size (no responsive change). | — | — |
| `Toast` | `w-full` within its container. | — | — |

## Touch Targets

- **All actions buttons — everywhere, including table row actions (view/edit/delete):** minimum height **44px** (`min-h-11`) on all breakpoints, to prevent tap errors on small screens. Defined in `Button` (`SIZES`) and enforced on table action buttons via `min-h-11`.

## Direction (RTL/LTR)

The app supports **Arabic (RTL)** and **French (LTR)** with a header/sidebar language
toggle. Direction is applied globally on `<html dir>` by `src/locales/index.ts`
(`applyDirection`), so components must **not** hardcode `dir` or physical sides.

- Use **logical** Tailwind v4 utilities instead of physical ones: `start-*`/`end-*`
  (position), `ms-*`/`me-*` (margin), `ps-*`/`pe-*` (padding), `text-start`/`text-end`
  (alignment), `border-s`/`border-e`.
- **Forbidden:** physical `left-0`/`right-0`, `pl-*`/`pr-*`, `ml-*`/`mr-*`, `border-r`,
  `text-left`/`text-right` in UI components and layout.
- **Exception:** printable French documents (`*Document.tsx`, `CompanyHeader.tsx`)
  are locked to `dir="ltr"` / `lang="fr"` and must not be changed.

## Governance

- **Rule:** always use `src/components/ui/` components and semantic tokens
  (`primary`, `success`, `warning`, `danger`, `surface`, `border`,
  `text-secondary`, `on-accent`).
- **Forbidden outside `src/components/ui/` and `index.css`:** raw color classes
  (`indigo-*`, `green-*`, `red-*`, `blue-*`, …) and arbitrary spacing outliers
  (`px-8`, `py-16`, …).
- **Check:** run `npm run check:design` (from `frontend/`) — scans `src` for
  raw color classes and fails if found (allows `ui/` and `index.css`).
- **Docs:** consult/update this file when building new UI.
