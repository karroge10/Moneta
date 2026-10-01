export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'General' | 'Account' | 'Features' | 'Technical';
}

export const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'What is Moneta?',
    answer: 'Moneta helps you track your income, expenses, transactions, and goals while offering insights into your financial health.',
    category: 'General'
  },
  {
    id: '2',
    question: 'Is Moneta secure?',
    answer: 'Sign-in is handled by Clerk, every connection uses HTTPS, and your data is never sold. Moneta never asks for your bank login: you add transactions by hand or upload a statement file.',
    category: 'General'
  },
  {
    id: '3',
    question: 'Is Moneta free?',
    answer: 'Yes, the core app is free. The free plan includes 3 bank statement PDF imports per month; Moneta Premium removes that limit. Billing currently runs in Stripe test mode, so no real charges are made.',
    category: 'General'
  },
  {
    id: '4',
    question: 'How can I track my expenses?',
    answer: 'You can add transactions by hand or upload a bank statement PDF in the Transactions section.',
    category: 'Features'
  },
  {
    id: '5',
    question: 'What is the Round-up card?',
    answer:
      'It estimates what you would set aside if you rounded up 1% of your spending in the selected period, then compares illustrative one-year returns at about 7% savings APY versus a tracked asset only when recent performance beats that baseline (never a “losing” market line).',
    category: 'Features'
  },
  {
    id: '6',
    question: 'What is the Financial Health Score?',
    answer: 'The Financial Health Score is a calculated metric based on your spending, savings, and income habits, providing a quick overview of your financial well-being. You can see the full breakdown on the Financial Health page.',
    category: 'Features'
  },
  {
    id: '7',
    question: 'Can I set financial goals?',
    answer: 'Yes, you can set and track financial goals in the Goals section.',
    category: 'Features'
  },
  {
    id: '8',
    question: 'How do I reset my password?',
    answer: 'On the sign-in screen, choose "Forgot password" and follow the instructions. If you are signed in, open Settings, click "Change password" and follow the steps.',
    category: 'Account'
  },
  {
    id: '9',
    question: 'How do I manage my account?',
    answer: 'Visit the Settings page to update your country, currency, date of birth, profession and tax estimate. Name, photo, email and password are managed in your account profile, opened from the same page.',
    category: 'Account'
  },
  {
    id: '10',
    question: 'How do I change my currency?',
    answer: 'Open the Settings page and pick a new currency or country. Amounts across the app are shown in the selected currency.',
    category: 'Account'
  },
  {
    id: '11',
    question: 'How do I categorize a transaction?',
    answer: 'You can either drag and drop category on top of transaction on the Transactions page or edit transaction individually by clicking on it.',
    category: 'Features'
  },
  {
    id: '12',
    question: 'Can I export my data?',
    answer: 'Yes. Use Export Data on the Settings page to download your transactions as an Excel file.',
    category: 'Features'
  },
  {
    id: '13',
    question: 'Can I link my bank account?',
    answer: 'Not at the moment. Instead, you can upload a bank statement PDF in the Transactions section. Moneta reads the transactions and suggests categories, recognizing merchants you have categorized before; you review them before importing.',
    category: 'Features'
  },
  {
    id: '14',
    question: 'How does Investment tracking work?',
    answer: 'In the Investments section, you can add your crypto assets (via CoinGecko) or US stocks (via Stooq). Moneta fetches live prices whenever you view your portfolio to give you an up-to-date view of your net worth.',
    category: 'Features'
  },
  {
    id: '15',
    question: 'What should I do if I experience a bug?',
    answer: 'Please report it with the Send Feedback form on the Help Center page.',
    category: 'Technical'
  },
  {
    id: '16',
    question: 'Why have I not received a notification yet?',
    answer: 'Scheduled notifications, like reminders for recurring transactions, are created once per day, so a new one can take up to a day to appear. Notifications older than 30 days are removed automatically.',
    category: 'Technical'
  },
];

