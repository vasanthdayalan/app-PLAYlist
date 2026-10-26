import { PrismaClient } from '@prisma/client';
import { LANGUAGES } from '../src/languages/languages.constants.ts';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const name of LANGUAGES) {
    await prisma.language.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${LANGUAGES.length} languages`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
