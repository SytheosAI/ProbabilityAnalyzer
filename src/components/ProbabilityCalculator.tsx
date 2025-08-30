'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calculator,
  TrendingUp,
  DollarSign,
  Target,
  Percent,
  Zap,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Info
} from 'lucide-react'
import { cn, americanToDecimal, impliedProbability, calculateExpectedValue, kellyStake, formatPercentage, formatCurrency } from '@/lib/utils'

const CalculatorCard = ({ 
  title, 
  children, 
  icon: Icon,
  description 
}: {
  title: string
  children: React.ReactNode
  icon: React.ElementType
  description?: string
}) => (
  <Card className="glass border-slate-700/50 hover:border-blue-500/50 transition-all duration-300">
    <CardHeader>
      <CardTitle className="text-white flex items-center">
        <Icon className="h-5 w-5 mr-2 text-blue-400" />
        {title}
      </CardTitle>
      {description && (
        <CardDescription className="text-slate-400">
          {description}
        </CardDescription>
      )}
    </CardHeader>
    <CardContent>
      {children}
    </CardContent>
  </Card>
)

const ResultDisplay = ({ 
  label, 
  value, 
  color = "text-white",
  prefix = "",
  suffix = "",
  size = "text-lg"
}: {
  label: string
  value: string | number
  color?: string
  prefix?: string
  suffix?: string
  size?: string
}) => (
  <div className="text-center p-3 bg-slate-800/50 rounded-lg">
    <p className="text-sm text-slate-400 mb-1">{label}</p>
    <p className={cn("font-bold", color, size)}>
      {prefix}{value}{suffix}
    </p>
  </div>
)

