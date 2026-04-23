import { db } from './db';
import { shouldCreateNotification } from './notification-settings';

export async function createNotification(userId: number, {
  type,
  text,
}: {
  type: string;
  text: string;
}) {
  const allowed = await shouldCreateNotification(userId, type);
  if (!allowed) return null;

  const now = new Date();
  return db.notification.create({
    data: {
      userId,
      type,
      text,
      date: now,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    }
  });
}


export async function generatePerformanceAlerts(userId: number, currentTotalValue: number, userCurrencySymbol: string) {
  const now = new Date();
  
  
  
  const isMonday = now.getDay() === 1;
  
  if (isMonday) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    
    const oldSnapshot = await db.portfolioSnapshot.findFirst({
      where: {
        userId,
        timestamp: {
          lte: sevenDaysAgo,
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (oldSnapshot) {
      const oldValue = Number(oldSnapshot.totalValue);
      const diff = currentTotalValue - oldValue;
      const perfPercent = oldValue > 0 ? (diff / oldValue) * 100 : 0;

      if (Math.abs(perfPercent) >= 0.1) { 
        const sign = perfPercent >= 0 ? '+' : '';
        const message = `Your portfolio ${perfPercent >= 0 ? 'grew' : 'dropped'} by ${sign}${perfPercent.toFixed(1)}% this week (${sign}${userCurrencySymbol}${Math.abs(diff).toFixed(2)}).`;
        
        await createNotification(userId, {
            type: 'Investments',
            text: message
        });
      }
    }
  }

  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  
  const yesterdaySnapshot = await db.portfolioSnapshot.findFirst({
    where: {
      userId,
      timestamp: {
        lte: yesterday,
      }
    },
    orderBy: { timestamp: 'desc' }
  });

  if (yesterdaySnapshot) {
    const oldValue = Number(yesterdaySnapshot.totalValue);
    const diff = currentTotalValue - oldValue;
    const perfPercent = oldValue > 0 ? (diff / oldValue) * 100 : 0;

    if (Math.abs(perfPercent) >= 5) {
      const message = `Large move! Your portfolio is ${perfPercent >= 0 ? 'up' : 'down'} ${perfPercent.toFixed(1)}% since yesterday.`;
      
      await createNotification(userId, {
          type: 'Investments',
          text: message
      });
    }
  }
}
