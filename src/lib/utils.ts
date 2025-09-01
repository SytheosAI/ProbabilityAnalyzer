import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Convert American odds to decimal odds
export function americanToDecimal(odds: number): number {
  if (odds > 0) {
    return (odds / 100) + 1;
  } else {
    return (100 / Math.abs(odds)) + 1;
  }
}

// Calculate implied probability from American odds
export function impliedProbability(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

// Format percentage values
export function formatPercentage(value: number, showPlus: boolean = false): string {
  const percentage = (value * 100).toFixed(1);
  if (showPlus && value > 0) {
    return `+${percentage}%`;
  }
  return `${percentage}%`;
}

// Calculate expected value
export function calculateExpectedValue(trueProbability: number, americanOdds: number, stake: number = 100): number {
  const impliedProb = impliedProbability(americanOdds);
  const decimalOdds = americanToDecimal(americanOdds);
  
  // EV = (Probability of Winning × Amount Won) - (Probability of Losing × Amount Lost)
  const ev = (trueProbability * (decimalOdds - 1) * stake) - ((1 - trueProbability) * stake);
  return ev;
}

// Calculate Kelly Criterion stake
export function kellyStake(trueProbability: number, americanOdds: number, bankroll: number, kellyMultiplier: number = 0.25): number {
  const decimalOdds = americanToDecimal(americanOdds);
  const b = decimalOdds - 1;
  const p = trueProbability;
  const q = 1 - trueProbability;
  
  // Kelly formula: f = (bp - q) / b
  const kelly = (b * p - q) / b;
  
  // Apply safety multiplier and cap at reasonable limits
  const safeKelly = Math.max(0, Math.min(0.25, kelly * kellyMultiplier));
  
  return safeKelly * bankroll;
}

// Format odds display
export function formatOdds(odds: number): string {
  if (!odds || isNaN(odds)) return 'N/A';
  return odds > 0 ? `+${Math.round(odds)}` : `${Math.round(odds)}`;
}

// Format currency values
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Get confidence color based on confidence score
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return 'text-green-400';
  if (confidence >= 60) return 'text-yellow-400';
  if (confidence >= 40) return 'text-orange-400';
  return 'text-red-400';
}

// Get value rating (placeholder - you may need to implement based on your specific logic)
export function getValueRating(value: number): string {
  if (value >= 15) return 'excellent';
  if (value >= 8) return 'good';
  if (value >= 3) return 'fair';
  if (value >= 0) return 'poor';
  return 'terrible';
}