const OddsConverter = () => {
  const [americanOdds, setAmericanOdds] = useState<string>('100')
  const [decimalOdds, setDecimalOdds] = useState<number>(2.0)
  const [impliedProb, setImpliedProb] = useState<number>(0.5)
  
  useEffect(() => {
    const odds = parseFloat(americanOdds) || 100
    const decimal = americanToDecimal(odds)
    const implied = impliedProbability(odds)
    
    setDecimalOdds(decimal)
    setImpliedProb(implied)
  }, [americanOdds])
  
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          American Odds
        </label>
        <Input
          type="number"
          value={americanOdds}
          onChange={(e) => setAmericanOdds(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white"
          placeholder="e.g., +150 or -200"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ResultDisplay
          label="Decimal Odds"
          value={decimalOdds.toFixed(2)}
          color="text-blue-400"
        />
        <ResultDisplay
          label="Implied Probability"
          value={formatPercentage(impliedProb)}
          color="text-green-400"
        />
      </div>
    </div>
  )
}

const ExpectedValueCalculator = () => {
  const [trueProbability, setTrueProbability] = useState<string>('55')
  const [americanOdds, setAmericanOdds] = useState<string>('100')
  const [wager, setWager] = useState<string>('100')
  
  const [results, setResults] = useState({
    expectedValue: 0,
    impliedProbability: 0,
    edge: 0,
    profit: 0,
    loss: 0
  })
  
  useEffect(() => {
    const trueProb = parseFloat(trueProbability) / 100 || 0.5
    const odds = parseFloat(americanOdds) || 100
    const stake = parseFloat(wager) || 100
    
    const implied = impliedProbability(odds)
    const ev = calculateExpectedValue(trueProb, odds, stake)
    const edge = trueProb - implied
    const decimal = americanToDecimal(odds)
    const profit = stake * (decimal - 1)
    const loss = stake
    
    setResults({
      expectedValue: ev,
      impliedProbability: implied,
      edge,
      profit,
      loss
    })
  }, [trueProbability, americanOdds, wager])
  
  const getEVColor = (ev: number) => {
    if (ev > 10) return 'text-green-400'
    if (ev > 0) return 'text-blue-400'
    if (ev > -5) return 'text-yellow-400'
    return 'text-red-400'
  }
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            True Probability (%)
          </label>
          <Input
            type="number"
            value={trueProbability}
            onChange={(e) => setTrueProbability(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="55"
            min="0"
            max="100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            American Odds
          </label>
          <Input
            type="number"
            value={americanOdds}
            onChange={(e) => setAmericanOdds(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Wager Amount ($)
          </label>
          <Input
            type="number"
            value={wager}
            onChange={(e) => setWager(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="100"
            min="0"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultDisplay
          label="Expected Value"
          value={results.expectedValue.toFixed(2)}
          color={getEVColor(results.expectedValue)}
          prefix="$"
        />
        <ResultDisplay
          label="Edge"
          value={formatPercentage(results.edge)}
          color={results.edge > 0 ? 'text-green-400' : 'text-red-400'}
        />
        <ResultDisplay
          label="Potential Profit"
          value={results.profit.toFixed(2)}
          color="text-green-400"
          prefix="$"
        />
        <ResultDisplay
          label="Potential Loss"
          value={results.loss.toFixed(2)}
          color="text-red-400"
          prefix="$"
        />
      </div>
      
      <div className="bg-slate-800/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className={cn(
            "p-2 rounded-full",
            results.expectedValue > 0 ? "bg-green-500/20" : "bg-red-500/20"
          )}>
            {results.expectedValue > 0 ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div>
            <h4 className={cn(
              "font-medium",
              results.expectedValue > 0 ? "text-green-400" : "text-red-400"
            )}>
              {results.expectedValue > 0 ? "Positive Expected Value" : "Negative Expected Value"}
            </h4>
            <p className="text-sm text-slate-400 mt-1">
              {results.expectedValue > 0 
                ? "This bet has a positive expected value and may be profitable long-term."
                : "This bet has a negative expected value and should likely be avoided."
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const KellyCalculator = () => {
  const [trueProbability, setTrueProbability] = useState<string>('55')
  const [americanOdds, setAmericanOdds] = useState<string>('100')
  const [bankroll, setBankroll] = useState<string>('1000')
  const [fraction, setFraction] = useState<string>('25')
  
  const [results, setResults] = useState({
    kellyPercentage: 0,
    recommendedStake: 0,
    fullKelly: 0,
    maxBet: 0
  })
  
  useEffect(() => {
    const trueProb = parseFloat(trueProbability) / 100 || 0.5
    const odds = parseFloat(americanOdds) || 100
    const bankrollAmount = parseFloat(bankroll) || 1000
    const kellyFraction = parseFloat(fraction) / 100 || 0.25
    
    const stake = kellyStake(trueProb, odds, bankrollAmount, kellyFraction)
    const decimal = americanToDecimal(odds)
    const b = decimal - 1
    const p = trueProb
    const q = 1 - p
    const fullKellyPercent = Math.max(0, (b * p - q) / b)
    const maxBet = bankrollAmount * 0.05 // Never bet more than 5%
    
    setResults({
      kellyPercentage: fullKellyPercent,
      recommendedStake: stake,
      fullKelly: fullKellyPercent * bankrollAmount,
      maxBet
    })
  }, [trueProbability, americanOdds, bankroll, fraction])
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            True Probability (%)
          </label>
          <Input
            type="number"
            value={trueProbability}
            onChange={(e) => setTrueProbability(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="55"
            min="0"
            max="100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            American Odds
          </label>
          <Input
            type="number"
            value={americanOdds}
            onChange={(e) => setAmericanOdds(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="100"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Bankroll ($)
          </label>
          <Input
            type="number"
            value={bankroll}
            onChange={(e) => setBankroll(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="1000"
            min="0"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Kelly Fraction (%)
          </label>
          <Input
            type="number"
            value={fraction}
            onChange={(e) => setFraction(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
            placeholder="25"
            min="0"
            max="100"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultDisplay
          label="Kelly Percentage"
          value={formatPercentage(results.kellyPercentage)}
          color="text-yellow-400"
        />
        <ResultDisplay
          label="Recommended Stake"
          value={results.recommendedStake.toFixed(2)}
          color="text-blue-400"
          prefix="$"
        />
        <ResultDisplay
          label="Full Kelly Amount"
          value={results.fullKelly.toFixed(2)}
          color="text-orange-400"
          prefix="$"
        />
        <ResultDisplay
          label="Max Bet (5% Rule)"
          value={results.maxBet.toFixed(2)}
          color="text-red-400"
          prefix="$"
        />
      </div>
      
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-400">Kelly Criterion Guide</h4>
            <p className="text-sm text-slate-400 mt-1">
              The Kelly Criterion determines optimal bet size based on edge and odds. 
              Using a fraction (like 25%) reduces volatility while maintaining growth.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const ParlayCalculator = () => {
  const [legs, setLegs] = useState([
    { odds: '100', probability: '50' },
    { odds: '100', probability: '50' }
  ])
  
  const [parlayResults, setParlayResults] = useState({
    combinedOdds: 0,
    totalProbability: 0,
    expectedValue: 0,
    payout: 0
  })
  
  const addLeg = () => {
    setLegs([...legs, { odds: '100', probability: '50' }])
  }
  
  const removeLeg = (index: number) => {
    if (legs.length > 2) {
      setLegs(legs.filter((_, i) => i !== index))
    }
  }
  
  const updateLeg = (index: number, field: 'odds' | 'probability', value: string) => {
    const newLegs = [...legs]
    newLegs[index][field] = value
    setLegs(newLegs)
  }
  
  useEffect(() => {
    let combinedDecimalOdds = 1
    let totalProb = 1
    
    legs.forEach(leg => {
      const odds = parseFloat(leg.odds) || 100
      const prob = parseFloat(leg.probability) / 100 || 0.5
      
      combinedDecimalOdds *= americanToDecimal(odds)
      totalProb *= prob
    })
    
    const americanCombined = combinedDecimalOdds >= 2 ? 
      (combinedDecimalOdds - 1) * 100 : 
      -100 / (combinedDecimalOdds - 1)
    
    const stake = 100
    const payout = stake * combinedDecimalOdds
    const ev = (totalProb * payout) - ((1 - totalProb) * stake)
    
    setParlayResults({
      combinedOdds: americanCombined,
      totalProbability: totalProb,
      expectedValue: ev,
      payout: payout - stake
    })
  }, [legs])
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {legs.map((leg, index) => (
          <div key={index} className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-lg">
            <div className="w-8 h-8 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  American Odds
                </label>
                <Input
                  type="number"
                  value={leg.odds}
                  onChange={(e) => updateLeg(index, 'odds', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white h-8"
                  placeholder="100"
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  True Probability (%)
                </label>
                <Input
                  type="number"
                  value={leg.probability}
                  onChange={(e) => updateLeg(index, 'probability', e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white h-8"
                  placeholder="50"
                  min="0"
                  max="100"
                />
              </div>
            </div>
            
            {legs.length > 2 && (
              <Button
                onClick={() => removeLeg(index)}
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300"
              >
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex justify-center">
        <Button onClick={addLeg} variant="outline" className="text-white border-slate-700">
          Add Leg ({legs.length}/6)
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ResultDisplay
          label="Combined Odds"
          value={parlayResults.combinedOdds > 0 ? 
            `+${Math.round(parlayResults.combinedOdds)}` : 
            Math.round(parlayResults.combinedOdds).toString()
          }
          color="text-green-400"
        />
        <ResultDisplay
          label="True Probability"
          value={formatPercentage(parlayResults.totalProbability)}
          color="text-blue-400"
        />
        <ResultDisplay
          label="Expected Value"
          value={parlayResults.expectedValue.toFixed(2)}
          color={parlayResults.expectedValue > 0 ? 'text-green-400' : 'text-red-400'}
          prefix="$"
        />
        <ResultDisplay
          label="Potential Profit"
          value={parlayResults.payout.toFixed(2)}
          color="text-yellow-400"
          prefix="$"
        />
      </div>
    </div>
  )
}

export default function ProbabilityCalculator() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Probability Calculator Suite</h2>
        <p className="text-slate-400 max-w-3xl mx-auto">
          Advanced betting calculators for odds conversion, expected value analysis, Kelly Criterion staking, and parlay optimization
        </p>
      </div>
      
      <Tabs defaultValue="odds" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="odds" className="text-white data-[state=active]:bg-slate-700">
            Odds Converter
          </TabsTrigger>
          <TabsTrigger value="ev" className="text-white data-[state=active]:bg-slate-700">
            Expected Value
          </TabsTrigger>
          <TabsTrigger value="kelly" className="text-white data-[state=active]:bg-slate-700">
            Kelly Criterion
          </TabsTrigger>
          <TabsTrigger value="parlay" className="text-white data-[state=active]:bg-slate-700">
            Parlay Calculator
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="odds" className="space-y-4">
          <CalculatorCard
            title="Odds Converter"
            icon={Target}
            description="Convert between American and Decimal odds formats with implied probability"
          >
            <OddsConverter />
          </CalculatorCard>
        </TabsContent>
        
        <TabsContent value="ev" className="space-y-4">
          <CalculatorCard
            title="Expected Value Calculator"
            icon={TrendingUp}
            description="Calculate expected value, edge, and profitability of individual bets"
          >
            <ExpectedValueCalculator />
          </CalculatorCard>
        </TabsContent>
        
        <TabsContent value="kelly" className="space-y-4">
          <CalculatorCard
            title="Kelly Criterion Calculator"
            icon={Percent}
            description="Determine optimal bet sizing based on edge and bankroll management"
          >
            <KellyCalculator />
          </CalculatorCard>
        </TabsContent>
        
        <TabsContent value="parlay" className="space-y-4">
          <CalculatorCard
            title="Parlay Calculator"
            icon={BarChart3}
            description="Calculate combined odds, probability, and expected value for multi-leg parlays"
          >
            <ParlayCalculator />
          </CalculatorCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}