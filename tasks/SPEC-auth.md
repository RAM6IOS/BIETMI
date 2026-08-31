# Capability Map: Authentication System

| Module id | Responsibility | Depends on |
|---|---|---|
| auth-backend | NestJS auth module, JWT, bcrypt, rate limiting | database |
| auth-frontend | React login screen, JWT context | auth-backend |
| auth-seed | Prisma seed script for test users | database |

Build order: auth-backend → auth-frontend, auth-seed (parallel)

---

# Spec: Authentication System (REQ-501, REQ-502)

## Objective
Implement a secure login system for BIETMI ERP with JWT authentication, bcrypt password hashing, rate limiting, and role-based access control. The system supports four roles: admin, commercial, purchasing, accountant.

## Tech Stack
- **Backend:** NestJS 11, TypeScript, Prisma 6, PostgreSQL 16
- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS v4
- **Auth:** JWT (HS256, 8h expiry), bcrypt (12 salt rounds)
- **Testing:** Jest (backend), Vitest or React Testing Library (frontend)

## Commands

### Backend
```bash
npm run start:dev        # dev server
npm run build            # production build
npm run lint             # eslint --fix
npm test                 # unit tests
npm run test:e2e         # e2e tests
```

### Frontend
```bash
npm run dev              # vite dev server
npm run build            # tsc -b && vite build
npm run lint             # oxlint
```

## Project Structure

### Backend (new files)
```
backend/src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.guard.ts
│   ├── auth.controller.spec.ts
│   ├── auth.service.spec.ts
│   └── dto/
│       └── login.dto.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── common/
    └── guards/
        └── jwt-auth.guard.ts

backend/prisma/
├── schema.prisma (updated with User model)
└── seed.ts
```

### Frontend (new files)
```
frontend/src/
├── contexts/
│   └── AuthContext.tsx
├── components/
│   └── LoginForm.tsx
└── App.tsx (updated)
```

## Code Style

### Backend
```typescript
// Controller pattern
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}

// Service pattern
@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async login(dto: LoginDto): Promise<{ access_token: string }> {
    // Implementation
  }
}
```

### Frontend
```tsx
// Component pattern
export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## Testing Strategy

### Backend
- **Unit tests:** Jest (existing config)
  - `auth.service.spec.ts`: Test password verification, JWT generation
  - `auth.controller.spec.ts`: Test endpoint responses
- **Integration tests:** Jest with supertest
  - `auth.e2e-spec.ts`: Test POST /auth/login success/failure

### Frontend
- **Component tests:** React Testing Library
  - `LoginForm.test.tsx`: Test form submission, error display

### Test Coverage Target
- Backend auth module: 90%+
- Frontend auth components: 80%+

## Boundaries

### Always
- Run tests before commits
- Follow naming conventions
- Validate all inputs
- Use bcrypt for password hashing (never plain text)
- Store JWT in memory only (no localStorage/sessionStorage)

### Ask First
- Database schema changes (User model)
- Adding new dependencies
- Changing rate limiting configuration

### Never
- Commit secrets (JWT_SECRET, DATABASE_URL)
- Store passwords in plain text
- Return password hash in API responses
- Use localStorage/sessionStorage for JWT

## Success Criteria

### REQ-501 (Login with username/password)
- [ ] POST /api/v1/auth/login accepts {username, password}
- [ ] Password verified via bcrypt (12 salt rounds)
- [ ] Success returns JWT with {userId, role} payload
- [ ] Failure returns 401 with generic error message
- [ ] Rate limiting: 5 attempts per 15 minutes per IP

### REQ-502 (Four roles)
- [ ] User model has role enum: admin, commercial, purchasing, accountant
- [ ] JWT payload contains role field
- [ ] AuthGuard can verify JWT and extract role

### Technical Requirements
- [ ] Prisma User model with all required fields
- [ ] Seed script creates two admin users
- [ ] JWT uses HS256 algorithm
- [ ] JWT expiry: 8 hours
- [ ] No sensitive data in JWT payload
- [ ] No password in any API response
- [ ] Frontend stores JWT in React state/context only
- [ ] Frontend displays unified error message on failure

## Open Questions

1. **Rate limiting implementation:** Should we use `@nestjs/throttler` package or custom implementation?
   → Recommendation: Use `@nestjs/throttler` (NestJS standard)

2. **CORS configuration:** Should we configure CORS for development?
   → Recommendation: Yes, allow localhost:5173 for frontend dev

3. **JWT_SECRET:** Where should we store the secret?
   → Recommendation: Environment variable in .env file

## Assumptions

1. PostgreSQL is running locally on port 5432 (verified)
2. Database name is `bietmi` (created)
3. No existing authentication code (clean start)
4. Frontend and backend run on separate ports (5173, 3000)
5. Development environment only (no production config needed yet)
