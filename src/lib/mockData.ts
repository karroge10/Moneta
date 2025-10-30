import { Transaction, Bill, Goal, Investment, ExpenseCategory } from '@/types/dashboard';

export const mockIncome = {
  amount: 151349,
  trend: 35,
};

export const mockExpenses = {
  amount: 92890,
  trend: -18,
};

export const mockUpdate = {
  date: 'Dec 25th 2024',
  message: 'You are on track to achieve your goal 2 months early!',
  highlight: '2 months',
  link: 'Statistics',
};

export const mockBills: Bill[] = [
  {
    id: '1',
    name: 'Gas (Home)',
    date: 'Jan 5th 2025',
    amount: 55.2,
    category: 'Utilities',
    icon: 'FireFlame',
  },
  {
    id: '2',
    name: 'Netflix (Subscription)',
    date: 'Jan 23rd 2025',
    amount: 7.99,
    category: 'Entertainment',
    icon: 'Tv',
  },
  {
    id: '3',
    name: 'Internet (Home)',
    date: 'Jan 25th 2025',
    amount: 20.0,
    category: 'Utilities',
    icon: 'Wifi',
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    name: 'H&M',
    date: 'Dec 25th 2024',
    amount: 150.99,
    category: 'Shopping',
    icon: 'Shirt',
  },
  {
    id: '2',
    name: "World's End Bar",
    date: 'Dec 21st 2024',
    amount: 22.0,
    category: 'Entertainment',
    icon: 'CoffeeCup',
  },
  {
    id: '3',
    name: 'Netflix',
    date: 'Dec 10th 2024',
    amount: 7.99,
    category: 'Entertainment',
    icon: 'Tv',
  },
  {
    id: '4',
    name: 'Walmart',
    date: 'Dec 2nd 2024',
    amount: 75.24,
    category: 'Shopping',
    icon: 'Cart',
  },
  {
    id: '5',
    name: 'WizzAir',
    date: 'Nov 29th 2024',
    amount: 390.0,
    category: 'Travel',
    icon: 'Airplane',
  },
  {
    id: '6',
    name: 'Apple Store',
    date: 'Nov 25th 2024',
    amount: 1199.9,
    category: 'Shopping',
    icon: 'SmartphoneDevice',
  },
];

export const mockGoals: Goal[] = [
  {
    id: '1',
    name: 'Tesla Model S',
    targetDate: 'Dec 25th 2024',
    targetAmount: 70000,
    currentAmount: 66862,
    progress: 94.5,
  },
  {
    id: '2',
    name: 'Vacation to Japan',
    targetDate: 'Jun 15th 2025',
    targetAmount: 15000,
    currentAmount: 8200,
    progress: 54.7,
  },
  {
    id: '3',
    name: 'Emergency Fund',
    targetDate: 'Dec 31st 2025',
    targetAmount: 50000,
    currentAmount: 32000,
    progress: 64.0,
  },
];

export const mockFinancialHealth = 81;

export const mockInvestments: Investment[] = [
  {
    id: '1',
    name: 'Bitcoin',
    subtitle: '0.341491 BTC',
    currentValue: 15120.31,
    changePercent: -4.21,
    icon: 'BitcoinCircle',
  },
  {
    id: '2',
    name: 'NYC Property',
    subtitle: '1 Bedroom Apartment',
    currentValue: 790215.24,
    changePercent: 13.93,
    icon: 'Neighbourhood',
  },
  {
    id: '3',
    name: 'Nvidia',
    subtitle: '18 NVDA',
    currentValue: 7120.93,
    changePercent: 153.66,
    icon: 'Cash',
  },
];

export const mockInsight = {
  title: 'By using the round-up feature, you could save',
  amount: 214.13,
  message: 'Investing that in BTC would earn you',
  investmentAmount: 423.58,
  trend: 1,
};

export const mockTopExpenses: ExpenseCategory[] = [
  {
    id: '1',
    name: 'Groceries',
    amount: 3112.53,
    percentage: 42,
    icon: 'Cart',
    color: '#74C648',
  },
  {
    id: '2',
    name: 'Rent',
    amount: 4150.0,
    percentage: 35,
    icon: 'City',
    color: '#AC66DA',
  },
  {
    id: '3',
    name: 'Restaurants',
    amount: 2988.19,
    percentage: 23,
    icon: 'CoffeeCup',
    color: '#D93F3F',
  },
];

