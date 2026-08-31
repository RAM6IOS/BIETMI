# User Management — REQ-503 / REQ-504 (Users module)

## Phase 1: DB + Service
- [x] T1 Schema: `User.mustChangePassword Boolean @default(true)`
- [x] T1 Migration `20260831000000_user_must_change_password`
- [x] T2/T3 `users.service.spec.ts` (16 tests) + `users.service.ts`:
  - [x] `create` (admin-only, username 409, gen/hash temp password bcrypt-12, returns `tempPassword`, strips `passwordHash`, `mustChangePassword:true`)
  - [x] `findAll` (admin-only, search/sort/pagination)
  - [x] `update` (admin-only, NotFound invalid UUID, partial fullName/role/isActive)
  - [x] `changeOwnPassword` (bad current 400, reuse 400, sets `mustChangePassword:false`)

## Phase 2: HTTP layer + Auth
- [x] T4 DTOs: `create-user`, `update-user`, `list-users`, `change-password`
- [x] T5 `users.controller.spec.ts` (5 tests) + `users.controller.ts` (`PATCH me/password` before `PATCH :id`)
- [x] T6 `users.module.ts` + register in `app.module.ts`
- [x] T7 `auth.service.ts` login returns `{ access_token, requiresPasswordChange }`; JWT stays `{ userId, role }`

### Checkpoint
- [x] `npm test` 157 pass; `npm run test:e2e` 68 pass; `npm run build` ok; lint 0 errors
- [x] Live API verification: login flag, RBAC 403, create→tempPassword, changeOwnPassword, flag clears

## Phase 3: Frontend
- [x] T8 i18n: `users` namespace + `layout:users`/`layout:changePassword` + auth change-password keys (fr/ar) + `CONFLICT_USERNAME_EXISTS` error
- [x] T9 `api/users.ts` + `auth-context` `requiresPasswordChange` persistence + `LoginForm` passes flag
- [x] T10 `UsersPage.tsx` + `UserFormModal.tsx` (create shows temp password + copy button)
- [x] T11 `ChangePasswordPage.tsx`
- [x] T12 `App.tsx` forced change-password guard + `/users`,`/change-password` routes + `Sidebar.tsx` admin Users link + Change password link

### Frontend Verification
- [x] `npm run build` ok
- [x] `npm run lint` (only pre-existing repo-wide warnings)
- [x] `npm run check:design` passed
- [ ] Browser visual verification of Users page + forced password-change flow

## Post-review: 500 fix + behavior change (Decisions by user)
- [x] **500 on GET /users fixed**: root cause = `limit`/`page` arrived as strings (no global `transform:true` ValidationPipe), so `@Type(()=>Number)` DTO never converted them → Prisma `take:"20"` (String) rejected. Fixed `ListUsersDto` to keep `page`/`limit` as `string = '1'/'20'` and `findAll` uses `parseInt(...)` — matching existing partners/invoices convention.
- [x] **Stale backend process** (started before rebuild) replaced: stopped old nest process, restarted `npm run start:dev`.
- [x] **admin_bietmi password reset** to `admin123` via `npm run prisma:seed`.
- [x] **Password change now OPTIONAL (Decision A, fully optional)**:
  - Backend: removed `requiresPasswordChange` from `auth.service.login` response + updated spec (7 auth tests).
  - Frontend: removed `requiresPasswordChange`/`clearRequiresPasswordChange` from AuthContext + type; removed forced routing in `App.tsx`; `LoginForm` returns to `login(token)`; `ChangePasswordPage` is now an optional self-service page (accessible via sidebar "Change password" link, username+password editable).
  - Sidebar keeps "Change password" link for all users; admin-only "Users" link retained.
- [x] All verified: backend 156 unit + 68 e2e, build, lint 0 errors; frontend build/lint/design pass; live API: login returns only access_token, users list 200, search, create→tempPassword, deactivate.

## Notes
- Temp password format: `crypto.randomBytes(9).toString('base64url').slice(0,12)` → readable/speakable (a-z,A-Z,0-9,-,_), length 12.
- Seed users (`admin_bietmi`, `dev_test`) have `mustChangePassword=true` → first login forces change (intended).
- ~~No `DELETE /users` endpoint by design; deactivation via `PATCH {isActive:false}`.~~

## Post-build: Hard-delete users (Decision by user)
- [x] **Hard delete when possible**: added `DELETE /users/:id` (admin-only) + `usersService.remove()`.
  - Guards (order): not-found/invalid-UUID → **self-delete blocked** (`BadRequestException` code `SELF_DELETE_FORBIDDEN`) → **last active admin blocked** (`ConflictException` code `CONFLICT_LAST_ADMIN`) → **has-linked-records blocked** (`ConflictException` code `CONFLICT_USER_HAS_RECORDS`, advises deactivation). Otherwise physical `prisma.user.delete`.
  - Rationale: `Invoice`/`Quote`/`PurchaseOrder` reference `createdByUserId` with `onDelete: Restrict`, so users with document history can't be hard-deleted; deactivation (`isActive:false`, existing toggle) remains the path for those.
- [x] Tests: `users.service.spec.ts` +6 `remove` tests (403/404/self/last-admin/success-admin/success-with-records/success-no-records) → 26 service tests; `users.controller.spec.ts` +1 (7 total).
- [x] Frontend: `deleteUser()` in `api/users.ts`; row action "Delete" (danger) in `UsersPage.tsx`; new `ConfirmDeleteDialog.tsx`; success toast `users:deletedSuccess`; error codes localized (ar/fr): `SELF_DELETE_FORBIDDEN`, `CONFLICT_USER_HAS_RECORDS`, `CONFLICT_LAST_ADMIN`.
- [x] Verified: backend 168 unit + 68 e2e; build ok; lint 0 errors; frontend build/lint/`check:design` pass.
