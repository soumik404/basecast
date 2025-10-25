'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { LeaderboardEntry } from '../types/prediction';
import { Trophy, TrendingUp, Target } from 'lucide-react';

export function LeaderboardView(): React.JSX.Element {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard(): Promise<void> {
    try {
      const response: Response = await fetch('/api/leaderboard');
      const data: { leaderboard: LeaderboardEntry[] } = await response.json();
      setLeaderboard(data.leaderboard);
    } catch (error: unknown) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading leaderboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50/90 to-white/90 border-blue-200/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Leaderboard
              </CardTitle>
              <CardDescription className="text-gray-600">
                Top performers in prediction markets
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No leaderboard data yet. Start betting to appear here!
            </p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry: LeaderboardEntry, index: number) => (
                <motion.div
                  key={entry.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <LeaderboardRow entry={entry} rank={index + 1} />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
}

function LeaderboardRow({ entry, rank }: LeaderboardRowProps): React.JSX.Element {
  const getRankBadge: (position: number) => React.JSX.Element | null = (position: number) => {
    if (position === 1) {
      return <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white">🥇</Badge>;
    }
    if (position === 2) {
      return <Badge className="bg-gradient-to-r from-gray-300 to-gray-400 text-white">🥈</Badge>;
    }
    if (position === 3) {
      return <Badge className="bg-gradient-to-r from-orange-400 to-orange-600 text-white">🥉</Badge>;
    }
    return null;
  };

  const shortAddress: string = `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`;
  const isProfitable: boolean = entry.totalProfit >= 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-all hover:shadow-md">
      {/* Rank */}
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 font-bold text-blue-700">
        {rank}
      </div>

      {/* Avatar & Address */}
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
          {entry.address.slice(2, 4).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{shortAddress}</span>
          {getRankBadge(rank)}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm">
        <div className="text-right">
          <div className="flex items-center gap-1 text-gray-600">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs">Profit</span>
          </div>
          <span className={`font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            {isProfitable ? '+' : ''}{entry.totalProfit.toFixed(2)}
          </span>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-gray-600">
            <Target className="w-3 h-3" />
            <span className="text-xs">Win Rate</span>
          </div>
          <span className="font-bold text-blue-600">
            {entry.winRate.toFixed(1)}%
          </span>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-600">Bets</div>
          <span className="font-bold text-gray-700">{entry.totalBets}</span>
        </div>
      </div>
    </div>
  );
}
