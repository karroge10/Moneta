import { Transaction, Bill, Goal, Investment, ExpenseCategory, LatestExpense, LatestIncome, IncomeSource, PerformanceDataPoint, Category } from '@/types/dashboard';

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
    name: 'Transfer to James',
    date: 'Dec 2nd 2024',
    amount: 101.39,
    category: null,
    icon: 'HelpCircle',
  },
  {
    id: '2',
    name: 'Walmart 12th Ave',
    date: 'Dec 2nd 2024',
    amount: 51.91,
    category: 'Groceries',
    icon: 'Cart',
  },
  {
    id: '3',
    name: "World's End LLC",
    date: 'Dec 2nd 2024',
    amount: 398.40,
    category: null,
    icon: 'HelpCircle',
  },
  {
    id: '4',
    name: 'AMC Cinema',
    date: 'Dec 2nd 2024',
    amount: 1256.77,
    category: 'Entertainment',
    icon: 'Tv',
  },
  {
    id: '5',
    name: 'Gym Fitland',
    date: 'Dec 2nd 2024',
    amount: 245.39,
    category: 'Fitness',
    icon: 'Gym',
  },
  {
    id: '6',
    name: 'IKEA Becker St',
    date: 'Dec 2nd 2024',
    amount: 18.92,
    category: null,
    icon: 'HelpCircle',
  },
  {
    id: '7',
    name: 'Uber Taxi Payment',
    date: 'Dec 2nd 2024',
    amount: 99.99,
    category: 'Transportation',
    icon: 'Tram',
  },
  {
    id: '8',
    name: 'Silknet LLC',
    date: 'Dec 2nd 2024',
    amount: 45.00,
    category: 'Utilities',
    icon: 'Wifi',
  },
  {
    id: '9',
    name: 'H&M',
    date: 'Jan 15th 2024',
    amount: 150.99,
    category: 'Clothes',
    icon: 'Shirt',
  },
  {
    id: '10',
    name: 'Starbucks',
    date: 'Jan 14th 2024',
    amount: 5.50,
    category: 'Food',
    icon: 'CoffeeCup',
  },
  {
    id: '11',
    name: 'Rent Payment',
    date: 'Jan 5th 2024',
    amount: 1200.00,
    category: 'Rent',
    icon: 'City',
  },
  {
    id: '12',
    name: 'Electricity Bill',
    date: 'Jan 3rd 2024',
    amount: 85.20,
    category: 'Utilities',
    icon: 'Flash',
  },
  {
    id: '13',
    name: 'Unknown Transaction',
    date: 'Feb 10th 2024',
    amount: 250.00,
    category: null,
    icon: 'HelpCircle',
  },
  {
    id: '14',
    name: 'Grocery Store',
    date: 'Feb 8th 2024',
    amount: 125.50,
    category: 'Groceries',
    icon: 'Cart',
  },
  {
    id: '15',
    name: 'Restaurant',
    date: 'Feb 5th 2024',
    amount: 45.75,
    category: 'Restaurants',
    icon: 'PizzaSlice',
  },
  {
    id: '16',
    name: 'Gift Shop',
    date: 'Mar 20th 2024',
    amount: 30.00,
    category: 'Gifts',
    icon: 'Gift',
  },
  {
    id: '17',
    name: 'Water Bill',
    date: 'Mar 15th 2024',
    amount: 35.00,
    category: 'Utilities',
    icon: 'Droplet',
  },
  {
    id: '18',
    name: 'Heating',
    date: 'Mar 10th 2024',
    amount: 120.00,
    category: 'Utilities',
    icon: 'FireFlame',
  },
];

