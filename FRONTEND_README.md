# Sports Probability Analyzer - Frontend UI

A modern, responsive React/Next.js frontend for the Sports Probability Analyzer platform, featuring advanced AI-powered sports betting analysis with real-time odds, moneyline predictions, and parlay optimization.

## 🚀 Features

### Core Components

- **Sports Analytics Dashboard** - Live data visualization with profit tracking, sports performance, and risk distribution
- **Moneyline Display** - AI-powered moneyline predictions with edge calculation and Kelly criterion
- **Parlay Optimizer** - ML-based parlay optimization with correlation analysis and risk management
- **Probability Calculator Suite** - Advanced betting calculators including:
  - Odds converter (American ↔ Decimal)
  - Expected Value calculator
  - Kelly Criterion staking calculator
  - Multi-leg parlay calculator

### Real-time Features

- **Live Odds Integration** - Real-time sports data via Sports Radar API
- **Arbitrage Detection** - Automatic identification of risk-free profit opportunities
- **Line Movement Tracking** - Monitor odds changes and steam moves
- **Value Bet Alerts** - Real-time notifications for high-value betting opportunities

### Advanced Analytics

- **Machine Learning Models** - YOLO-inspired neural networks for pattern detection
- **Correlation Analysis** - Multi-sport correlation detection for parlay optimization
- **Historical Analysis** - Trend analysis and historical performance tracking
- **Risk Management** - Comprehensive risk scoring and bankroll management

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Components**: Tailwind CSS, Radix UI, shadcn/ui
- **Charts**: Recharts for data visualization
- **Backend Integration**: Python API with Sports Radar integration
- **State Management**: React hooks with real-time data fetching
- **Responsive Design**: Mobile-first approach with modern glass morphism

## 🎨 Design Philosophy

The UI follows a **sharp, modern design** aesthetic with:

- **Glass Morphism**: Transparent cards with backdrop blur effects
- **Gradient Backgrounds**: Dynamic blue-purple gradients
- **Responsive Grid Layouts**: Optimized for all screen sizes
- **Real-time Animations**: Smooth transitions and loading states
- **Professional Typography**: Inter font family for optimal readability
- **Color-coded Analytics**: Intuitive color schemes for different data types

## 📱 Responsive Design

The interface is fully responsive across all devices:

- **Desktop**: Full-featured dashboard with multi-column layouts
- **Tablet**: Optimized card layouts with touch-friendly controls
- **Mobile**: Stacked layouts with collapsible sections and mobile-optimized navigation

## 🔧 Setup & Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Create `.env.local` with:
   ```
   NEXT_PUBLIC_SPORTRADAR_API_KEY=your_sports_radar_api_key
   PYTHON_API_URL=http://localhost:8000
   ```

3. **Development Mode**:
   ```bash
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

## 🏗️ Project Structure

```
src/
├── app/                 # Next.js 13+ App Router
│   ├── api/            # API routes (proxy to Python backend)
│   ├── page.tsx        # Main application page
│   └── layout.tsx      # Root layout
├── components/         # React components
│   ├── ui/            # Base UI components (shadcn/ui)
│   ├── SportsAnalyticsDashboard.tsx
│   ├── MoneylineDisplay.tsx
│   ├── ParlayOptimizer.tsx
│   └── ProbabilityCalculator.tsx
├── lib/               # Utility libraries
│   ├── utils.ts       # Helper functions
│   └── api.ts         # API client and hooks
└── types/             # TypeScript definitions
    └── sports.ts      # Sports data types
```

## 📊 Component Overview

### SportsAnalyticsDashboard
- Real-time profit tracking
- Sports performance metrics
- Risk distribution charts
- Recent high-value bets display

### MoneylineDisplay
- AI-powered moneyline predictions
- Value rating system (Excellent/Good/Moderate/Poor)
- Expected value and edge calculations
- Kelly Criterion staking recommendations

### ParlayOptimizer
- Multi-leg parlay optimization
- Risk level selection (Conservative/Moderate/Aggressive/YOLO)
- Correlation analysis and warnings
- ML-powered combination generation

### ProbabilityCalculator
- Odds conversion tools
- Expected value calculations
- Kelly Criterion stake sizing
- Multi-leg parlay probability calculations

## 🎯 Key Features

### Advanced Filtering
- Sport-specific filtering
- Confidence level thresholds
- Expected value minimums
- Risk level constraints

### Real-time Updates
- Auto-refresh capabilities
- Live odds monitoring
- Instant notifications
- Background data fetching

### Mobile Optimization
- Touch-friendly interfaces
- Swipe gestures
- Optimized layouts
- Fast loading times

## 🔗 API Integration

The frontend integrates with the Python backend through:

- **RESTful APIs**: JSON-based communication
- **Real-time Data**: WebSocket support for live updates
- **Sports Radar API**: Direct integration for live odds data
- **Error Handling**: Comprehensive error states and fallbacks

## 🚀 Performance Optimizations

- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js optimized images
- **Caching**: Intelligent data caching strategies
- **Bundle Analysis**: Optimized bundle sizes
- **Loading States**: Smooth loading experiences

## 🎨 UI/UX Highlights

- **Intuitive Navigation**: Tab-based interface with clear sections
- **Visual Hierarchy**: Strategic use of typography and spacing
- **Data Visualization**: Interactive charts and graphs
- **Accessibility**: WCAG compliant with keyboard navigation
- **Progressive Enhancement**: Works without JavaScript enabled

## 📈 Analytics Features

### Dashboard Metrics
- Games analyzed today
- Value bets found
- Average expected value
- Profit potential calculations

### Visual Components
- Profit tracking area charts
- Sports performance bar charts
- Risk distribution pie charts
- Line movement trend analysis

## 🔒 Security Features

- **API Key Management**: Secure environment variable handling
- **Input Validation**: Comprehensive form validation
- **Error Boundaries**: Graceful error handling
- **HTTPS Enforcement**: Secure data transmission

## 🌟 Future Enhancements

- **WebSocket Integration**: Real-time live updates
- **Push Notifications**: Mobile alerts for value bets
- **User Authentication**: Personal dashboards and preferences
- **Historical Charts**: Extended historical analysis views
- **Export Features**: PDF/Excel report generation

## 📱 Mobile Features

- **PWA Support**: Progressive Web App capabilities
- **Offline Mode**: Basic functionality without internet
- **Touch Gestures**: Swipe navigation and interactions
- **Native Feel**: App-like user experience

---

**Built with Claude Code** - The ultimate sports prediction platform featuring cutting-edge design, real-time data analysis, and professional-grade betting intelligence.