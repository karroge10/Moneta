/**
 * Seed script for global merchants database
 * Combines worldwide and Georgia-specific merchants
 */

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

// Category name to ID mapping (will be fetched from DB)
interface CategoryMap {
  [key: string]: number;
}

// Merchant data: [namePattern, categoryName]
const merchants: Array<[string, string]> = [
  // === GROCERIES ===
  // Worldwide
  ['walmart', 'Groceries'],
  ['target', 'Groceries'],
  ['costco', 'Groceries'],
  ['kroger', 'Groceries'],
  ['safeway', 'Groceries'],
  ['whole foods', 'Groceries'],
  ['trader joes', 'Groceries'],
  ['aldi', 'Groceries'],
  ['lidl', 'Groceries'],
  ['carrefour', 'Groceries'],
  ['tesco', 'Groceries'],
  ['asda', 'Groceries'],
  ['sainsburys', 'Groceries'],
  ['spar', 'Groceries'],
  ['walmart supercenter', 'Groceries'],
  ['walmart neighborhood market', 'Groceries'],
  // Georgia-specific
  ['goodwill', 'Groceries'],
  ['nikora', 'Groceries'],
  ['fresco', 'Groceries'],
  ['populi', 'Groceries'],
  ['orienti', 'Groceries'],
  ['ltd', 'Groceries'],
  ['ori nabiji', 'Groceries'],
  ['agrohub', 'Groceries'],
  ['magniti', 'Groceries'],
  ['madagoni', 'Groceries'],
  ['oneprice', 'Groceries'],

  // === RESTAURANTS ===
  // Worldwide
  ['mcdonalds', 'Restaurants'],
  ['burger king', 'Restaurants'],
  ['kfc', 'Restaurants'],
  ['wendys', 'Restaurants'],
  ['taco bell', 'Restaurants'],
  ['subway', 'Restaurants'],
  ['pizza hut', 'Restaurants'],
  ['dominos', 'Restaurants'],
  ['starbucks', 'Restaurants'],
  ['dunkin donuts', 'Restaurants'],
  ['chipotle', 'Restaurants'],
  ['panera bread', 'Restaurants'],
  ['olive garden', 'Restaurants'],
  ['red lobster', 'Restaurants'],
  ['applebees', 'Restaurants'],
  ['outback steakhouse', 'Restaurants'],
  ['pf changs', 'Restaurants'],
  ['cheesecake factory', 'Restaurants'],
  // Georgia-specific
  ['cafe littera', 'Restaurants'],
  ['barbarestan', 'Restaurants'],
  ['shavi lomi', 'Restaurants'],
  ['purpur', 'Restaurants'],
  ['salobie bia', 'Restaurants'],
  ['pasanauri', 'Restaurants'],
  ['zakhar zakharich', 'Restaurants'],

  // === TRANSPORTATION ===
  // Worldwide
  ['uber', 'Transportation'],
  ['lyft', 'Transportation'],
  ['bolt', 'Transportation'],
  ['taxi', 'Transportation'],
  ['airport shuttle', 'Transportation'],
  ['amtrak', 'Transportation'],
  ['greyhound', 'Transportation'],
  ['delta', 'Transportation'],
  ['united', 'Transportation'],
  ['american airlines', 'Transportation'],
  ['southwest', 'Transportation'],
  ['british airways', 'Transportation'],
  ['lufthansa', 'Transportation'],
  ['air france', 'Transportation'],
  ['shell', 'Transportation'],
  ['bp', 'Transportation'],
  ['exxon', 'Transportation'],
  ['chevron', 'Transportation'],
  ['mobil', 'Transportation'],
  ['76', 'Transportation'],
  ['speedway', 'Transportation'],
  ['circle k', 'Transportation'],
  ['parking', 'Transportation'],
  ['toll', 'Transportation'],
  // Georgia-specific
  ['yandex taxi', 'Transportation'],
  ['tbilisi metro', 'Transportation'],
  ['tbilisi bus', 'Transportation'],
  ['marshrutka', 'Transportation'],
  ['georgian railway', 'Transportation'],

  // === TECHNOLOGY ===
  // Worldwide
  ['apple', 'Technology'],
  ['apple store', 'Technology'],
  ['mac center', 'Technology'],
  ['best buy', 'Technology'],
  ['microcenter', 'Technology'],
  ['amazon', 'Technology'],
  ['newegg', 'Technology'],
  ['samsung', 'Technology'],
  ['dell', 'Technology'],
  ['hp', 'Technology'],
  ['lenovo', 'Technology'],
  ['microsoft', 'Technology'],
  ['google', 'Technology'],
  ['adobe', 'Technology'],
  ['oracle', 'Technology'],
  // Georgia-specific
  ['technopark', 'Technology'],
  ['zoomer', 'Technology'],
  ['click', 'Technology'],
  ['yvershini', 'Technology'],

  // === FITNESS ===
  // Worldwide
  ['golds gym', 'Fitness'],
  ['planet fitness', 'Fitness'],
  ['anytime fitness', 'Fitness'],
  ['24 hour fitness', 'Fitness'],
  ['la fitness', 'Fitness'],
  ['equinox', 'Fitness'],
  ['peloton', 'Fitness'],
  ['nike', 'Fitness'],
  ['adidas', 'Fitness'],
  ['under armour', 'Fitness'],
  // Georgia-specific
  ['fitplus', 'Fitness'],
  ['fitlab', 'Fitness'],

  // === ENTERTAINMENT ===
  // Worldwide
  ['netflix', 'Entertainment'],
  ['spotify', 'Entertainment'],
  ['amazon prime', 'Entertainment'],
  ['disney plus', 'Entertainment'],
  ['hulu', 'Entertainment'],
  ['hbo max', 'Entertainment'],
  ['apple tv', 'Entertainment'],
  ['youtube premium', 'Entertainment'],
  ['playstation', 'Entertainment'],
  ['xbox', 'Entertainment'],
  ['nintendo', 'Entertainment'],
  ['steam', 'Entertainment'],
  ['epic games', 'Entertainment'],
  ['movie theater', 'Entertainment'],
  ['cinema', 'Entertainment'],
  ['amc', 'Entertainment'],
  ['regal', 'Entertainment'],
  ['imax', 'Entertainment'],
  // Georgia-specific
  ['rustaveli cinema', 'Entertainment'],
  ['amirani cinema', 'Entertainment'],
  ['east point', 'Entertainment'],
  ['tbilisi mall', 'Entertainment'],
  ['city mall', 'Entertainment'],
  ['georgia cinema', 'Entertainment'],

  // === CLOTHES ===
  // Worldwide
  ['zara', 'Clothes'],
  ['h&m', 'Clothes'],
  ['bershka', 'Clothes'],
  ['pull and bear', 'Clothes'],
  ['mango', 'Clothes'],
  ['massimo dutti', 'Clothes'],
  ['uniqlo', 'Clothes'],
  ['gap', 'Clothes'],
  ['old navy', 'Clothes'],
  ['banana republic', 'Clothes'],
  ['j crew', 'Clothes'],
  ['nordstrom', 'Clothes'],
  ['macys', 'Clothes'],
  ['jcpenney', 'Clothes'],
  ['kohls', 'Clothes'],
  ['nike', 'Clothes'],
  ['adidas', 'Clothes'],
  ['under armour', 'Clothes'],
  ['puma', 'Clothes'],
  ['reebok', 'Clothes'],

  // === FURNITURE ===
  // Worldwide
  ['ikea', 'Furniture'],
  ['wayfair', 'Furniture'],
  ['overstock', 'Furniture'],
  ['pottery barn', 'Furniture'],
  ['west elm', 'Furniture'],
  ['crate and barrel', 'Furniture'],
  ['ashley furniture', 'Furniture'],
  ['rooms to go', 'Furniture'],
  ['home depot', 'Furniture'],
  ['lowes', 'Furniture'],
  // Georgia-specific
  ['home center', 'Furniture'],
  ['profi', 'Furniture'],

  // === RESTAURANTS (Food Delivery) ===
  // Worldwide
  ['wolt', 'Restaurants'],
  ['glovo', 'Restaurants'],
  ['ubereats', 'Restaurants'],
  ['doordash', 'Restaurants'],
  ['grubhub', 'Restaurants'],
  ['postmates', 'Restaurants'],
  ['deliveroo', 'Restaurants'],

  // === GIFTS ===
  // Worldwide
  ['amazon', 'Gifts'],
  ['etsy', 'Gifts'],
  ['gift shop', 'Gifts'],

  // === OTHER ===
  // Banks, fees, commissions, ATM withdrawals
  ['utility bill', 'Other'],
  ['bank of georgia', 'Other'],
  ['tbc bank', 'Other'],
  ['liberty bank', 'Other'],
  ['basisbank', 'Other'],
  ['bog', 'Other'],
  ['credo bank', 'Other'],
  ['procredit bank', 'Other'],

  // === MOBILE DATA ===
  // Worldwide
  ['verizon', 'Mobile Data'],
  ['at&t', 'Mobile Data'],
  ['tmobile', 'Mobile Data'],
  ['sprint', 'Mobile Data'],
  ['vodafone', 'Mobile Data'],
  ['orange', 'Mobile Data'],
  ['ee', 'Mobile Data'],
  // Georgia-specific
  ['magti', 'Mobile Data'],
  ['magticom', 'Mobile Data'],
  ['beeline georgia', 'Mobile Data'],
  ['geocell', 'Mobile Data'],
  ['silknet', 'Mobile Data'],

  // === HOME INTERNET ===
  // Worldwide
  ['verizon fios', 'Home Internet'],
  ['xfinity', 'Home Internet'],
  ['spectrum', 'Home Internet'],
  ['att internet', 'Home Internet'],
  ['cox', 'Home Internet'],
  ['century link', 'Home Internet'],
  ['vodafone', 'Home Internet'],
  ['orange', 'Home Internet'],
  ['bt', 'Home Internet'],
  ['sky', 'Home Internet'],
  // Georgia-specific
  ['magticom', 'Home Internet'],
  ['beeline georgia', 'Home Internet'],
  ['geocell', 'Home Internet'],
  ['silknet', 'Home Internet'],
  ['tnet', 'Home Internet'],

  // === ELECTRICITY BILL ===
  // Worldwide
  ['electric company', 'Electricity Bill'],
  ['power company', 'Electricity Bill'],
  // Georgia-specific
  ['telasi', 'Electricity Bill'],
  ['energo pro georgia', 'Electricity Bill'],
  ['telmiko', 'Electricity Bill'],
  ['telmi', 'Electricity Bill'],

  // === WATER BILL ===
  // Worldwide
  ['water company', 'Water Bill'],
  ['water utility', 'Water Bill'],
  // Georgia-specific
  ['aisi', 'Water Bill'],
  ['gwp', 'Water Bill'],

  // === HEATING BILL ===
  // Worldwide
  ['heating company', 'Heating Bill'],
  ['gas company', 'Heating Bill'],
  ['utility company', 'Heating Bill'],
  // Georgia-specific
  ['telasi', 'Heating Bill'],
  ['gwp', 'Heating Bill'],
  ['tbilisi energy', 'Heating Bill'],

  // === RENT ===
  // Worldwide
  ['property management', 'Rent'],
  ['real estate', 'Rent'],
  ['landlord', 'Rent'],

  // === TAXES IN GEORGIA ===
  // Georgia-specific
  ['revenue service', 'Taxes in Georgia'],
  ['rs georgia', 'Taxes in Georgia'],

  // === TAXES IN USA ===
  // Worldwide
  ['irs', 'Taxes in USA'],

  // === ELEVATOR & CLEANING BILL ===
  // Worldwide
  ['building management', 'Elevator & Cleaning Bill'],
  ['condo association', 'Elevator & Cleaning Bill'],
  ['hoa', 'Elevator & Cleaning Bill'],
];

