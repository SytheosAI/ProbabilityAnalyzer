import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export function formatDecimalOdds(odds: number): string {
  return odds.toFixed(2)
}

export function americanToDecimal(americanOdds: number): number {
  if (americanOdds > 0) {
    return (americanOdds / 100) + 1
  } else {
    return (100 / Math.abs(americanOdds)) + 1
  }
}

export function decimalToAmerican(decimalOdds: number): number {
  if (decimalOdds >= 2) {
    return (decimalOdds - 1) * 100
  } else {
    return -100 / (decimalOdds - 1)
  }
}

export function impliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100)
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)
  }
}

export function calculateEdge(trueProbability: number, impliedProb: number): number {
  return trueProbability - impliedProb
}

export function calculateExpectedValue(
  trueProbability: number, 
  americanOdds: number, 
  wager: number = 100
): number {
  const decimal = americanToDecimal(americanOdds)
  const profit = wager * (decimal - 1)
  const loss = wager
  
  return (trueProbability * profit) - ((1 - trueProbability) * loss)
}

export function kellyStake(
  trueProbability: number, 
  americanOdds: number, 
  bankroll: number = 1000,
  fraction: number = 0.25
): number {
  const decimal = americanToDecimal(americanOdds)
  const b = decimal - 1
  const p = trueProbability
  const q = 1 - p
  
  const kelly = (b * p - q) / b
  return Math.max(0, Math.min(kelly * fraction * bankroll, bankroll * 0.05))
}

export function getValueRating(expectedValue: number): 'excellent' | 'good' | 'moderate' | 'poor' {
  if (expectedValue >= 15) return 'excellent'
  if (expectedValue >= 8) return 'good'
  if (expectedValue >= 3) return 'moderate'
  return 'poor'
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600'
  if (confidence >= 0.65) return 'text-yellow-600'
  if (confidence >= 0.5) return 'text-orange-600'
  return 'text-red-600'
}

export function getRiskColor(risk: number): string {
  if (risk <= 0.3) return 'text-green-600'
  if (risk <= 0.5) return 'text-yellow-600'
  if (risk <= 0.7) return 'text-orange-600'
  return 'text-red-600'
}

export function formatOdds(americanOdds: number): string {
  if (americanOdds > 0) {
    return `+${americanOdds}`
  }
  return americanOdds.toString()
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}