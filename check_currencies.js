const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
    const currencies = await db.currency.findMany();
    console.log(JSON.stringify(currencies, null, 2));
    await db.$disconnect();
}

main();
