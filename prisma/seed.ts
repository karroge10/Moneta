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

const categories = [
  { name: 'Rent', icon: 'City', color: '#74C648' },
  { name: 'Entertainment', icon: 'Tv', color: '#74C648' },
  { name: 'Restaurants', icon: 'PizzaSlice', color: '#D93F3F' },
  { name: 'Furniture', icon: 'Sofa', color: '#74C648' },
  { name: 'Groceries', icon: 'Cart', color: '#AC66DA' },
  { name: 'Gifts', icon: 'Gift', color: '#D93F3F' },
  { name: 'Fitness', icon: 'Gym', color: '#D93F3F' },
  { name: 'Water Bill', icon: 'Droplet', color: '#AC66DA' },
  { name: 'Technology', icon: 'Tv', color: '#74C648' },
  { name: 'Electricity Bill', icon: 'Flash', color: '#AC66DA' },
  { name: 'Clothes', icon: 'Shirt', color: '#AC66DA' },
  { name: 'Elevator & Cleaning Bill', icon: 'City', color: '#74C648' },
  { name: 'Transportation', icon: 'Tram', color: '#74C648' },
  { name: 'Heating Bill', icon: 'FireFlame', color: '#D93F3F' },
  { name: 'Home Internet', icon: 'Wifi', color: '#AC66DA' },
  { name: 'Taxes in Georgia', icon: 'Cash', color: '#74C648' },
  { name: 'Mobile Data', icon: 'SmartphoneDevice', color: '#D93F3F' },
  { name: 'Taxes in USA', icon: 'Cash', color: '#74C648' },
  { name: 'Other', icon: 'HelpCircle', color: '#AC66DA' },
];

async function main() {
  console.log('Seeding categories...');

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {
        icon: category.icon,
        color: category.color,
      },
      create: {
        name: category.name,
        icon: category.icon,
        color: category.color,
      },
    });
    console.log(`✓ Seeded category: ${category.name}`);
  }

  console.log(`\n✅ Successfully seeded ${categories.length} categories!`);
}

main()
  .catch((e) => {
    console.error('Error seeding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

