import { Transaction, Bill, Goal, Investment, ExpenseCategory, LatestExpense, LatestIncome, IncomeSource, PerformanceDataPoint, Category, InvestmentActivity, FinancialMilestone, DemographicComparison, MonthlySummaryRow, StatisticsSummaryItem, UserSettings, LoginHistoryEntry, Achievement, NotificationEntry, NotificationSettings } from '@/types/dashboard';

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
    category: 'Heating Bill',
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
    category: 'Home Internet',
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
    category: 'Home Internet',
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
    category: 'Restaurants',
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
    category: 'Electricity Bill',
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
    category: 'Water Bill',
    icon: 'Droplet',
  },
  {
    id: '18',
    name: 'Heating',
    date: 'Mar 10th 2024',
    amount: 120.00,
    category: 'Heating Bill',
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
  {
    id: '4',
    name: '4K 100" TV',
    targetDate: 'Mar 1st 2025',
    targetAmount: 2500,
    currentAmount: 1100,
    progress: 55.2,
  },
  {
    id: '5',
    name: 'New House',
    targetDate: 'Dec 31st 2026',
    targetAmount: 1000000,
    currentAmount: 241510,
    progress: 24.2,
  },
  {
    id: '6',
    name: 'New Desk',
    targetDate: 'Jan 15th 2025',
    targetAmount: 250,
    currentAmount: 250,
    progress: 100,
  },
  {
    id: '7',
    name: 'PlayStation 5',
    targetDate: 'Feb 1st 2025',
    targetAmount: 1000,
    currentAmount: 1000,
    progress: 100,
  },
  {
    id: '8',
    name: 'MacBook Pro',
    targetDate: 'Apr 30th 2025',
    targetAmount: 3500,
    currentAmount: 1200,
    progress: 34.3,
  },
  {
    id: '9',
    name: 'Wedding Fund',
    targetDate: 'Jun 1st 2026',
    targetAmount: 50000,
    currentAmount: 15000,
    progress: 30.0,
  },
  {
    id: '10',
    name: 'Car Down Payment',
    targetDate: 'Sep 1st 2025',
    targetAmount: 15000,
    currentAmount: 8500,
    progress: 56.7,
  },
  {
    id: '11',
    name: 'Home Renovation',
    targetDate: 'Dec 31st 2025',
    targetAmount: 75000,
    currentAmount: 25000,
    progress: 33.3,
  },
  {
    id: '12',
    name: 'Retirement Savings',
    targetDate: 'Dec 31st 2030',
    targetAmount: 500000,
    currentAmount: 125000,
    progress: 25.0,
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
    category: 'Restaurants',
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
    name: 'Restaurants',
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
      category: 'Restaurants',
      icon: 'Cart',
      month: 'January 2024',
    },
    {
      id: '3',
      name: 'Restaurants',
      date: 'Jan 3rd 2025',
      amount: 4000.00,
      category: 'Restaurants',
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
      category: 'Restaurants',
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

// Investments Page Mock Data
export const mockInvestmentsPage = {
  update: {
    date: 'Dec 25th 2024',
    message: 'Your investment portfolio grew 12% since last month',
    highlight: '12%',
    link: 'Statistics',
  },
  balance: {
    amount: 983591.44,
    trend: 42,
  },
  portfolio: [
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
      changePercent: -13.93,
      icon: 'Neighbourhood',
    },
    {
      id: '3',
      name: 'Nvidia',
      subtitle: '18 NVDA',
      currentValue: 7120.93,
      changePercent: -153.66,
      icon: 'Cash',
    },
    {
      id: '4',
      name: 'Google',
      subtitle: '25 GOOGL',
      currentValue: 3250.50,
      changePercent: -2.29,
      icon: 'Cash',
    },
    {
      id: '5',
      name: 'New Gold Inc.',
      subtitle: '100 NGD',
      currentValue: 1850.75,
      changePercent: -50.94,
      icon: 'Cash',
    },
    {
      id: '6',
      name: 'Tesla',
      subtitle: '10 TSLA',
      currentValue: 2450.30,
      changePercent: -15.66,
      icon: 'Cash',
    },
    {
      id: '7',
      name: 'Tether',
      subtitle: '5000 USDT',
      currentValue: 5000.00,
      changePercent: -0.01,
      icon: 'BitcoinCircle',
    },
    {
      id: '8',
      name: 'Ethereum',
      subtitle: '2.5 ETH',
      currentValue: 6250.25,
      changePercent: -29.21,
      icon: 'BitcoinCircle',
    },
    {
      id: '9',
      name: 'Uber Technologies',
      subtitle: '50 UBER',
      currentValue: 1850.00,
      changePercent: -9.33,
      icon: 'Cash',
    },
    {
      id: '10',
      name: 'Meta Platforms',
      subtitle: '15 META',
      currentValue: 6750.50,
      changePercent: -10.64,
      icon: 'Cash',
    },
    {
      id: '11',
      name: 'Apple Inc.',
      subtitle: '30 AAPL',
      currentValue: 5250.00,
      changePercent: 8.45,
      icon: 'Cash',
    },
    {
      id: '12',
      name: 'Microsoft',
      subtitle: '20 MSFT',
      currentValue: 8200.75,
      changePercent: 12.33,
      icon: 'Cash',
    },
    {
      id: '13',
      name: 'Amazon',
      subtitle: '15 AMZN',
      currentValue: 2450.25,
      changePercent: -5.67,
      icon: 'Cash',
    },
    {
      id: '14',
      name: 'Cardano',
      subtitle: '5000 ADA',
      currentValue: 3250.50,
      changePercent: 15.89,
      icon: 'BitcoinCircle',
    },
    {
      id: '15',
      name: 'Solana',
      subtitle: '100 SOL',
      currentValue: 18500.00,
      changePercent: 45.23,
      icon: 'BitcoinCircle',
    },
    {
      id: '16',
      name: 'Netflix',
      subtitle: '25 NFLX',
      currentValue: 12500.50,
      changePercent: -8.12,
      icon: 'Cash',
    },
    {
      id: '17',
      name: 'Disney',
      subtitle: '40 DIS',
      currentValue: 4200.75,
      changePercent: 3.45,
      icon: 'Cash',
    },
    {
      id: '18',
      name: 'JP Morgan',
      subtitle: '50 JPM',
      currentValue: 8750.25,
      changePercent: 7.89,
      icon: 'Cash',
    },
  ] as Investment[],
  performance: {
    trend: 14.1, // Percentage change calculated from first to last value
    trendText: '^$12,039.93',
    data: [
      { date: 'Dec 2024', value: 86000 },
      { date: 'Jan 2025', value: 88000 },
      { date: 'Feb 2025', value: 92000 },
      { date: 'Mar 2025', value: 95000 },
      { date: 'Apr 2025', value: 97000 },
      { date: 'May 2025', value: 98129.01 },
    ] as PerformanceDataPoint[],
  },
  recentActivities: [
    {
      id: '1',
      assetName: 'Bitcoin',
      date: 'May 1st 2025',
      change: '+0.021 BTC',
      changeType: 'positive',
      icon: 'BitcoinCircle',
    },
    {
      id: '2',
      assetName: 'Nvidia',
      date: 'Apr 29th 2025',
      change: '+0.001 BTC',
      changeType: 'positive',
      icon: 'BitcoinCircle',
    },
    {
      id: '3',
      assetName: 'Nvidia',
      date: 'Apr 28th 2025',
      change: '-1 NVDA',
      changeType: 'negative',
      icon: 'Cash',
    },
    {
      id: '4',
      assetName: 'Ethereum',
      date: 'Apr 25th 2025',
      change: '+0.394 ETH',
      changeType: 'positive',
      icon: 'BitcoinCircle',
    },
    {
      id: '5',
      assetName: 'New Gold Inc.',
      date: 'Apr 20th 2025',
      change: '-18 NGD',
      changeType: 'negative',
      icon: 'Cash',
    },
    {
      id: '6',
      assetName: 'Apple Inc.',
      date: 'Apr 18th 2025',
      change: '+5 AAPL',
      changeType: 'positive',
      icon: 'Cash',
    },
    {
      id: '7',
      assetName: 'Microsoft',
      date: 'Apr 15th 2025',
      change: '+10 MSFT',
      changeType: 'positive',
      icon: 'Cash',
    },
    {
      id: '8',
      assetName: 'Solana',
      date: 'Apr 12th 2025',
      change: '+25 SOL',
      changeType: 'positive',
      icon: 'BitcoinCircle',
    },
    {
      id: '9',
      assetName: 'Tesla',
      date: 'Apr 10th 2025',
      change: '-2 TSLA',
      changeType: 'negative',
      icon: 'Cash',
    },
    {
      id: '10',
      assetName: 'Cardano',
      date: 'Apr 8th 2025',
      change: '+1000 ADA',
      changeType: 'positive',
      icon: 'BitcoinCircle',
    },
    {
      id: '11',
      assetName: 'Google',
      date: 'Apr 5th 2025',
      change: '+8 GOOGL',
      changeType: 'positive',
      icon: 'Cash',
    },
    {
      id: '12',
      assetName: 'Netflix',
      date: 'Apr 3rd 2025',
      change: '-5 NFLX',
      changeType: 'negative',
      icon: 'Cash',
    },
  ] as InvestmentActivity[],
};

// Statistics Page Mock Data
export const mockStatisticsPage = {
  milestone: {
    date: 'Dec 25th 2024',
    message: 'Completed 5 goals this year.',
    completedGoals: 5,
  } as FinancialMilestone,
  demographicComparisons: [
    {
      id: '1',
      label: 'Average Income',
      comparison: '9% higher than others',
      icon: 'Wallet',
      iconColor: '#74C648',
    },
    {
      id: '2',
      label: 'Average Expenses',
      comparison: '12% lower than others',
      icon: 'ShoppingBag',
      iconColor: '#D93F3F',
    },
    {
      id: '3',
      label: 'Goal Success Rate',
      comparison: '4% lower than others',
      icon: 'Trophy',
      iconColor: '#FFA500',
    },
    {
      id: '4',
      label: 'Portfolio Balance',
      comparison: '121% higher than others',
      icon: 'BitcoinCircle',
      iconColor: '#FF8C00',
    },
    {
      id: '5',
      label: 'Financial Health',
      comparison: '4 points higher than others',
      icon: 'Heart',
      iconColor: '#AC66DA',
    },
  ] as DemographicComparison[],
  averageExpenses: [
    { id: '1', name: 'Rent', amount: 4000.00, icon: 'City', color: '#74C648' },
    { id: '2', name: 'Groceries', amount: 551.92, icon: 'Cart', color: '#AC66DA' },
    { id: '3', name: 'Restaurants', amount: 4000.00, icon: 'PizzaSlice', color: '#D93F3F' },
    { id: '4', name: 'Entertainment', amount: 551.92, icon: 'Skateboard', color: '#74C648' },
    { id: '5', name: 'Health & Fitness', amount: 4000.00, icon: 'Gym', color: '#D93F3F' },
    { id: '6', name: 'Technology', amount: 4000.00, icon: 'Tv', color: '#AC66DA' },
    { id: '7', name: 'Transportation', amount: 320.50, icon: 'Tram', color: '#74C648' },
    { id: '8', name: 'Electricity Bill', amount: 285.75, icon: 'Flash', color: '#AC66DA' },
    { id: '9', name: 'Clothing', amount: 450.00, icon: 'Shirt', color: '#D93F3F' },
    { id: '10', name: 'Insurance', amount: 650.00, icon: 'HelpCircle', color: '#74C648' },
    { id: '11', name: 'Education', amount: 1200.00, icon: 'Page', color: '#AC66DA' },
    { id: '12', name: 'Travel', amount: 850.00, icon: 'Airplane', color: '#D93F3F' },
  ],
  monthlySummary: [
    { month: 'Jan 2025', income: 43000, expenses: 35000, savings: 8000, topCategory: { name: 'Rent', percentage: 44 } },
    { month: 'Dec 2024', income: 43000, expenses: 35000, savings: 8000, topCategory: { name: 'Groceries', percentage: 40 } },
    { month: 'Nov 2024', income: 43000, expenses: 35000, savings: 8000, topCategory: { name: 'Groceries', percentage: 35 } },
    { month: 'Oct 2024', income: 43000, expenses: 35000, savings: 8000, topCategory: { name: 'Restaurants', percentage: 36 } },
    { month: 'Sep 2024', income: 43000, expenses: 35000, savings: 8000, topCategory: { name: 'Rent', percentage: 44 } },
    { month: 'Aug 2024', income: 43000, expenses: 35000, savings: 8000, topCategory: { name: 'Groceries', percentage: 40 } },
    { month: 'Jul 2024', income: 43000, expenses: 35000, savings: 8000, topCategory: { name: 'Groceries', percentage: 35 } },
    { month: 'Jun 2024', income: 43000, expenses: 35000, savings: 8000, topCategory: { name: 'Restaurants', percentage: 36 } },
  ] as MonthlySummaryRow[],
  summary: {
    items: [
      {
        id: '1',
        label: 'Income',
        value: 151349,
        change: '+35% from beginning',
        icon: 'Wallet',
        iconColor: '#74C648',
      },
      {
        id: '2',
        label: 'Expenses',
        value: 92890,
        change: '+35% from beginning',
        icon: 'ShoppingBag',
        iconColor: '#D93F3F',
      },
      {
        id: '3',
        label: 'Income Saved',
        value: 58459,
        change: '+35% from beginning',
        icon: 'LotOfCash',
        iconColor: '#4A90E2',
      },
      {
        id: '4',
        label: 'Goals Success Rate',
        value: '71.4%',
        change: '+35% from beginning',
        icon: 'Trophy',
        iconColor: '#FFA500',
      },
      {
        id: '5',
        label: 'Portfolio Balance',
        value: 983591,
        change: '+35% from beginning',
        icon: 'BitcoinCircle',
        iconColor: '#FF8C00',
      },
      {
        id: '6',
        label: 'Financial Health Score',
        value: '81/100',
        change: '',
        icon: 'Heart',
        iconColor: '#AC66DA',
        isLarge: true,
        link: 'Learn how we calculate the financial health score >',
      },
    ] as StatisticsSummaryItem[],
  },
};

export const mockUserSettings: UserSettings = {
  name: '',
  username: '',
  email: '',
  jobPosition: '',
  age: 0,
  country: '',
  language: 'English',
  currency: '$ USD',
  dateOfBirth: '',
  profession: '',
  defaultPage: 'Dashboard',
  plan: 'basic',
  incomeTaxRate: null,
};

export const mockLoginHistory: LoginHistoryEntry[] = [
  { date: '22.01.2023', time: '20:32:10', device: 'iPhone 16 Pro', location: '—' },
  { date: '22.01.2023', time: '20:30:15', device: 'iPhone 16 Pro', location: '—' },
  { date: '21.01.2023', time: '14:09:29', device: 'Desktop PC', location: '—' },
  { date: '20.01.2023', time: '18:45:16', device: 'iPhone 16 Pro', location: '—' },
  { date: '19.01.2023', time: '10:22:33', device: 'Desktop PC', location: '—' },
  { date: '18.01.2023', time: '16:55:42', device: 'iPhone 16 Pro', location: '—' },
  { date: '17.01.2023', time: '09:11:28', device: 'Desktop PC', location: '—' },
];

export const mockAchievements: Achievement[] = [
  { id: '1', name: 'First Savings', unlocked: true, icon: 'LotOfCash' },
  { id: '2', name: 'Goal Achiever', unlocked: true, icon: 'LotOfCash' },
  { id: '3', name: 'Budget Master', unlocked: true, icon: 'LotOfCash' },
  { id: '4', name: 'Investment Starter', unlocked: true, icon: 'LotOfCash' },
  { id: '5', name: 'Consistent Saver', unlocked: true, icon: 'LotOfCash' },
  { id: '6', name: 'Millionaire', unlocked: false, icon: 'LotOfCash' },
  { id: '7', name: 'Early Retiree', unlocked: false, icon: 'LotOfCash' },
  { id: '8', name: 'Debt Free', unlocked: false, icon: 'LotOfCash' },
  { id: '9', name: 'Financial Guru', unlocked: false, icon: 'LotOfCash' },
  { id: '10', name: 'Wealth Builder', unlocked: false, icon: 'LotOfCash' },
  { id: '11', name: 'Smart Investor', unlocked: false, icon: 'LotOfCash' },
  { id: '12', name: 'Expense Tracker', unlocked: false, icon: 'LotOfCash' },
];

export const mockNotifications: NotificationEntry[] = [
  { 
    id: '1', 
    date: '22.01.2023', 
    time: '20:32:10', 
    type: 'Upcoming Bills', 
    text: 'Your Netflix Subscription is due in 1 day' 
  },
  { 
    id: '2', 
    date: '22.01.2023', 
    time: '18:15:42', 
    type: 'Goal Update', 
    text: "You're halfway there to reaching your savings goal!" 
  },
  { 
    id: '3', 
    date: '21.01.2023', 
    time: '14:28:55', 
    type: 'Upcoming Income', 
    text: 'Almost there! Less than 100$ left in your budget' 
  },
  { 
    id: '4', 
    date: '21.01.2023', 
    time: '10:45:30', 
    type: 'Upcoming Income', 
    text: 'You will receive $1,400 next week!' 
  },
  { 
    id: '5', 
    date: '20.01.2023', 
    time: '16:20:15', 
    type: 'Investments', 
    text: 'Your Bitcoin portfolio increased by 5.2%' 
  },
  { 
    id: '6', 
    date: '20.01.2023', 
    time: '09:10:05', 
    type: 'Goals', 
    text: 'Congratulations! You completed your emergency fund goal' 
  },
  { 
    id: '7', 
    date: '19.01.2023', 
    time: '22:05:18', 
    type: 'AI Insights', 
    text: 'New spending pattern detected: Consider reviewing your subscription costs' 
  },
  { 
    id: '8', 
    date: '19.01.2023', 
    time: '11:30:00', 
    type: 'Upcoming Bills', 
    text: 'Electricity bill of $85.50 is due in 3 days' 
  },
];

export const mockDeletedNotifications: NotificationEntry[] = [
  { 
    id: 'd1', 
    date: '18.01.2023', 
    time: '15:22:33', 
    type: 'Upcoming Bills', 
    text: 'Your Netflix Sub...' 
  },
  { 
    id: 'd2', 
    date: '17.01.2023', 
    time: '12:10:20', 
    type: 'Goal Update', 
    text: "You're halfway t..." 
  },
  { 
    id: 'd3', 
    date: '16.01.2023', 
    time: '08:45:10', 
    type: 'Upcoming Income', 
    text: 'Almost there! Le...' 
  },
  { 
    id: 'd4', 
    date: '15.01.2023', 
    time: '19:30:45', 
    type: 'Upcoming Income', 
    text: 'You will recieve...' 
  },
];

export const mockNotificationSettings: NotificationSettings = {
  pushNotifications: true,
  upcomingBills: true,
  upcomingIncome: true,
  investments: true,
  goals: true,
  promotionalEmail: true,
  aiInsights: true,
};

