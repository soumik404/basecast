import type { Prediction, Bet, LeaderboardEntry } from '../app/types/prediction';

// In-memory storage (replace with MongoDB/Firebase)
class PredictionStore {
  private predictions: Map<string, Prediction> = new Map();
  private bets: Map<string, Bet> = new Map();

  constructor() {
    // Add some sample predictions
    this.addSampleData();
  }

  private addSampleData(): void {
    const samplePredictions: Prediction[] = [
      {
        id: '1',
        title: 'ETH will reach $4000 by end of month',
        description: 'Ethereum price will reach or exceed $4000 USD before the end of the current month.',
        currency: 'USDC',
        deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
        totalYes: 15000,
        totalNo: 8500,
        status: 'active',
        creator: '0x1234567890123456789012345678901234567890',
        createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
      {
        id: '2',
        title: 'Base will have 10M+ active users this year',
        description: 'Base blockchain will surpass 10 million monthly active users before December 31.',
        currency: 'ETH',
        deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
        totalYes: 25000,
        totalNo: 12000,
        status: 'active',
        creator: '0x2345678901234567890123456789012345678901',
        createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      },
      {
        id: '3',
        title: 'Bitcoin halving will happen in April',
        description: 'The next Bitcoin halving event will occur during the month of April.',
        currency: 'USDC',
        deadline: Date.now() + 14 * 24 * 60 * 60 * 1000,
        totalYes: 42000,
        totalNo: 18000,
        status: 'active',
        creator: '0x3456789012345678901234567890123456789012',
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      },
    ];

    samplePredictions.forEach((p: Prediction) => this.predictions.set(p.id, p));
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

  placeBet(bet: Omit<Bet, 'id' | 'timestamp'>): Bet | null {
    const prediction: Prediction | undefined = this.predictions.get(bet.predictionId);
    if (!prediction || prediction.status !== 'active' || prediction.deadline < Date.now()) {
      return null;
    }

    const newBet: Bet = {
      ...bet,
      id: Date.now().toString(),
      timestamp: Date.now(),
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

  async resolveEventContract(predictionId: string, result: 'yes' | 'no'): Promise<string> {
    // Placeholder for smart contract integration
    console.log('Smart contract call: resolveEvent', { predictionId, result });
    const prediction: Prediction | undefined = this.predictions.get(predictionId);
    if (prediction) {
      prediction.status = 'resolved';
      prediction.result = result;
      this.predictions.set(predictionId, prediction);
    }
    return '0x' + Math.random().toString(16).substring(2);
  }
}

export const store = new PredictionStore();
