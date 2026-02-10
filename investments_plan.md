# Investment Module Upgrade Plan

This document tracks the evolution of the Moneta Investment module from a simple snapshot view to a comprehensive portfolio management suite.

## 🎯 Vision
Transform the Investments page into a premium, data-driven experience that provides historical context, asset diversification, and actionable notifications.

---

## 🏗️ Phase 1: Infrastructure & Current Insights (High Priority)
*Goal: Establish the data foundation and provide immediate visual value.*

- [x] **Database: Portfolio Snapshots**
  - Create a `PortfolioSnapshot` table to store `userId`, `totalValue`, `totalCost`, `totalPnl`, and `timestamp`.
  - *Status: Completed*
- [x] **Data: Seed Initial History**
  - specific script to generate fake daily snapshots for the past 30 days based on current portfolio value (so graphs aren't empty).
  - *Status: Completed*
- [x] **Cron: Snapshot Automation**
  - Update `/api/cron/recurring` to calculate and save a daily snapshot for all active users.
  - *Status: Completed*
- [x] **UI: Asset Diversification Chart**
  - Implement a `DonutChart` on the main Investments page.
  - Category breakdown: Crypto vs. Stocks vs. Property vs. Others.
  - *Status: Completed*
- [x] **UI: Performance Benchmarking**
  - Add a simple "Profit/Loss" summary card showing "Realized" vs "Unrealized" gains.
  - *Status: Completed (Value & Trend indicator integrated)*

---

## 📈 Phase 2: Historical Context & Trends (Medium Priority)
*Goal: Turn snapshot data into interactive performance charts.*

- [ ] **API: Performance Data Endpoint**
  - Update `/api/investments` to return the last 30 days (or more) of snapshot data.
  - *Status: Pending*
- [ ] **UI: Portfolio Trend Graph**
  - Replace or enhance `PortfolioTrendCard` with a `LineChart` using historical snapshots.
  - Timeframe selectors: 1W, 1M, 3M, 1Y, All.
  - *Status: Pending*
- [ ] **UI: Asset-Specific History**
  - Add sparklines to the Assets Portfolio list.
  - Show historical price trends inside the `AssetModal`.
  - *Status: Pending*

---

## 🔔 Phase 3: Intelligence & Advanced Features (Future)
*Goal: Proactive alerts and deep financial logic.*

- [ ] **Notifications: Automatic Alerts**
  - Daily/Weekly performance summaries ("Your portfolio grew by 3.2% this week").
  - Price threshold alerts for specific assets.
  - *Status: Pending*
- [ ] **Dividends & Rewards Tracking**
  - Native support for "Income" type transactions within investments (dividends, staking rewards, rent).
  - *Status: Pending*
- [ ] **Benchmarking**
  - Overlay S&P 500 or BTC performance on the user's portfolio chart.
  - *Status: Pending*

---

## ✅ Completed Tasks
*(Move completed items here)*

---

## 🛠️ Technical Notes
- **Price Providers**: Currently using CoinGecko (Crypto) and Stooq (Stocks).
- **Caching**: Currency conversion is cached at the request level; live prices use Next.js fetch cache (60s).
- **Design System**: Must strictly follow `style-guide.md` (Background: #202020, Accent: #AC66DA).
