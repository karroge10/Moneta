import type { NotificationSettings } from '@/types/dashboard';


export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  pushNotifications: true,
  upcomingBills: true,
  upcomingIncome: true,
  investments: true,
  goals: true,
  promotionalEmail: true,
  aiInsights: true,
};
