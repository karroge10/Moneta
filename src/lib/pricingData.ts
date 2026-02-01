export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: string; // iconoir-react icon name
}

export interface PricingFeature {
  text: string;
  included: boolean;
}

export interface PricingTier {
  id: 'basic' | 'premium' | 'ultimate';
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  tagline: string;
  features: PricingFeature[];
  ctaText: string;
  isCurrentPlan?: boolean;
  hasDiscount?: boolean;
  discountPercent?: number;
}

export interface ComparisonFeature {
  name: string;
  basic: string | boolean;
  premium: string | boolean;
  ultimate: string | boolean;
}

export const featureCards: FeatureCard[] = [
  {
    id: '1',
    title: 'Advanced Statistics',
    description: 'Gain deeper insights with detailed analytics on your spending and income.',
    icon: 'Reports',
  },
  {
    id: '2',
    title: 'Priority Support',
    description: 'Get priority support to help you with any inquires you have.',
    icon: 'Clock',
  },
  {
    id: '3',
    title: 'Data Import & Export',
    description: 'Easily transfer your financial data across devices and platforms.',
    icon: 'Download',
  },
  {
    id: '4',
    title: 'Assets Notifications',
    description: 'Stay updated on your investments to track market changes and portfolio performance.',
    icon: 'LightBulb',
  },
];

export const pricingTiers: PricingTier[] = [
  {
    id: 'basic',
    name: 'Basic Plan',
    monthlyPrice: 0,
    yearlyPrice: 0,
    tagline: 'Perfect for getting started.',
    features: [
      { text: 'Track Income & Expenses', included: true },
      { text: 'Unlimited Transactions', included: true },
      { text: 'Basic Statistics', included: true },
      { text: '20 Custom Categories', included: true },
      { text: '10 Investments Tracked', included: true },
      { text: '5 Round-Up Assets Tracked', included: true },
      { text: '3 Active Financial Goals', included: true },
    ],
    ctaText: 'Get Started',
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    monthlyPrice: 4.99,
    yearlyPrice: 3.99, // 20% discount: 4.99 * 0.8 = 3.99
    tagline: 'Ideal for growing your finances.',
    features: [
      { text: 'Everything in Basic Plan', included: true },
      { text: 'Advanced Statistics', included: true },
      { text: 'Investments Notifications', included: true },
      { text: 'Custom Category Icons', included: true },
      { text: '50 Custom Categories', included: true },
      { text: '25 Tracked Investments', included: true },
      { text: '10 Round-Up Assets Tracked', included: true },
      { text: '10 Active Financial Goals', included: true },
      { text: 'Priority Support', included: true },
    ],
    ctaText: 'Upgrade',
  },
  {
    id: 'ultimate',
    name: 'Ultimate Plan',
    monthlyPrice: 7.99,
    yearlyPrice: 6.39, // 20% discount: 7.99 * 0.8 = 6.39
    tagline: 'Designed for advanced users.',
    hasDiscount: true,
    discountPercent: 30,
    features: [
      { text: 'Everything in Premium Plan', included: true },
      { text: 'Weekly & Monthly Reports', included: true },
      { text: 'Data Import & Export', included: true },
      { text: 'Early Access to New Features', included: true },
      { text: 'Unlimited Custom Categories', included: true },
      { text: 'Unlimited Tracked Investments', included: true },
      { text: 'Unlimited Tracked Round-Up Assets', included: true },
      { text: 'Unlimited Active Financial Goals', included: true },
      { text: 'Exclusive Discord Role', included: true },
      { text: '24/7 Priority Support', included: true },
    ],
    ctaText: 'Upgrade',
  },
];

export const comparisonFeatures: ComparisonFeature[] = [
  {
    name: 'Track Income & Expenses',
    basic: true,
    premium: true,
    ultimate: true,
  },
  {
    name: 'Unlimited Transactions',
    basic: true,
    premium: true,
    ultimate: true,
  },
  {
    name: 'Basic Statistics',
    basic: true,
    premium: true,
    ultimate: true,
  },
  {
    name: 'Advanced Statistics',
    basic: false,
    premium: true,
    ultimate: true,
  },
  {
    name: 'Investments Notifications',
    basic: false,
    premium: true,
    ultimate: true,
  },
  {
    name: 'Custom Category Icons',
    basic: false,
    premium: true,
    ultimate: true,
  },
  {
    name: 'Weekly & Monthly Reports',
    basic: false,
    premium: false,
    ultimate: true,
  },
  {
    name: 'Data Import & Export',
    basic: false,
    premium: false,
    ultimate: true,
  },
  {
    name: 'Early Access to New Features',
    basic: false,
    premium: false,
    ultimate: true,
  },
  {
    name: 'Financial Goals',
    basic: '3 active max',
    premium: '10 active max',
    ultimate: 'Unlimited',
  },
  {
    name: 'Categories',
    basic: '20 max',
    premium: '50 max',
    ultimate: 'Unlimited',
  },
  {
    name: 'Tracked Investments',
    basic: '10 max',
    premium: '25 max',
    ultimate: 'Unlimited',
  },
  {
    name: 'Round-Up Insights',
    basic: '5 tracked assets',
    premium: '10 tracked assets',
    ultimate: 'Unlimited',
  },
  {
    name: 'Priority Support',
    basic: false,
    premium: true,
    ultimate: '24/7 Support',
  },
  {
    name: 'Exclusive Discord Role',
    basic: false,
    premium: false,
    ultimate: true,
  },
];

