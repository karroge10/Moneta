---
trigger: always_on
---

# MONETA Design System — Style Rules

## Typography
- Primary Font: "Sen"
- Page Title: 36px, weight 700
- Sidebar Menu Section Labels (caps): 24px, 700, letter-spacing: 15%
- Sidebar Buttons: 20px, 600
- Card Header: 20px, 600
- Card Main Value (large): 48px, 700
- Card Main Value Currency Symbol: 30px, 600
- Card Body Text (primary): 16px, 400–50ca0
- Card Description / Helper Text: 14px, 400, 70% opacity
- Financial Health Key Number: 90px, 700

General Text Rules:
- Tight but readable line height (1.1–1.3 depending on role)
- Currency values always show "$" before amount
- Avoid overly rounded fonts or any serif fonts

## Color System
- Background Primary: #202020
- Sidebar Background: #282828
- Card Background: #282828
- Text Primary: #E7E4E4
- Text Secondary: rgba(231, 228, 228, 0.7)
- Success/Green: #74C648
- Accent Purple: #AC66DA
- Purple UI Glow/Frost Accent: rgba(163, 102, 203, 0.5)
- Error/Red: #D93F3F

Contrast & Visual Behavior:
- No pure white; use #E7E4E4 for light text
- Dark theme only; no light theme variants
- Purple accent should be subtle & never overpower content

## Layout & Spacing
- Consistent vertical rhythm
- Breathing space around stats
- Prefer stacked card layout with grid alignment
- Spacing scale: XS 4px, S 8px, M 16px, L 24px, XL 32px; page gutter 24–32px

## Components
Cards
- Background: #282828
- Corner radius: 30px
- Padding: 24px
- Maintain clear section separation
- Shadows minimal or none

