import type { NotificationSettings } from '@/types/dashboard';

/**
 * Client-safe notification settings constants.
 * Import this from client components instead of notification-settings.ts
 * to avoid pulling in Prisma/db (which requires DATABASE_URL).
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushNotifications: true,
  upcomingBills: true,
  upcomingIncome: true,
  investments: true,
  goals: true,
  promotionalEmail: true,
  aiInsights: true,
};
