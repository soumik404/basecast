import type { Prediction, Bet, LeaderboardEntry, Verifier } from '../app/types/prediction';

// In-memory storage (replace with MongoDB/Firebase)
class PredictionStore {
  private predictions: Map<string, Prediction> = new Map();
  private bets: Map<string, Bet> = new Map();
  private verifiers: Map<string, Verifier> = new Map();
  private admins: Set<string> = new Set();

  constructor() {
    // Add default admin (for demo purposes)
    this.admins.add('0x650157513a9EeE5B149394099231D8e7f00bb39c'.toLowerCase());
    
    // Add default verifiers (for demo purposes)
    this.addVerifier({
      address: '0xVerifier1234567890123456789012345678901',
      name: 'Official Verifier',
      addedAt: Date.now(),
      addedBy: '0x1234567890123456789012345678901234567890',
      active: true,
    });
    
    // Add some sample predictions
    
  }

  // Verifier Management
  addVerifier(verifier: Verifier): boolean {
    this.verifiers.set(verifier.address.toLowerCase(), verifier);
    return true;
  }

  removeVerifier(address: string): boolean {
    return this.verifiers.delete(address.toLowerCase());
  }

  isVerifier(address: string): boolean {
    const verifier = this.verifiers.get(address.toLowerCase());
    return verifier !== undefined && verifier.active;
  }

  getAllVerifiers(): Verifier[] {
    return Array.from(this.verifiers.values());
  }

  getActiveVerifiers(): Verifier[] {
    return Array.from(this.verifiers.values()).filter((v: Verifier) => v.active);
  }

  // Admin Management
  isAdmin(address: string): boolean {
    return this.admins.has(address.toLowerCase());
  }

  addAdmin(address: string): void {
    this.admins.add(address.toLowerCase());
  }

 

  // Predictions
  getAllPredictions(): Prediction[] {
    return Array.from(this.predictions.values());
  }

  getActivePredictions(): Prediction[] {
    return this.getAllPredictions().filter(
      (p: Prediction) => p.status === 'active' && p.deadline > Date.now()
    );
  }

  getPendingVerificationPredictions(): Prediction[] {
    return this.getAllPredictions().filter(
      (p: Prediction) => p.status === 'pending_verification'
    );
  }

  getPrediction(id: string): Prediction | undefined {
    return this.predictions.get(id);
  }

  createPrediction(prediction: Omit<Prediction, 'id' | 'createdAt' | 'totalYes' | 'totalNo' | 'status'>): Prediction {
    const newPrediction: Prediction = {
      ...prediction,
      id: Date.now().toString(),
      createdAt: Date.now(),
      totalYes: 0,
      totalNo: 0,
      status: 'active',
    };
    this.predictions.set(newPrediction.id, newPrediction);
    return newPrediction;
  }

  // Bets
  getAllBets(): Bet[] {
    return Array.from(this.bets.values());
  }

  getBetsForPrediction(predictionId: string): Bet[] {
    return this.getAllBets().filter((b: Bet) => b.predictionId === predictionId);
  }

  getBetsForUser(userAddress: string): Bet[] {
    return this.getAllBets().filter((b: Bet) => b.user.toLowerCase() === userAddress.toLowerCase());
  }

  placeBet(bet: Omit<Bet, 'id' | 'timestamp' | 'claimed'>): Bet | null {
    const prediction: Prediction | undefined = this.predictions.get(bet.predictionId);
    if (!prediction || prediction.status !== 'active' || prediction.deadline < Date.now()) {
      return null;
    }

    // Check capacity limit
    const currentTotal: number = prediction.totalYes + prediction.totalNo;
    if (prediction.maxCapacity && currentTotal + bet.amount > prediction.maxCapacity) {
      return null; // Capacity exceeded
    }

    const newBet: Bet = {
      ...bet,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      claimed: false,
    };

    // Update prediction totals
    if (bet.choice === 'yes') {
      prediction.totalYes += bet.amount;
    } else {
      prediction.totalNo += bet.amount;
    }
    this.predictions.set(prediction.id, prediction);

    this.bets.set(newBet.id, newBet);
    return newBet;
  }