export const mockCategories: Category[] = [
  { id: '1', name: 'Rent', icon: 'City', color: '#74C648' },
  { id: '2', name: 'Entertainment', icon: 'Tv', color: '#74C648' },
  { id: '3', name: 'Restaurants', icon: 'PizzaSlice', color: '#D93F3F' },
  { id: '4', name: 'Furniture', icon: 'Sofa', color: '#74C648' },
  { id: '5', name: 'Groceries', icon: 'Cart', color: '#AC66DA' },
  { id: '6', name: 'Gifts', icon: 'Gift', color: '#D93F3F' },
  { id: '7', name: 'Fitness', icon: 'Gym', color: '#D93F3F' },
  { id: '8', name: 'Water Bill', icon: 'Droplet', color: '#AC66DA' },
  { id: '9', name: 'Technology', icon: 'Tv', color: '#74C648' },
  { id: '10', name: 'Electricity Bill', icon: 'Flash', color: '#AC66DA' },
  { id: '11', name: 'Clothes', icon: 'Shirt', color: '#AC66DA' },
  { id: '12', name: 'Elevator & Cleaning Bill', icon: 'City', color: '#74C648' },
  { id: '13', name: 'Transportation', icon: 'Tram', color: '#74C648' },
  { id: '14', name: 'Heating Bill', icon: 'FireFlame', color: '#D93F3F' },
  { id: '15', name: 'Home Internet', icon: 'Wifi', color: '#AC66DA' },
  { id: '16', name: 'Taxes in Georgia', icon: 'Cash', color: '#74C648' },
  { id: '17', name: 'Mobile Data', icon: 'SmartphoneDevice', color: '#D93F3F' },
  { id: '18', name: 'Taxes in USA', icon: 'Cash', color: '#74C648' },
  { id: '19', name: 'Food', icon: 'CoffeeCup', color: '#AC66DA' },
  { id: '20', name: 'Utilities', icon: 'Flash', color: '#AC66DA' },
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

// Empty state data (new user)
export const emptyIncome = {
  amount: 0,
  trend: 0,
};

export const emptyExpenses = {
  amount: 0,
  trend: 0,
};

export const emptyUpdate = {
  date: 'Welcome!',
  message: 'Get started by adding your first transaction or connecting your bank account.',
  highlight: '',
  link: 'Get Started',
};

export const emptyBills: Bill[] = [];
export const emptyTransactions: Transaction[] = [];
export const emptyGoals: Goal[] = [];
export const emptyFinancialHealth = 0;
export const emptyInvestments: Investment[] = [];
export const emptyInsight = {
  title: 'Start tracking your finances',
  amount: 0,
  message: 'Add transactions to see insights here',
  investmentAmount: 0,
  trend: 0,
};
export const emptyTopExpenses: ExpenseCategory[] = [];

// Minimal content data (user with some data)
export const minimalIncome = {
  amount: 3500,
  trend: 0,
};

export const minimalExpenses = {
  amount: 1200,
  trend: 0,
};

export const minimalUpdate = {
  date: 'Jan 1st 2025',
  message: 'You\'ve added your first transaction! Keep going to see more insights.',
  highlight: 'first transaction',
  link: 'Add More',
};

export const minimalBills: Bill[] = [
  {
    id: '1',
    name: 'Netflix',
    date: 'Jan 15th 2025',
    amount: 15.99,
    category: 'Entertainment',
    icon: 'Tv',
  },
];

export const minimalTransactions: Transaction[] = [
  {
    id: '1',
    name: 'Coffee Shop',
    date: 'Dec 30th 2024',
    amount: 4.50,
    category: 'Food',
    icon: 'CoffeeCup',
  },
  {
    id: '2',
    name: 'Grocery Store',
    date: 'Dec 28th 2024',
    amount: 85.20,
    category: 'Shopping',
    icon: 'Cart',
  },
];

export const minimalGoals: Goal[] = [
  {
    id: '1',
    name: 'Emergency Fund',
    targetDate: 'Dec 31st 2025',
    targetAmount: 10000,
    currentAmount: 500,
    progress: 5.0,
  },
];

export const minimalFinancialHealth = 45;
export const minimalInvestments: Investment[] = [];
export const minimalInsight = {
  title: 'You\'re on the right track!',
  amount: 12.50,
  message: 'Add more transactions to see personalized insights',
  investmentAmount: 0,
  trend: 0,
};
export const minimalTopExpenses: ExpenseCategory[] = [
  {
    id: '1',
    name: 'Groceries',
    amount: 85.20,
    percentage: 95,
    icon: 'Cart',
    color: '#74C648',
  },
  {
    id: '2',
    name: 'Food',
    amount: 4.50,
    percentage: 5,
    icon: 'CoffeeCup',
    color: '#AC66DA',
  },
];

// Expenses Page Mock Data
export const mockExpensesPage = {
  total: {
    amount: 23700.93,
    trend: 11,
  },
  averageMonthly: {
    amount: 4612.16,
    trend: 20,
  },
  update: {
    date: 'Dec 25th 2024',
    message: 'You have uncategorized expenses. Assign for more accurate tracking',
    highlight: 'uncategorized expenses',
    link: 'Transactions',
  },
  latestExpenses: [
    {
      id: '1',
      name: 'Rent',
      date: 'Jan 5th 2025',
      amount: 4000.00,
      category: 'Housing',
      icon: 'City',
      month: 'January 2024',
    },
    {
      id: '2',
      name: 'Groceries',
      date: 'Jan 4th 2025',
      amount: 551.92,
      category: 'Food',
      icon: 'Cart',
      month: 'January 2024',
    },
    {
      id: '3',
      name: 'Restaurants',
      date: 'Jan 3rd 2025',
      amount: 4000.00,
      category: 'Food',
      icon: 'PizzaSlice',
      month: 'January 2024',
    },
    {
      id: '4',
      name: 'Entertainment',
      date: 'Jan 2nd 2025',
      amount: 551.92,
      category: 'Entertainment',
      icon: 'Skateboard',
      month: 'January 2024',
    },
    {
      id: '5',
      name: 'Health & Fitness',
      date: 'Jan 1st 2025',
      amount: 4000.00,
      category: 'Health',
      icon: 'Gym',
      month: 'January 2024',
    },
    {
      id: '6',
      name: 'Groceries',
      date: 'Dec 28th 2024',
      amount: 450.00,
      category: 'Food',
      icon: 'Cart',
      month: 'April 2025',
    },
    {
      id: '7',
      name: 'Rent',
      date: 'Dec 25th 2024',
      amount: 4000.00,
      category: 'Housing',
      icon: 'City',
      month: 'April 2025',
    },
  ] as LatestExpense[],
  performance: {
    trend: 11,
    trendText: 'Your income grew +11% over selected time period',
    data: [
      { date: 'Dec 2024', value: 4200 },
      { date: 'Jan 2025', value: 4500 },
      { date: 'Feb 2025', value: 4800 },
      { date: 'Mar 2025', value: 4600 },
      { date: 'Apr 2025', value: 4900 },
      { date: 'May 2025', value: 5100 },
    ] as PerformanceDataPoint[],
  },
  topCategories: [
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
      amount: 4150.00,
      percentage: 35,
      icon: 'City',
      color: '#AC66DA',
    },
    {
      id: '3',
      name: 'Restaurants',
      amount: 2988.19,
      percentage: 23,
      icon: 'PizzaSlice',
      color: '#D93F3F',
    },
  ] as ExpenseCategory[],
  demographicComparison: {
    message: 'Your average expenses are 12% lower than of users in your region. Great job!',
    percentage: 12,
    percentageLabel: '12%',
    link: 'Statistics',
  },
  insight: {
    title: 'By using the round-up feature, you could save',
    amount: 214.13,
    message: 'Investing that in BTC would earn you',
    investmentAmount: 423.58,
    trend: 1,
  },
};

