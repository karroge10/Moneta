import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
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
  console.log('🔄 Updating user settings...\n');

  // Step 1: Add GEL currency if it doesn't exist
  console.log('1. Checking/adding GEL currency...');
  let gelCurrency = await prisma.currency.findFirst({
    where: { alias: 'GEL' },
  });

  if (!gelCurrency) {
    gelCurrency = await prisma.currency.create({
      data: {
        name: 'Georgian Lari',
        symbol: '₾',
        alias: 'GEL',
      },
    });
    console.log(`   ✓ Created GEL currency (ID: ${gelCurrency.id})`);
  } else {
    // Update if needed
    gelCurrency = await prisma.currency.update({
      where: { id: gelCurrency.id },
      data: {
        name: 'Georgian Lari',
        symbol: '₾',
        alias: 'GEL',
      },
    });
    console.log(`   ✓ GEL currency already exists (ID: ${gelCurrency.id})`);
  }
  console.log('');

  // Step 2: Ensure English language exists
  console.log('2. Checking/adding English language...');
  let englishLanguage = await prisma.language.findFirst({
    where: { alias: 'en' },
  });

  if (!englishLanguage) {
    englishLanguage = await prisma.language.create({
      data: {
        name: 'English',
        alias: 'en',
      },
    });
    console.log(`   ✓ Created English language (ID: ${englishLanguage.id})`);
  } else {
    // Update if needed
    englishLanguage = await prisma.language.update({
      where: { id: englishLanguage.id },
      data: {
        name: 'English',
        alias: 'en',
      },
    });
    console.log(`   ✓ English language already exists (ID: ${englishLanguage.id})`);
  }
  console.log('');

  // Step 3: Update user settings
  console.log('3. Updating user settings...');
  
  // Check if a specific clerkUserId was provided as command line argument
  const clerkUserIdArg = process.argv[2];
  
  if (clerkUserIdArg) {
    // Update specific user by clerkUserId
    const user = await prisma.user.findUnique({
      where: { clerkUserId: clerkUserIdArg },
    });
    
    if (!user) {
      console.log(`   ⚠️  User with clerkUserId "${clerkUserIdArg}" not found.`);
      console.log('   💡 Available users:');
      const allUsers = await prisma.user.findMany({
        select: { id: true, clerkUserId: true },
      });
      allUsers.forEach((u: { id: number; clerkUserId: string | null }) => {
        console.log(`      - ID: ${u.id}, Clerk ID: ${u.clerkUserId || 'none'}`);
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          languageId: englishLanguage.id,
          currencyId: gelCurrency.id,
        },
      });
      console.log(`   ✓ Updated user ${user.id} (${user.clerkUserId || 'no clerk ID'})\n`);
    }
  } else {
    // Update all users
    const users = await prisma.user.findMany();
    
    if (users.length === 0) {
      console.log('   ⚠️  No users found in database.');
      console.log('   💡 Note: User settings will be set automatically when a user signs in.');
      console.log('   💡 To update a specific user, run: npx tsx prisma/update-user-settings.ts <clerkUserId>\n');
    } else {
      let updated = 0;
      for (const user of users) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            languageId: englishLanguage.id,
            currencyId: gelCurrency.id,
          },
        });
        updated++;
        console.log(`   ✓ Updated user ${user.id} (${user.clerkUserId || 'no clerk ID'})`);
      }
      console.log(`\n   ✅ Updated ${updated} user(s)\n`);
    }
  }

  console.log('✅ All done!');
  console.log(`   - Currency: ${gelCurrency.name} (${gelCurrency.symbol}) - ID: ${gelCurrency.id}`);
  console.log(`   - Language: ${englishLanguage.name} - ID: ${englishLanguage.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Error updating user settings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

