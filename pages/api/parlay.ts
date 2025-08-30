import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { legs } = req.body;

    // Calculate parlay odds
    let combinedOdds = 1;
    let combinedProbability = 1;

    for (const leg of legs) {
      const probability = leg.odds < 0 
        ? Math.abs(leg.odds) / (Math.abs(leg.odds) + 100)
        : 100 / (leg.odds + 100);
      
      combinedProbability *= probability;
      
      const decimalOdds = leg.odds < 0
        ? (100 / Math.abs(leg.odds)) + 1
        : (leg.odds / 100) + 1;
      
      combinedOdds *= decimalOdds;
    }

    const americanOdds = combinedOdds >= 2
      ? (combinedOdds - 1) * 100
      : -100 / (combinedOdds - 1);

    const result = {
      legs: legs.length,
      combinedOdds: americanOdds,
      combinedProbability,
      expectedValue: (combinedProbability * combinedOdds * 100) - 100,
      kellyPercentage: Math.min(0.25, Math.max(0, (combinedProbability * combinedOdds - 1) / (combinedOdds - 1))),
      recommended: combinedProbability > (1 / combinedOdds),
      riskLevel: legs.length <= 3 ? 'Low' : legs.length <= 5 ? 'Medium' : 'High'
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Parlay calculation failed' });
  }
}