import 'dotenv/config';
import { PrismaClient, Role, Workspace } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function generateRandomPassword(length: number = 16): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

async function main() {
  console.log('🌱 Seeding database...');

  const saltRounds = 12;

  // Fixed dev credentials (safe only in development!)
  const devTestPassword = 'Dev@1234';
  const devTestPasswordHash = await bcrypt.hash(devTestPassword, saltRounds);

  const devTestUser = await prisma.user.upsert({
    where: { username: 'dev_test' },
    update: { passwordHash: devTestPasswordHash },
    create: {
      username: 'dev_test',
      passwordHash: devTestPasswordHash,
      role: Role.admin,
      workspace: Workspace.sandbox,
      fullName: 'حساب اختبار تطوير',
    },
  });

  console.log(`✅ Created dev_test user: ${devTestUser.username}`);
  console.log(`🔑 Password: ${devTestPassword}`);

  // admin_bietmi: use ADMIN_PASSWORD env var if set, otherwise random
  const adminPassword = process.env.ADMIN_PASSWORD || generateRandomPassword();
  const adminPasswordHash = await bcrypt.hash(adminPassword, saltRounds);

  const adminBietmiUser = await prisma.user.upsert({
    where: { username: 'admin_bietmi' },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: 'admin_bietmi',
      passwordHash: adminPasswordHash,
      role: Role.admin,
      workspace: Workspace.production,
      fullName: 'المدير العام - BIETMI',
    },
  });

  console.log(`✅ Created admin_bietmi user: ${adminBietmiUser.username}`);
  console.log(`🔑 Password: ${adminPassword}`);

  // Base supplier categories (idempotent — safe to re-run).
  // Each workspace gets its own copy, so sandbox and production can
  // evolve their category lists independently.
  const seedCategories = ['حديد', 'معدات', 'قطع غيار', 'مواد استهلاكية'];
  for (const workspace of [Workspace.sandbox, Workspace.production]) {
    for (const name of seedCategories) {
      const category = await prisma.supplierCategory.upsert({
        where: { workspace_name: { workspace, name } },
        update: {},
        create: { name, workspace },
      });
      console.log(`✅ Supplier category ensured: ${name} (${workspace})`);
    }
  }

  // Company profile is per-workspace (each root account has its own identity).
  for (const workspace of [Workspace.sandbox, Workspace.production]) {
    await prisma.company.upsert({
      where: { workspace },
      update: {},
      create: { workspace, name: 'EURL BIETMI PLUS' },
    });
    console.log(`✅ Company profile ensured (${workspace})`);
  }

  console.log('\n🎉 Seeding complete!');

  if (!process.env.ADMIN_PASSWORD) {
    console.log('\n⚠️  admin_bietmi password is random — set ADMIN_PASSWORD env var to fix it.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
