import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
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
      fullName: 'المدير العام - BIETMI',
    },
  });

  console.log(`✅ Created admin_bietmi user: ${adminBietmiUser.username}`);
  console.log(`🔑 Password: ${adminPassword}`);

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
