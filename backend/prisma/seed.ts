import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/enums';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const rounds = 10;

  const users = [
    { name: 'Admin', email: 'admin@unifesp.br', role: UserRole.admin },
    { name: 'Professor', email: 'professor@unifesp.br', role: UserRole.professor },
    { name: 'Aluno', email: 'aluno@unifesp.br', role: UserRole.student },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: randomUUID(),
        name: user.name,
        email: user.email,
        password: await bcrypt.hash('123456', rounds),
        role: user.role,
      },
    });
    console.log(`Upserted user: ${user.email} (${user.role})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
