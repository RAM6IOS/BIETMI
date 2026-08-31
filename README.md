# BIETMI ERP — Monorepo

> **Sprint 0** — هيكل المشروع البرمجي فقط (لا منطق أعمال بعد)

## هيكل المشروع

```
BIETMI/
├── backend/          # NestJS + TypeScript + Prisma
│   ├── src/
│   │   ├── app.module.ts
│   │   ├── app.controller.ts
│   │   ├── app.service.ts
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma   # فارغ — جاهز لـ Sprint 1
│   ├── .env.example
│   └── package.json
├── frontend/         # React + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css       # Tailwind v4
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## متطلبات البيئة

- Node.js ≥ 18
- npm ≥ 9
- PostgreSQL (لاحقاً في Sprint 1)

## تشغيل محلي

### Backend (NestJS)

```bash
cd backend
cp .env.example .env       # عدّل DATABASE_URL
npm install
npm run start:dev          # يعمل على http://localhost:3000
```

### Frontend (Vite + React)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                # يعمل على http://localhost:5173
```

## Stack

| المكوّن     | التقنية                         |
|------------|----------------------------------|
| Backend    | NestJS 11 + TypeScript           |
| ORM        | Prisma 6 (PostgreSQL)            |
| Frontend   | React 19 + Vite 8 + TypeScript  |
| Styling    | Tailwind CSS v4                  |

---

> **Sprint 0 مكتمل** — التالي: Sprint 1 (Auth + قاعدة البيانات الأولى)
