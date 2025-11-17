import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

// Ensure DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('Clearing all transactions...');
  
  const result = await prisma.transaction.deleteMany({});
  
  console.log(`Successfully deleted ${result.count} transaction(s).`);
}

main()
  .catch((e) => {
    console.error('Error clearing transactions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

