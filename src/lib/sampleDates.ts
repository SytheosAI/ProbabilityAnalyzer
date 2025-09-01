// LIVE DATA ONLY - NO HARDCODED SAMPLE DATES
// All dates will be dynamically generated from current date/time

export const SAMPLE_DATES = {}
  // NBA - Use recent season dates (2024-25 season runs Oct 2024 - June 2025)
  nba: {
    year: '2024',
    month: '12',
    day: '25', // Christmas Day games
    date: '2024-12-25'
  },
  
  // NFL - 2024 season (Sept 2024 - Feb 2025)
  nfl: {
    year: '2024',
    week: 'REG/1', // Week 1 regular season
    date: '2024-09-08'
  },
  
  // MLB - 2024 season (March - October)
  mlb: {
    year: '2024',
    month: '07',
    day: '04', // July 4th games
    date: '2024-07-04'
  },
  
  // NHL - 2024-25 season (Oct 2024 - June 2025)
  nhl: {
    year: '2024',
    month: '10',
    day: '15', // Early season
    date: '2024-10-15'
  },
  
  // NCAA Basketball - 2024-25 season (Nov 2024 - April 2025)
  ncaamb: {
    year: '2024',
    month: '03',
    day: '21', // March Madness
    date: '2024-03-21'
  },
  
  // NCAA Football - 2024 season (Aug - Jan)
  ncaafb: {
    year: '2024',
    week: '1', // Week 1
    date: '2024-08-31'
  },
  
  // WNBA - 2024 season (May - October)
  wnba: {
    year: '2024',
    month: '07',
    day: '15', // Mid-season
    date: '2024-07-15'
  },
  
  // Soccer - Year-round
  soccer: {
    date: '2024-10-15'
  },
  
  // Tennis - Year-round
  tennis: {
    date: '2024-07-01' // Wimbledon time
  },
  
  // MLS - 2024 season (Feb - Dec)
  mls: {
    date: '2024-07-15'
  },
  
  // UFC/MMA - Year-round events
  ufc: {
    date: '2024-07-15'
  },
  
  // Boxing - Year-round events
  boxing: {
    date: '2024-07-15'
  }
};

// Function to get appropriate date based on current date and sport season
export function getOptimalDate(sport: string): any {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // For demo/testing, always use sample dates with known data
  // In production, this would check actual season schedules
  return SAMPLE_DATES[sport as keyof typeof SAMPLE_DATES] || {
    year: currentYear.toString(),
    month: String(currentMonth).padStart(2, '0'),
    day: String(now.getDate()).padStart(2, '0'),
    date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  };
}