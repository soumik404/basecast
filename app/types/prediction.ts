export interface Prediction {
  id: string;
  title: string;
  description: string;
  currency: 'USDC' | 'ETH';
  deadline: number; // UTC timestamp
  totalYes: number;
  totalNo: number;
  maxCapacity?: number; // Optional max betting pool size
  status: 'active' | 'resolved' | 'cancelled';
  result?: 'yes' | 'no';
  creator: string;
  createdAt: number;
}

export interface Bet {
  id: string;
  predictionId: string;
  user: string;
  amount: number;
  choice: 'yes' | 'no';
  timestamp: number;
  payout?: number;
  claimed: boolean; // Has the user claimed their reward?
}

export interface LeaderboardEntry {
  address: string;
  totalProfit: number;
  totalBets: number;
  winRate: number;
}