async function main() {
  console.log('🌍 Seeding global merchants database...');

  try {
    // Hardcoded category name-to-ID map (from database)
    const categoryMap: CategoryMap = {
      'Rent': 2,
      'Entertainment': 3,
      'Restaurants': 4,
      'Furniture': 5,
      'Groceries': 6,
      'Gifts': 7,
      'Fitness': 8,
      'Water Bill': 9,
      'Technology': 10,
      'Electricity Bill': 11,
      'Clothes': 12,
      'Elevator & Cleaning Bill': 13,
      'Transportation': 14,
      'Heating Bill': 15,
      'Home Internet': 16,
      'Taxes in Georgia': 17,
      'Mobile Data': 18,
      'Taxes in USA': 19,
      'Other': 20,
    };

  console.log(`📋 Using ${Object.keys(categoryMap).length} categories`);

  // Prepare merchants for insertion
  const merchantsToCreate = merchants
    .map(([namePattern, categoryName]) => {
      const categoryId = categoryMap[categoryName];
      if (!categoryId) {
        console.warn(`⚠️  Category "${categoryName}" not found, skipping merchant "${namePattern}"`);
        return null;
      }
      return {
        namePattern: namePattern.toLowerCase().trim(),
        categoryId,
      };
    })
    .filter((m): m is { namePattern: string; categoryId: number } => m !== null);

  console.log(`📦 Prepared ${merchantsToCreate.length} merchants to insert`);

  // Insert merchants (using upsert to avoid duplicates)
  let inserted = 0;
  let skipped = 0;

  for (const merchant of merchantsToCreate) {
    try {
      await prisma.merchantGlobal.upsert({
        where: { namePattern: merchant.namePattern },
        update: {
          categoryId: merchant.categoryId, // Update category if it changed
        },
        create: merchant,
      });
      inserted++;
    } catch (error) {
      console.error(`❌ Error inserting merchant "${merchant.namePattern}":`, error);
      skipped++;
    }
  }

  console.log(`✅ Successfully inserted/updated ${inserted} merchants`);
  if (skipped > 0) {
    console.log(`⚠️  Skipped ${skipped} merchants due to errors`);
  }

    console.log('🎉 Global merchants seeding complete!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding merchants:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

