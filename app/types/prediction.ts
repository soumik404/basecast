export interface Prediction {
  id: string;                 // Firestore doc ID
  predictionId: number; 
  title: string;
  description: string;
  currency: 'USDC' | 'ETH';
  deadline: number; // UTC timestamp
  totalYes: number;
  totalNo: number;
  maxCapacity?: number; // Optional max betting pool size
  status: 'active' | 'pending_verification' | 'resolved' | 'rejected' | 'cancelled';
  result?: 'yes' | 'no';
  proposedResult?: 'yes' | 'no'; // Creator's proposed result (before verification)
  proposedBy?: string; // Address that proposed the result
  proposedAt?: number; // Timestamp of proposal
  verifiedBy?: string; // Address that verified the result
  verifiedAt?: number; // Timestamp of verification
  rejectionReason?: string; // If rejected, why?
  creator: string;
  createdAt: number;
   resolved?: boolean;
   onChainResolved?: boolean;
  verified?: boolean;
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

export interface Verifier {
  address: string;
  name?: string;
  addedAt: number;
  addedBy: string; // Admin who added this verifier
  active: boolean;
}