// Income Page Mock Data
export const mockIncomePage = {
  total: {
    amount: 39700.93,
    trend: 11,
  },
  estimatedTax: {
    amount: 682.79,
    isEnabled: true,
  },
  average: {
    amount: 4612.16,
    trend: 20,
    subtitle: 'Monthly average based on selected time period',
  },
  update: {
    date: 'Dec 25th 2024',
    message: 'YouTube revenue increased 50% since last month',
    highlight: '50%',
    link: 'Statistics',
  },
  upcomingIncomes: [
    {
      id: '1',
      name: 'Job Salary',
      date: 'Jan 5th 2025',
      amount: 4551.92,
      category: 'Salary',
      icon: 'Suitcase',
    },
    {
      id: '2',
      name: 'YouTube Sponsorship',
      date: 'Jan 23rd 2025',
      amount: 850.08,
      category: 'Freelance',
      icon: 'Globe',
    },
  ] as Transaction[],
  latestIncomes: [
    {
      id: '1',
      name: 'Job Salary',
      date: 'May 5th 2025',
      amount: 4000.00,
      category: 'Salary',
      icon: 'Suitcase',
      month: 'May 2025',
    },
    {
      id: '2',
      name: 'YouTube Sponsorship',
      date: 'May 4th 2025',
      amount: 551.92,
      category: 'Freelance',
      icon: 'Globe',
      month: 'May 2025',
    },
    {
      id: '3',
      name: 'Gift from Grandma',
      date: 'May 1st 2025',
      amount: 100.00,
      category: 'Gift',
      icon: 'Gift',
      month: 'May 2025',
    },
    {
      id: '4',
      name: 'Job Salary',
      date: 'Apr 5th 2025',
      amount: 4000.00,
      category: 'Salary',
      icon: 'Suitcase',
      month: 'April 2025',
    },
    {
      id: '5',
      name: 'YouTube Sponsorship',
      date: 'Apr 4th 2025',
      amount: 551.92,
      category: 'Freelance',
      icon: 'Globe',
      month: 'April 2025',
    },
    {
      id: '6',
      name: 'Job Salary',
      date: 'Mar 5th 2025',
      amount: 5294.14,
      category: 'Salary',
      icon: 'Suitcase',
      month: 'March 2025',
    },
  ] as LatestIncome[],
  performance: {
    trend: 11,
    trendText: 'Your income grew +11% over selected time period',
    data: [
      { date: 'Dec 2024', value: 4200 },
      { date: 'Jan 2025', value: 4500 },
      { date: 'Feb 2025', value: 4800 },
      { date: 'Mar 2025', value: 4600 },
      { date: 'Apr 2025', value: 4900 },
      { date: 'May 2025', value: 5100 },
    ] as PerformanceDataPoint[],
  },
  topSources: [
    {
      id: '1',
      name: 'Job Salary',
      amount: 4551.92,
      percentage: 69,
      icon: 'Suitcase',
      color: '#AC66DA',
    },
    {
      id: '2',
      name: 'YouTube Sponsorship',
      amount: 850.08,
      percentage: 31,
      icon: 'Globe',
      color: '#74C648',
    },
  ] as IncomeSource[],
  demographicComparison: {
    message: 'Your average income is 75% higher than of users in your region. Great job!',
    percentage: 75,
    percentageLabel: '75%',
    link: 'Statistics',
  },
};

