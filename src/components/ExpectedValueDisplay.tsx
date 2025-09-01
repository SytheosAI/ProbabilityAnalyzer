'use client';

import React from 'react';
import { ExpectedValueAnalysis, ValueRating } from '@/services/expectedValueService';
import { LineMovement, SharpAction } from '@/services/lineMovementService';
import { BettingRecommendation } from '@/services/predictionsService';

interface ExpectedValueDisplayProps {
  analysis: ExpectedValueAnalysis;
  recommendations?: BettingRecommendation[];
  lineMovement?: LineMovement[];
  compact?: boolean;
}

export default function ExpectedValueDisplay({ 
  analysis, 
  recommendations = [],
  lineMovement = [],
  compact = false 
}: ExpectedValueDisplayProps) {
  
  // Get value rating color and label
  const getValueRatingDisplay = (rating: ValueRating) => {
    const displays = {
      [ValueRating.FIVE_STAR]: { 
        color: 'bg-green-500', 
        textColor: 'text-green-500',
        label: 'EXCEPTIONAL VALUE',
        stars: '★★★★★',
        bgGradient: 'from-green-500 to-green-600'
      },
      [ValueRating.FOUR_STAR]: { 
        color: 'bg-emerald-500', 
        textColor: 'text-emerald-500',
        label: 'GREAT VALUE',
        stars: '★★★★☆',
        bgGradient: 'from-emerald-500 to-emerald-600'
      },
      [ValueRating.THREE_STAR]: { 
        color: 'bg-blue-500', 
        textColor: 'text-blue-500',
        label: 'GOOD VALUE',
        stars: '★★★☆☆',
        bgGradient: 'from-blue-500 to-blue-600'
      },
      [ValueRating.TWO_STAR]: { 
        color: 'bg-yellow-500', 
        textColor: 'text-yellow-500',
        label: 'SLIGHT EDGE',
        stars: '★★☆☆☆',
        bgGradient: 'from-yellow-500 to-yellow-600'
      },
      [ValueRating.ONE_STAR]: { 
        color: 'bg-orange-500', 
        textColor: 'text-orange-500',
        label: 'MINIMAL EDGE',
        stars: '★☆☆☆☆',
        bgGradient: 'from-orange-500 to-orange-600'
      },
      [ValueRating.NO_VALUE]: { 
        color: 'bg-red-500', 
        textColor: 'text-red-500',
        label: 'NO VALUE',
        stars: '☆☆☆☆☆',
        bgGradient: 'from-red-500 to-red-600'
      }
    };
    
    return displays[rating] || displays[ValueRating.NO_VALUE];
  };
  
  const ratingDisplay = getValueRatingDisplay(analysis.valueRating);
  
  // Format percentage with color
  const formatPercentage = (value: number, showPlus: boolean = true) => {
    const formatted = `${value > 0 && showPlus ? '+' : ''}${value.toFixed(1)}%`;
    const color = value > 10 ? 'text-green-500' : 
                  value > 5 ? 'text-emerald-500' :
                  value > 0 ? 'text-blue-500' : 'text-red-500';
    return <span className={color}>{formatted}</span>;
  };
  
  // Format odds
  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`;
  };
  
  if (compact) {
    // Compact view for game cards
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className={`text-2xl ${ratingDisplay.textColor}`}>
              {ratingDisplay.stars}
            </span>
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              {ratingDisplay.label}
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {formatPercentage(analysis.expectedValuePercent)}
            </div>
            <div className="text-xs text-gray-500">Expected Value</div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Edge:</span>
            <span className="ml-1 font-semibold">
              {formatPercentage(analysis.edge * 100)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Kelly:</span>
            <span className="ml-1 font-semibold">
              {(analysis.kellyCriterion * 100).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Units:</span>
            <span className="ml-1 font-semibold text-blue-500">
              {analysis.suggestedUnits}
            </span>
          </div>
        </div>
        
        {analysis.sharpAnalysis && analysis.sharpAnalysis.sharpDisagreement && (
          <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-xs">
            <span className="text-yellow-600 dark:text-yellow-500 font-semibold">
              Sharp Money Alert: 
            </span>
            <span className="ml-1">
              Sharp money on {analysis.sharpAnalysis.sharpSide}
            </span>
          </div>
        )}
      </div>
    );
  }
  
  // Full detailed view
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden">
      {/* Header with value rating */}
      <div className={`bg-gradient-to-r ${ratingDisplay.bgGradient} text-white p-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">{ratingDisplay.label}</h3>
            <div className="text-4xl mt-1">{ratingDisplay.stars}</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {analysis.expectedValuePercent > 0 ? '+' : ''}{analysis.expectedValuePercent.toFixed(1)}%
            </div>
            <div className="text-sm opacity-90">Expected Value</div>
          </div>
        </div>
      </div>
      
      {/* Main metrics */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-500 mb-1">True Probability</div>
            <div className="text-xl font-bold">
              {(analysis.trueProbability * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-500 mb-1">Implied Probability</div>
            <div className="text-xl font-bold">
              {(analysis.impliedProbability * 100).toFixed(1)}%
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-500 mb-1">Edge</div>
            <div className="text-xl font-bold">
              {formatPercentage(analysis.edge * 100)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-500 mb-1">Current Odds</div>
            <div className="text-xl font-bold">
              {formatOdds(analysis.currentOdds)}
            </div>
          </div>
        </div>
        
        {/* Betting recommendations */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-3">Betting Recommendations</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-blue-200 dark:border-blue-800 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Kelly Criterion</span>
                <span className="text-lg font-bold text-blue-500">
                  {(analysis.kellyCriterion * 100).toFixed(2)}%
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Optimal bet size as percentage of bankroll
              </div>
            </div>
            <div className="border border-green-200 dark:border-green-800 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Suggested Units</span>
                <span className="text-lg font-bold text-green-500">
                  {analysis.suggestedUnits} units
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Based on edge and confidence level
              </div>
            </div>
          </div>
        </div>
        
        {/* Line movement analysis */}
        {analysis.lineMovement && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">Line Movement</h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Opening Line:</span>
                  <span className="ml-2 font-semibold">
                    {formatOdds(analysis.lineMovement.openingLine)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Current Line:</span>
                  <span className="ml-2 font-semibold">
                    {formatOdds(analysis.lineMovement.currentLine)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Direction:</span>
                  <span className={`ml-2 font-semibold ${
                    analysis.lineMovement.lineDirection === 'up' ? 'text-green-500' : 
                    analysis.lineMovement.lineDirection === 'down' ? 'text-red-500' : 
                    'text-gray-500'
                  }`}>
                    {analysis.lineMovement.lineDirection.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Movement:</span>
                  <span className="ml-2 font-semibold">
                    {analysis.lineMovement.movementMagnitude} pts
                  </span>
                </div>
              </div>
              
              {/* Alerts for special conditions */}
              <div className="mt-3 space-y-2">
                {analysis.lineMovement.steamMove && (
                  <div className="flex items-center p-2 bg-red-100 dark:bg-red-900/20 rounded">
                    <span className="text-red-600 dark:text-red-500 font-semibold text-sm">
                      STEAM MOVE DETECTED
                    </span>
                  </div>
                )}
                {analysis.lineMovement.reverseLineMovement && (
                  <div className="flex items-center p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded">
                    <span className="text-yellow-600 dark:text-yellow-500 font-semibold text-sm">
                      REVERSE LINE MOVEMENT
                    </span>
                  </div>
                )}
                {analysis.lineMovement.keyNumbers && (
                  <div className="flex items-center p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
                    <span className="text-blue-600 dark:text-blue-500 font-semibold text-sm">
                      KEY NUMBER CROSSED
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Sharp vs Public Analysis */}
        {analysis.sharpAnalysis && (
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">Sharp vs Public Money</h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded p-4">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Betting %</div>
                  <div className="text-lg font-semibold">
                    {(analysis.sharpAnalysis.bettingPercentage * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">of bets</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Money %</div>
                  <div className="text-lg font-semibold">
                    {(analysis.sharpAnalysis.moneyPercentage * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">of money</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Sharp Side:</span>
                  <span className="font-semibold capitalize">
                    {analysis.sharpAnalysis.sharpSide}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Public Side:</span>
                  <span className="font-semibold capitalize">
                    {analysis.sharpAnalysis.publicSide}
                  </span>
                </div>
                {analysis.sharpAnalysis.professionalBettors > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Professional Action:</span>
                    <span className="font-semibold text-blue-500">
                      {analysis.sharpAnalysis.professionalBettors.toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
              
              {analysis.sharpAnalysis.sharpDisagreement && (
                <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/20 rounded">
                  <span className="text-green-600 dark:text-green-500 font-semibold text-sm">
                    SHARP MONEY OPPORTUNITY
                  </span>
                  <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
                    Sharp money disagrees with public betting
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Detailed recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold mb-3">All Betting Options</h4>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div 
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold capitalize">{rec.type}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm">{rec.pick}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-lg font-bold ${
                        rec.expectedValuePercent > 10 ? 'text-green-500' :
                        rec.expectedValuePercent > 5 ? 'text-emerald-500' :
                        rec.expectedValuePercent > 0 ? 'text-blue-500' :
                        'text-red-500'
                      }`}>
                        {rec.expectedValuePercent > 0 ? '+' : ''}{rec.expectedValuePercent.toFixed(1)}% EV
                      </span>
                      <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                        {rec.suggestedUnit} units
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {rec.reasoning}
                  </div>
                  <div className="mt-2 flex items-center space-x-4 text-xs">
                    <span>
                      Edge: <span className="font-semibold">{(rec.edge * 100).toFixed(1)}%</span>
                    </span>
                    <span>
                      Kelly: <span className="font-semibold">{(rec.kellyCriterion * 100).toFixed(1)}%</span>
                    </span>
                    <span>
                      Confidence: <span className="font-semibold">{(rec.confidence * 100).toFixed(0)}%</span>
                    </span>
                    {rec.lineValue && (
                      <span className={`px-2 py-0.5 rounded ${
                        rec.lineValue === 'good' ? 'bg-green-100 text-green-700' :
                        rec.lineValue === 'fair' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {rec.lineValue} line
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}