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
    answer: 'Absolutely! We prioritize your data security and ensure all sensitive information is encrypted.',
    category: 'General'
  },
  {
    id: '3',
    question: 'When will you offer plans?',
    answer: "We're focused on the core product first. We'll announce plans when we're ready.",
    category: 'General'
  },
  {
    id: '4',
    question: 'How can I track my expenses?',
    answer: 'You can log transactions manually or import them using the upload feature available in the Transactions section. We plan on adding automatic transaction feature in the future.',
    category: 'Features'
  },
  {
    id: '5',
    question: 'What are AI-powered insights?',
    answer: 'AI-powered insights analyze your financial habits and provide personalized recommendations to improve your savings and investments.',
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
    answer: 'Go to the Login page, click "Forgot Password," and follow the instructions. If you are logged in, go to the Settings page, click "Change Password", and follow the instructions.',
    category: 'Account'
  },
  {
    id: '9',
    question: 'How do I manage my account?',
    answer: 'Visit the Settings page to update your profile, language, currency, and notification preferences.',
    category: 'Account'
  },
  {
    id: '10',
    question: 'How do I change my language or currency settings?',
    answer: 'You can visit the Settings page to customize language, currency, and country settings.',
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
    answer: 'Yes! Use the Export Data option on the Settings page to download your financial information. You can also import data if needed.',
    category: 'Features'
  },
  {
    id: '13',
    question: 'Can I link my bank account?',
    answer: 'Currently, we do not support direct bank account linking. However, you can upload transaction files or add transactions manually.',
    category: 'Features'
  },
  {
    id: '14',
    question: 'What should I do if I experience a bug?',
    answer: 'Please report the issue using the contact form on the Help Center page, and our team will address it promptly.',
    category: 'Technical'
  },
  {
    id: '15',
    question: 'Why am I not receiving notifications?',
    answer: 'Check your notification settings on the Notifications page to ensure alerts are enabled for your account.',
    category: 'Technical'
  },
  ];

