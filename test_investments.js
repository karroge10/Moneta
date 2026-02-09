const { PrismaClient } = require('@prisma/client');
const { getInvestmentsPortfolio } = require('./src/lib/investments');

async function test() {
    const db = new PrismaClient();
    try {
        const user = await db.user.findFirst();
        if (!user) {
            console.log('No user found');
            return;
        }
        const currency = await db.currency.findFirst({ where: { id: user.currencyId } }) || await db.currency.findFirst();
        console.log('Testing for user', user.id, 'currency', currency.alias);
        const summary = await getInvestmentsPortfolio(user.id, currency);
        console.log('Summary:', JSON.stringify(summary, null, 2));
    } catch (err) {
        console.error('CRASH:', err);
    } finally {
        await db.$disconnect();
    }
}

test();
