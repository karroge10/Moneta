/**
 * Learning Center lesson content (single primary CTA per lesson in the modal).
 */
export interface LearningCenterLesson {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  primaryHref: string;
  primaryLabel: string;
}

export const learningCenterLessons: LearningCenterLesson[] = [
  {
    id: '1',
    title: 'Getting started',
    summary: 'Wire up the basics so your dashboard reflects real activity.',
    steps: [
      'Choose currency and language under Settings.',
      'Record income and expenses on the Transactions page (or import a statement).',
      'Review the Dashboard for balance, trends, and health at a glance.',
    ],
    primaryHref: '/dashboard',
    primaryLabel: 'Go to Dashboard',
  },
  {
    id: '2',
    title: 'Managing money',
    summary: 'Use dedicated views for income, spending, and cash flow.',
    steps: [
      'Income and Expenses pages summarize totals for the selected period.',
      'Categorize transactions so charts and statistics stay meaningful.',
      'Edit any row on Transactions to fix amounts, dates, or categories.',
    ],
    primaryHref: '/transactions',
    primaryLabel: 'Open Transactions',
  },
  {
    id: '3',
    title: 'Financial health',
    summary: 'Understand the score and what moves it.',
    steps: [
      'Saving rate, spending vs income, goals, and engagement shape your score.',
      'Open Statistics for long-run trends and the score breakdown link.',
      'Small habits—regular logging and categorized spend—compound over time.',
    ],
    primaryHref: '/statistics',
    primaryLabel: 'View Statistics',
  },
  {
    id: '4',
    title: 'Statistics & comparisons',
    summary: 'See how you stack up and how months compare.',
    steps: [
      'Expenses by category and monthly summary use all-time data for stable trends.',
      'Enable data sharing in Settings to unlock anonymous cohort comparisons.',
      'Complete age, country, and profession in your profile for relevant peer groups.',
    ],
    primaryHref: '/statistics',
    primaryLabel: 'Open Statistics',
  },
  {
    id: '5',
    title: 'Settings & imports',
    summary: 'Tune the app and bring in bank data safely.',
    steps: [
      'Update profile, notifications, and export options in Settings.',
      'Import PDF statements from Transactions → Import when supported.',
      'Use Export data if you need a backup or spreadsheet.',
    ],
    primaryHref: '/settings',
    primaryLabel: 'Open Settings',
  },
  {
    id: '6',
    title: 'Support & troubleshooting',
    summary: 'Get unstuck with FAQs and feedback.',
    steps: [
      'Search the FAQ above for account, features, and technical answers.',
      'Send feedback from this page if something looks wrong.',
      'Notification issues are often fixed in notification settings.',
    ],
    primaryHref: '/help#faq-14',
    primaryLabel: 'Report an issue (FAQ)',
  },
];

export const learningLessonIdSet = new Set(learningCenterLessons.map((l) => l.id));
