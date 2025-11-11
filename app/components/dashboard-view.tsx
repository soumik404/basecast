'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Bet, Prediction } from '../types/prediction';
import { TrendingUp, Activity, DollarSign, Gift } from 'lucide-react';
import { publicClient } from '../utils/publicClient';
import { PREDICTION_MARKET_ADDRESS } from '@/contracts/config';
import PredictionMarketABI from '@/contracts/PredictionMarket.json';
import { parseEther } from 'viem';
import { useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { config } from '@/lib/wagmi';
import { showBaseToast } from '@/app/utils/toast';
interface DashboardViewProps {
  userAddress?: string;
}

interface BetWithPrediction extends Bet {
  prediction?: Prediction;
}

export function DashboardView({ userAddress }: DashboardViewProps): React.JSX.Element {
  const [bets, setBets] = useState<BetWithPrediction[]>([]);
  const [stats, setStats] = useState({
    totalBets: 0,
    activeBets: 0,
    totalStaked: 0,
    estimatedReturns: 0,
  });
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    if (userAddress) fetchUserBets();
  }, [userAddress]);

  // ✅ Fetch user's bets from on-chain + off-chain
  async function fetchUserBets(): Promise<void> {
    if (!userAddress) return;

    try {
      const nextBetId = await publicClient.readContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI.abi,
        functionName: 'nextBetId',
      });

      const totalBets = Number(nextBetId);
      const userBets: BetWithPrediction[] = [];

      for (let i = 1; i < totalBets; i++) {
        const bet = (await publicClient.readContract({
          address: PREDICTION_MARKET_ADDRESS,
          abi: PredictionMarketABI.abi,
          functionName: 'bets',
          args: [BigInt(i)],
        })) as [bigint, string, boolean, bigint, boolean];

        const [predictionId, user, choice, amount, claimed] = bet;
        if (user.toLowerCase() === userAddress.toLowerCase()) {
          userBets.push({
            id: String(i),
            predictionId: String(Number(predictionId)),
            user,
            choice: choice ? 'yes' : 'no',
            amount: Number(amount) / 1e18,
            claimed,
            timestamp: Date.now(),
          });
        }
      }

      const response = await fetch('/api/predictions/all');
      const { predictions }: { predictions: Prediction[] } = await response.json();

      const merged = userBets.map((b) => ({
        ...b,
        prediction: predictions.find((p) => Number(p.predictionId) === Number(b.predictionId)),
      }));

      setBets(merged);
      calculateStats(merged);
    } catch (error) {
      console.error('❌ Failed to fetch user bets:', error);
    }
  }

  // ✅ Calculate total stats
  function calculateStats(userBets: BetWithPrediction[]): void {
    let totalStaked = 0;
    let estimatedReturns = 0;
    let activeBets = 0;

    userBets.forEach((bet) => {
      totalStaked += bet.amount;
      if (bet.prediction?.status === 'active') {
        activeBets++;
        const totalPool = (bet.prediction.totalYes || 0) + (bet.prediction.totalNo || 0);
        const winningPool =
          bet.choice === 'yes' ? bet.prediction.totalYes || 0 : bet.prediction.totalNo || 0;

        if (winningPool > 0) {
          const payout = (bet.amount / winningPool) * totalPool;
          estimatedReturns += payout;
        }
      } else if (bet.prediction?.status === 'resolved' && bet.payout && !bet.claimed) {
        estimatedReturns += bet.payout;
      }
    });

    setStats({
      totalBets: userBets.length,
      activeBets,
      totalStaked,
      estimatedReturns,
    });
  }

  // ✅ Claim winnings — using writeContractAsync + publicClient confirmation
  async function handleClaim(betId: string): Promise<void> {
    if (!userAddress) return;

    try {
      // 🧠 Show immediate feedback
      showBaseToast('⏳ Preparing transaction... please confirm in your wallet.', 'info');

      const hash = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI.abi,
        functionName: 'claimReward', // ✅ matches your contract
        args: [BigInt(betId)],
        chain: config.chains[0],
      });

      console.log('📡 Claim tx sent:', hash);

      // ✅ Wait for confirmation using same client
      await waitForTransactionReceipt(config, { hash });

      // 🧠 Update Firestore off-chain
      await fetch('/api/predictions/claimstore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betId, userAddress, txHash: hash }),
      });

      showBaseToast('✅ Claimed successfully!', 'success');
      fetchUserBets();
    } catch (error: any) {
      if (error?.name === 'UserRejectedRequestError') {
        showBaseToast('❌ Transaction cancelled by user.', 'error');
      } else {
        console.error('❌ Claim failed:', error);
        showBaseToast('❌ Claim failed: ' + (error?.shortMessage || error?.message || 'unknown error'), 'error');
      }
    }
  }

  if (!userAddress) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50/90 to-white/90 border-blue-200/50">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600 text-lg">Connect your wallet to view your dashboard</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          title="Total Bets"
          value={stats.totalBets.toString()}
          icon={<Activity className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="Active Bets"
          value={stats.activeBets.toString()}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
        <StatsCard
          title="Total Staked"
          value={`${stats.totalStaked.toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
        />
        <StatsCard
          title="Est. Returns"
          value={`${stats.estimatedReturns.toFixed(2)}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* Bets List */}
      <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50/90 to-white/90 border-blue-200/50">
        <CardHeader>
          <CardTitle>Your Bets</CardTitle>
          <CardDescription>All your prediction market positions</CardDescription>
        </CardHeader>
        <CardContent>
          {bets.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No bets placed yet</p>
          ) : (
            <div className="space-y-3">
              {bets.map((bet) => {
                const isWinner =
                  bet.prediction?.status === 'resolved' &&
                  bet.prediction?.result === bet.choice;
                const canClaim = isWinner && !bet.claimed;

                return (
                  <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {bet.prediction?.title || 'Loading...'}
                        </h3>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge className={bet.choice === 'yes' ? 'bg-green-500' : 'bg-red-500'}>
                            {bet.choice.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            Staked: {bet.amount} {bet.prediction?.currency || 'ETH'}
                          </Badge>
                          {bet.prediction?.status === 'resolved' && (
                            <Badge
                              className={
                                isWinner ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
                              }
                            >
                              {isWinner ? 'Won' : 'Lost'}
                            </Badge>
                          )}
                          {bet.claimed && (
                            <Badge className="bg-purple-500 text-white">✓ Claimed</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {canClaim && (
                          <Button
                            onClick={() => handleClaim(bet.id)}
                            size="sm"
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                          >
                            <Gift className="w-4 h-4 mr-1" />
                            Claim Reward
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ Reuse same StatsCard
interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'red';
}

function StatsCard({ title, value, icon, color }: StatsCardProps): React.JSX.Element {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="backdrop-blur-sm bg-gradient-to-br from-white/90 to-blue-50/90 border-blue-200/50">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600 mb-1">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
            <div className={`p-3 rounded-full bg-gradient-to-br ${colorClasses[color]} text-white`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
