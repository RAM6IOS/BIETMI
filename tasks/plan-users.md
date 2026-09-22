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

## Post-build: Live-session authorization — role/deactivation apply immediately (REQ-503/504 hardening)
- **Problem:** role and `isActive` were baked into the JWT at login (8h TTL). Changing a role or deactivating a user in the DB had zero effect on already-issued tokens until re-login or token expiry — a deactivated employee kept full access for up to 8 hours.
- **Root cause (two layers):**
  1. `JwtStrategy.validate()` trusted the `role`/`workspace` claims from the token; `RolesGuard`/workspace scoping used those stale claims.
  2. Frontend `useAuthRole()` decoded the role from the stored token (no `/auth/me`, no fresh source).
- **Fix (Option A — read the DB per request):**
  - `JwtStrategy` now loads the user from the DB on every authenticated request using a narrow `select { id, role, workspace, isActive }` (never `passwordHash`); rejects with 401 immediately if the user is missing or `isActive=false`. The token only proves *who* — role/workspace are always live.
  - New `GET /auth/me` (protected, all roles) → service `AuthService.getMe()` rebuilds the response from an allowlist (`ME_SELECT`), so no secret can ever leak even if the select grows.
  - Frontend: `api/me.ts` `fetchMe()`; `AuthContext` gains `currentUser` + `refreshMe()` (401 → auto-logout); `AppContent` refreshes on mount and on window focus; `useAuthRole()` prefers `currentUser.role` over the token claim.
- **Tests (TDD):**
  - Unit `jwt.strategy.spec.ts` (new, 5): live role/workspace beats token claims; unknown user → 401; inactive user → 401; select is exactly `{id,role,workspace,isActive}` with no `passwordHash`; legacy token without workspace resolves it from the DB.
  - Unit `auth.service.spec.ts` (+2) / `auth.controller.spec.ts` (+1): `getMe` returns the live profile without `passwordHash`; missing user → 401.
  - E2E `test/auth-live-session.e2e-spec.ts` (new, 6): **deactivated logged-in user → immediate 401 on next request**; **role change commercial→admin → same token goes 403→200**; deleted user → 401; `/auth/me` requires a token, returns no `passwordHash`, and reflects a role change on the same token.
  - Frontend Vitest (new infra) — `api/me.test.ts`, `AuthContext.test.tsx`, `useAuthRole.test.tsx` (7 tests): bearer fetch, `refreshMe` updates live role, 401 → logout with token cleared, stale token role fallback then live-role override.
- **Notes:**
  - Token TTL stays 8h (decision: after this fix the token duration is no longer the security weak point; role/disable are immediate regardless).
  - Cost: one indexed PK read per authenticated request — accepted for an ERP (no caching added yet, clarity first).
  - Kept `role`/`workspace` claims in the token payload (no login contract break); they are now informational only.
  - Frontend now has test infra: `vitest` + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom`; `npm test` in `frontend/`.
- Verified: backend unit 233 / e2e 136 pass, backend + frontend builds ok, frontend design-token check pass. (Repo-wide backend eslint still reports the pre-existing 31 errors in `auth.service.spec.ts`/`mail.service.ts`/`partners.service.spec.ts` from the uncommitted isolation WIP — the files changed by this work add 0 new errors.)

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

## Post-build: Workspace hardening (REQ-503 + isolation)
- [x] **Workspace of a new user is always the creator admin's workspace** — never taken from the request body.
  - Root cause: `UsersService.create` used `workspace: dto.workspace`, and the UI never sends the field → with no global `ValidationPipe` the column DB-default (`production`) applied, so even a **sandbox** admin (e.g. `dev_test`) created **production** users, breaking isolation.
  - Fixed: `UsersService.create` uses `user.workspace` from the JWT; `CreateUserDto.workspace` and `UpdateUserDto.workspace` are now `workspace?: never` (client cannot influence it). `update` no longer accepts/persists a workspace change.
- [x] Tests: `users.service.spec.ts` +3 (`create` persists caller workspace ignoring body workspace; defaults to caller workspace when body omits it; `update` never changes workspace) → 35 service tests. `workspace-isolation.e2e-spec.ts` +3 (`sandbox admin's user → sandbox` incl. body-leak `workspace:'production'` ignored; `production admin's user → production`; `update` cannot move a user between workspaces) → 23 e2e tests.
- [x] Verified: backend 219 unit pass; `workspace-isolation` e2e 23 pass; `npm run build` ok. (Repo-wide `eslint` still reports 31 pre-existing errors in `auth.service.spec.ts` / `mail.service.ts` / `partners.service.spec.ts` from the earlier uncommitted isolation work — untouched here; `src/users/**` + the isolation e2e are warning-only.)
