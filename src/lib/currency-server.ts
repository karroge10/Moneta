import { db } from './db';
import { getCurrentUser } from './auth';


export async function getUserCurrency() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return getDefaultCurrency();
    }

    const userWithCurrency = await db.user.findUnique({
      where: { id: user.id },
      include: { currency: true },
    });

    if (userWithCurrency?.currency) {
      return {
        id: userWithCurrency.currency.id,
        name: userWithCurrency.currency.name,
        symbol: userWithCurrency.currency.symbol,
        alias: userWithCurrency.currency.alias,
      };
    }

    return getDefaultCurrency();
  } catch (error) {
    console.error('Error fetching user currency:', error);
    return getDefaultCurrency();
  }
}


export function getDefaultCurrency() {
  return {
    id: 0,
    name: 'US Dollar',
    symbol: '$',
    alias: 'USD',
  };
}