  // Leaderboard
  getLeaderboard(): LeaderboardEntry[] {
    const userStats: Map<string, { profit: number; bets: number; wins: number }> = new Map();

    // Calculate stats from bets
    this.getAllBets().forEach((bet: Bet) => {
      const stats = userStats.get(bet.user) || { profit: 0, bets: 0, wins: 0 };
      stats.bets += 1;
      
      const prediction: Prediction | undefined = this.predictions.get(bet.predictionId);
      if (prediction && prediction.status === 'resolved' && prediction.result) {
        if (bet.choice === prediction.result) {
          stats.wins += 1;
          // Simple payout calculation
          const totalPool: number = prediction.totalYes + prediction.totalNo;
          const winningPool: number = prediction.result === 'yes' ? prediction.totalYes : prediction.totalNo;
          const payout: number = (bet.amount / winningPool) * totalPool;
          stats.profit += (payout - bet.amount);
        } else {
          stats.profit -= bet.amount;
        }
      }

      userStats.set(bet.user, stats);
    });

    // Convert to leaderboard entries
    const leaderboard: LeaderboardEntry[] = Array.from(userStats.entries()).map(
      ([address, stats]): LeaderboardEntry => ({
        address,
        totalProfit: stats.profit,
        totalBets: stats.bets,
        winRate: stats.bets > 0 ? (stats.wins / stats.bets) * 100 : 0,
      })
    );

    // Sort by profit
    return leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.totalProfit - a.totalProfit);
  }

  // TWO-STEP RESOLUTION: Step 1 - Propose Result (Creator only)
  proposeResult(predictionId: string, result: 'yes' | 'no', proposerAddress: string): boolean {
    const prediction: Prediction | undefined = this.predictions.get(predictionId);
    if (!prediction || prediction.status !== 'active') {
      return false;
    }

    // Check if proposer is the creator
    if (prediction.creator.toLowerCase() !== proposerAddress.toLowerCase()) {
      return false;
    }

    // Check if deadline has passed
    if (prediction.deadline > Date.now()) {
      return false; // Cannot propose before deadline
    }

    prediction.status = 'pending_verification';
    prediction.proposedResult = result;
    prediction.proposedBy = proposerAddress;
    prediction.proposedAt = Date.now();
    this.predictions.set(predictionId, prediction);
    return true;
  }

  // TWO-STEP RESOLUTION: Step 2 - Verify Result (Verifier only)
  verifyResult(predictionId: string, approve: boolean, verifierAddress: string, rejectionReason?: string): boolean {
    const prediction: Prediction | undefined = this.predictions.get(predictionId);
    if (!prediction || prediction.status !== 'pending_verification') {
      return false;
    }

    // Check if address is a verified verifier
    if (!this.isVerifier(verifierAddress)) {
      return false;
    }

    if (approve) {
      // Approve: Finalize the result
      prediction.status = 'resolved';
      prediction.result = prediction.proposedResult;
      prediction.verifiedBy = verifierAddress;
      prediction.verifiedAt = Date.now();
      this.predictions.set(predictionId, prediction);
      
      // Calculate payouts
      this.calculatePayouts(predictionId);
      return true;
    } else {
      // Reject: Send back to active state
      prediction.status = 'active';
      prediction.rejectionReason = rejectionReason || 'Result rejected by verifier';
      // Clear proposal data
      delete prediction.proposedResult;
      delete prediction.proposedBy;
      delete prediction.proposedAt;
      this.predictions.set(predictionId, prediction);
      return true;
    }
  }

  // Calculate payouts for all bets on a resolved prediction
  private calculatePayouts(predictionId: string): void {
    const prediction: Prediction | undefined = this.predictions.get(predictionId);
    if (!prediction || prediction.status !== 'resolved' || !prediction.result) {
      return;
    }

    const totalPool: number = prediction.totalYes + prediction.totalNo;
    const winningPool: number = prediction.result === 'yes' ? prediction.totalYes : prediction.totalNo;
    
    if (winningPool === 0) return; // No winners

    // Update all bets with their payout amounts
    this.getBetsForPrediction(predictionId).forEach((bet: Bet) => {
      if (bet.choice === prediction.result) {
        // Winner: gets proportional share of total pool
        const payout: number = (bet.amount / winningPool) * totalPool;
        bet.payout = payout;
        this.bets.set(bet.id, bet);
      } else {
        // Loser: payout is 0
        bet.payout = 0;
        this.bets.set(bet.id, bet);
      }
    });
  }

  // Claim reward
  claimReward(betId: string, userAddress: string): { success: boolean; amount: number } {
    const bet: Bet | undefined = this.bets.get(betId);
    if (!bet || bet.user.toLowerCase() !== userAddress.toLowerCase()) {
      return { success: false, amount: 0 };
    }

    if (bet.claimed) {
      return { success: false, amount: 0 }; // Already claimed
    }

    const prediction: Prediction | undefined = this.predictions.get(bet.predictionId);
    if (!prediction || prediction.status !== 'resolved' || !bet.payout) {
      return { success: false, amount: 0 };
    }

    // Mark as claimed
    bet.claimed = true;
    this.bets.set(betId, bet);

    return { success: true, amount: bet.payout };
  }

  // Get potential payout for a bet (before resolution)
  calculatePotentialPayout(predictionId: string, choice: 'yes' | 'no', amount: number): number {
    const prediction: Prediction | undefined = this.predictions.get(predictionId);
    if (!prediction) return 0;

    const totalPool: number = prediction.totalYes + prediction.totalNo + amount;
    const winningPool: number = choice === 'yes' 
      ? prediction.totalYes + amount 
      : prediction.totalNo + amount;

    if (winningPool === 0) return 0;

    return (amount / winningPool) * totalPool;
  }

  // Mock smart contract functions
  async createPredictionContract(
    title: string,
    description: string,
    token: 'USDC' | 'ETH',
    deadline: number
  ): Promise<string> {
    // Placeholder for smart contract integration
    console.log('Smart contract call: createPrediction', { title, description, token, deadline });
    return '0x' + Math.random().toString(16).substring(2);
  }

  async placeBetContract(
    predictionId: string,
    option: 'yes' | 'no',
    amount: number
  ): Promise<string> {
    // Placeholder for smart contract integration
    console.log('Smart contract call: placeBet', { predictionId, option, amount });
    return '0x' + Math.random().toString(16).substring(2);
  }

  async proposeResultContract(predictionId: string, result: 'yes' | 'no'): Promise<string> {
    // Placeholder for smart contract integration
    console.log('Smart contract call: proposeResult', { predictionId, result });
    return '0x' + Math.random().toString(16).substring(2);
  }

  async verifyResultContract(predictionId: string, approve: boolean): Promise<string> {
    // Placeholder for smart contract integration
    console.log('Smart contract call: verifyResult', { predictionId, approve });
    return '0x' + Math.random().toString(16).substring(2);
  }
}

export const store = new PredictionStore();
