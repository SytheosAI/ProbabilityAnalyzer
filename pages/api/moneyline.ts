import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sport, homeTeam, awayTeam, homeOdds, awayOdds } = req.body;

    // Calculate moneyline probabilities
    const homeProbability = homeOdds < 0 
      ? Math.abs(homeOdds) / (Math.abs(homeOdds) + 100)
      : 100 / (homeOdds + 100);
    
    const awayProbability = awayOdds < 0
      ? Math.abs(awayOdds) / (Math.abs(awayOdds) + 100)
      : 100 / (awayOdds + 100);

    const result = {
      sport,
      homeTeam,
      awayTeam,
      predictions: {
        homeProbability,
        awayProbability,
        recommendedBet: homeProbability > awayProbability ? 'home' : 'away',
        confidence: Math.max(homeProbability, awayProbability),
        expectedValue: (homeProbability * homeOdds) - ((1 - homeProbability) * 100)
      }
    };

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Moneyline calculation failed' });
  }
}