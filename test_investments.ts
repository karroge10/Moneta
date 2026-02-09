import { db } from './src/lib/db';
import { getInvestmentsPortfolio } from './src/lib/investments';

async function test() {
    try {
        const user = await db.user.findFirst();
        if (!user) {
            console.log('No user found');
            return;
        }
        const currency = (user.currencyId && await db.currency.findUnique({ where: { id: user.currencyId } })) || await db.currency.findFirst();
        if (!currency) {
            console.log('No currency found');
            return;
        }
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
