import { auth } from '@clerk/nextjs/server';
import { db } from './db';


export async function getCurrentUser() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return null;
  }

  
  let user = await db.user.findUnique({
    where: { clerkUserId },
  });

  if (!user) {
    const [englishLanguage, usdCurrency] = await Promise.all([
      db.language.findFirst({ where: { alias: 'en' }, select: { id: true } }),
      db.currency.findFirst({ where: { alias: 'USD' }, select: { id: true } }),
    ]);

    try {
      user = await db.user.create({
        data: {
          clerkUserId,
          languageId: englishLanguage?.id ?? null,
          currencyId: usdCurrency?.id ?? null,
          dataSharingEnabled: false,
          notificationSettings: {
            create: {
              pushNotifications: true,
              upcomingBills: true,
              upcomingIncome: true,
              investments: true,
              goals: true,
              promotionalEmail: true,
              aiInsights: true,
            },
          },
        },
      });
    } catch (error: any) {
      // Handle race condition where another request created the user simultaneously
      if (error.code === 'P2002') {
        user = await db.user.findUnique({
          where: { clerkUserId },
        });
      } else {
        throw error;
      }
    }
  }

  return user;
}


export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized: User not authenticated');
  }

  return user;
}


export async function requireCurrentUserWithLanguage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error('Unauthorized: User not authenticated');
  }

  
  let user = await db.user.findUnique({
    where: { clerkUserId },
    include: { language: true },
  });

  if (!user) {
    const [englishLanguage, usdCurrency] = await Promise.all([
      db.language.findFirst({ where: { alias: 'en' }, select: { id: true } }),
      db.currency.findFirst({ where: { alias: 'USD' }, select: { id: true } }),
    ]);

    try {
      user = await db.user.create({
        data: {
          clerkUserId,
          languageId: englishLanguage?.id ?? null,
          currencyId: usdCurrency?.id ?? null,
          dataSharingEnabled: false,
          notificationSettings: {
            create: {
              pushNotifications: true,
              upcomingBills: true,
              upcomingIncome: true,
              investments: true,
              goals: true,
              promotionalEmail: true,
              aiInsights: true,
            },
          },
        },
        include: { language: true },
      });
    } catch (error: any) {
      // Handle race condition
      if (error.code === 'P2002') {
        user = await db.user.findUnique({
          where: { clerkUserId },
          include: { language: true },
        });
      } else {
        throw error;
      }
    }

    if (!user) {
      throw new Error('Unauthorized: Failed to create or find user');
    }
  }

  return user;
}