Sidebar
- Dark panel (#282828)
- Generous logo spacing at top
- Menu has uppercase section title + navigation items

Buttons
- Rounded, clean
- Filled buttons use accent colors (green/purple)
- Text always in Sen
- Do not use gray shades outside palette

Charts & Data Display
- Minimal lines, clean look
- Progress arcs & bars use: Green (#74C648), Purple (#AC66DA), Red (#D93F3F) for negative
- Background grid faint or non-existent

Tables (data tables)
- Container: Use a Card or a div with card-like spacing. Inner table wrapper: rounded-3xl border border-[#3a3a3a] overflow-hidden, background #202020.
- Header: thead — text-left text-xs uppercase tracking-wide, color #9CA3AF; th padding px-5 py-3, align-top. Sortable headers: cursor-pointer, hover to #E7E4E4.
- Body: tbody — row separator border-t border-[#2A2A2A]; cells px-5 py-4 align-top, text-sm; row hover hover:opacity-80 transition-opacity; optional cursor-pointer for clickable rows.
- Loading: Skeleton rows with animate-pulse, placeholder bg #3a3a3a.
- Empty state: Centered text, text-secondary, sufficient min-height. All app data tables must follow this pattern for visual unity.

Modals / Popups
- Overlay: fixed inset-0 bg-black/60 z-50, click to close; optional animate-in fade-in duration-200.
- Wrapper: fixed inset-0 z-50 flex items-center justify-center p-4, click on wrapper (event.target === currentTarget) to close.
- Panel: max-w-2xl (or max-w-3xl where needed) max-h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col, backgroundColor: var(--bg-surface).
- Header: flex items-center justify-between p-6 border-b border-[#3a3a3a]; title text-card-header; close button rounded-full, hover purple.
- Body: Scrollable overflow-y-auto, padding p-6 (and pb-8 if needed). Escape key and outside click close. All app modals/dialogs must follow this pattern.
- Do not use one-off table or modal styles that diverge from these (no custom borders, radii, or colors for tables/modals).

## Iconography & Badges
- Use rounded soft icons, not sharp edges
- Dot notification badges = Purple glow (#A366CB @ 50%)

### Icons — iconoir-react

- Library: iconoir-react
- Import as React components and keep a consistent visual weight.
- Recommended: strokeWidth={1.5}, width/height=20–24, color inherits currentColor.

Usage example:

import {
  HomeSimpleDoor,
  Wallet,
  ShoppingBag,
  LotOfCash,
  BitcoinCircle,
  CalendarCheck,
  Reports,
  Settings,
  Bell,
  HeadsetHelp,
  Crown,
  LogOut,
  LogIn,
  HalfMoon,
  SunLight,
  StatUp,
  StatDown,
  Language,
  NavArrowRight,
  NavArrowLeft,
  Search,
  Shirt,
  User,
  CoffeeCup,
  PizzaSlice,
  Skateboard,
  Gym,
  Airplane,
  Cart,
  Tv,
  Sofa,
  FireFlame,
  Droplet,
  Flash,
  Wifi,
  SmartphoneDevice,
  Neighbourhood,
  Tram,
  Cash,
  City,
  Gift,
  Spark,
  Sparks,
  CheckCircle,
  InfoCircle,
  HelpCircle,
  Menu,
  Plus,
  Minus,
  Trash,
} from 'iconoir-react';

export function ExampleIcon() {
  return <HomeSimpleDoor width={24} height={24} strokeWidth={1.5} />;
}

Mappings (use these exact components):

- Dashboard: HomeSimpleDoor
- Income: Wallet
- Expense: ShoppingBag
- Transactions: LotOfCash
- Investments: BitcoinCircle
- Goals: CalendarCheck
- Statistics: Reports
- Settings: Settings
- Notifications: Bell
- Help Center: HeadsetHelp
- Pricing: Crown
- Log out: LogOut
- Log in: LogIn
- Dark: HalfMoon
- Light: SunLight

- Uptrend: StatUp
- Downtrend: StatDown
- Language: Language
- Right arrow: NavArrowRight

- Sidebar open: NavArrowRight
- Sidebar close: NavArrowLeft
- Search: Search

- Shirt: Shirt
- User: User
- Coffee: CoffeeCup
- Food: PizzaSlice
- Activities/Entertainment: Skateboard  
  Note: Use Skateboard (iconoir naming), not "Skateboarding".
- Gym: Gym
- Flights: Airplane
- Shopping: Cart
- Tech: Tv
- Furniture: Sofa
- Gas/Heating: FireFlame
- Water: Droplet
- Electricity: Flash
- Internet: Wifi
- Phone: SmartphoneDevice
- Property: Neighbourhood
- Crypto: BitcoinCircle
- Transportation: Tram
- Stocks: Cash
- Rent: City
- Gift: Gift
- Job: Suitcase
- Subscription: RefreshDouble

- AI: Prefer Spark; Sparks is acceptable for emphasis
- Affordances/Status: CheckCircle, InfoCircle, HelpCircle, Menu, Plus, Minus, Trash

## Motion/UX Guidelines
- Smooth fade/slide transitions
- No bounce animations
- Data cards appear “calm”, stable

## Tone & UI Copy
- Encouraging but not childish
- Insightful, personal finance tone
- Short, directive microcopy
- Avoid slang; keep pro-finance feel

## Don’ts
- ❌ No bright neon colors
- ❌ No sharp corners (all surfaces should feel “soft”)
- ❌ No serif fonts
- ❌ No thin unreadable fonts

---

## Implementation Guidance

### Global CSS variables
Use CSS variables in :root to align tokens with Tailwind utilities and custom styles.

:root {
  /* Colors */
  --bg-primary: #202020;
  --bg-surface: #282828;
  --text-primary: #E7E4E4;
  --text-secondary: rgba(231, 228, 228, 0.7);
  --accent-green: #74C648;
  --accent-purple: #AC66DA;
  --accent-purple-glow: rgba(163, 102, 203, 0.5);
  --error: #D93F3F;

  /* Radii & spacing */
  --radius-card: 30px;
  --space-xs: 4px;
  --space-s: 8px;
  --space-m: 16px;
  --space-l: 24px;
  --space-xl: 32px;
}

html, body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

### Typography utilities
Apply the "Sen" font as the primary font via next/font/google and set sizing utilities:

.text-page-title { font-size: 36px; font-weight: 700; line-height: 1.2; }
.text-sidebar-section { font-size: 24px; font-weight: 700; letter-spacing: 0.15em; }
.text-sidebar-button { font-size: 20px; font-weight: 600; }
.text-card-header { font-size: 20px; font-weight: 600; }
.text-card-value { font-size: 48px; font-weight: 700; line-height: 1.1; }
.text-card-currency { font-size: 30px; font-weight: 600; }
.text-body { font-size: 16px; font-weight: 400; }
.text-helper { font-size: 12px; font-weight: 400; opacity: 0.7; }
.text-fin-health-key { font-size: 90px; font-weight: 700; line-height: 1.1; }

### Card surface

.card-surface {
  background: var(--bg-surface);
  border-radius: var(--radius-card);
  padding: var(--space-l);
}

### Button styles

.btn {
  border-radius: 9999px;
  font-family: var(--font-sen, "Sen", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif);
}
.btn-primary { background: var(--accent-purple); color: var(--text-primary); }
.btn-success { background: var(--accent-green); color: var(--text-primary); }
.btn-danger { background: var(--error); color: var(--text-primary); }

### Badge with purple glow

.badge-glow {
  background: var(--accent-purple-glow);
  border-radius: 9999px;
}

### Table container (data tables)

.table-container {
  border-radius: var(--radius-card);
  border: 1px solid #3a3a3a;
  overflow: hidden;
  background: #202020;
}
.table-container thead tr { color: #9CA3AF; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.table-container th { padding: 12px 20px; vertical-align: top; }
.table-container tbody tr { border-top: 1px solid #2A2A2A; }
.table-container td { padding: 16px 20px; vertical-align: top; font-size: 14px; }

### Modal panel

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 50; }
.modal-panel { max-width: 32rem; max-height: 94vh; border-radius: var(--radius-card); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; background: var(--bg-surface); }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 24px; border-bottom: 1px solid #3a3a3a; }

---

## Asset Conventions

- Favicons and PWA manifest live in /public and are wired via Next.js metadata.
- App logo lives in /public/monetalogo.png and can be imported via Next.js Image or used in metadata as an additional icon.