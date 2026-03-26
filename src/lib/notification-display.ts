/**
 * Strip internal dedupe tokens appended by cron-generated notifications (see cron-notifications.ts).
 */
export function notificationTextForDisplay(text: string): string {
  return text
    .replace(
      /\s+#rt:\d+:\d{4}-\d{2}-\d{2}$/,
      '',
    )
    .replace(
      /\s+#goal:\d+:(?:complete|deadline:\d{4}-\d{2}-\d{2})$/,
      '',
    )
    .trimEnd();
}
