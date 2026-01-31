import { db } from './db';
import type { NotificationSettings } from '@/types/dashboard';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
} from './notification-settings-constants';

export { DEFAULT_NOTIFICATION_SETTINGS };

const NOTIFICATION_TYPE_TO_SETTING: Record<string, keyof NotificationSettings> = {
  'PDF Processing': 'pushNotifications',
  'Upcoming Bills': 'upcomingBills',
  'Upcoming Income': 'upcomingIncome',
  'Investments': 'investments',
  'Goals': 'goals',
  'Goal Update': 'goals',
  'AI Insights': 'aiInsights',
};

export async function getNotificationSettings(
  userId: number
): Promise<NotificationSettings> {
  const row = await db.userNotificationSettings.findUnique({
    where: { userId },
  });
  if (!row) return { ...DEFAULT_NOTIFICATION_SETTINGS };
  return {
    pushNotifications: row.pushNotifications,
    upcomingBills: row.upcomingBills,
    upcomingIncome: row.upcomingIncome,
    investments: row.investments,
    goals: row.goals,
    promotionalEmail: row.promotionalEmail,
    aiInsights: row.aiInsights,
  };
}

export async function shouldCreateNotification(
  userId: number,
  notificationType: string
): Promise<boolean> {
  const settings = await getNotificationSettings(userId);
  const key = NOTIFICATION_TYPE_TO_SETTING[notificationType];
  if (!key) {
    return true;
  }
  return settings[key];
}
