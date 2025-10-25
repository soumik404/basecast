'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Prediction } from '../types/prediction';
import { Clock, TrendingUp, Users } from 'lucide-react';

interface PredictionCardProps {
  prediction: Prediction;
  onBet?: (predictionId: string, choice: 'yes' | 'no', amount: number) => Promise<void>;
  userAddress?: string;
}

export function PredictionCard({ prediction, onBet, userAddress }: PredictionCardProps): React.JSX.Element {
  const [betAmount, setBetAmount] = useState<string>('');
  const [isPlacingBet, setIsPlacingBet] = useState<boolean>(false);
  const [selectedChoice, setSelectedChoice] = useState<'yes' | 'no' | null>(null);

  const totalPool: number = prediction.totalYes + prediction.totalNo;
  const yesPercentage: number = totalPool > 0 ? (prediction.totalYes / totalPool) * 100 : 50;
  const noPercentage: number = 100 - yesPercentage;

  const timeLeft: string = getTimeLeft(prediction.deadline);

  async function handleBet(choice: 'yes' | 'no'): Promise<void> {
    if (!onBet || !userAddress || !betAmount || isPlacingBet) return;

    const amount: number = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsPlacingBet(true);
    try {
      await onBet(prediction.id, choice, amount);
      setBetAmount('');
      setSelectedChoice(null);
      alert('Bet placed successfully!');
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : 'Failed to place bet';
      alert(errorMessage);
    } finally {
      setIsPlacingBet(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden backdrop-blur-sm bg-gradient-to-br from-blue-50/90 to-white/90 border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-transparent rounded-bl-full" />
        
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                {prediction.title}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {prediction.description}
              </CardDescription>
            </div>
            <Badge className="bg-blue-500 text-white">
              {prediction.currency}
            </Badge>
          </div>
          
          <div className="flex gap-4 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{timeLeft}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{totalPool.toFixed(2)} {prediction.currency}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Yes/No Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-green-600">Yes: {yesPercentage.toFixed(1)}%</span>
              <span className="text-red-600">No: {noPercentage.toFixed(1)}%</span>
            </div>
            <Progress 
              value={yesPercentage} 
              className="h-3 bg-red-200"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{prediction.totalYes.toFixed(2)} {prediction.currency}</span>
              <span>{prediction.totalNo.toFixed(2)} {prediction.currency}</span>
            </div>
          </div>

          {/* Betting Interface */}
          {userAddress && onBet && (
            <div className="space-y-3 pt-4 border-t border-blue-100">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={betAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBetAmount(e.target.value)}
                  className="flex-1"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    setSelectedChoice('yes');
                    handleBet('yes');
                  }}
                  disabled={isPlacingBet || !betAmount}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {isPlacingBet && selectedChoice === 'yes' ? 'Betting...' : 'Bet Yes'}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedChoice('no');
                    handleBet('no');
                  }}
                  disabled={isPlacingBet || !betAmount}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  {isPlacingBet && selectedChoice === 'no' ? 'Betting...' : 'Bet No'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function getTimeLeft(deadline: number): string {
  const now: number = Date.now();
  const diff: number = deadline - now;

  if (diff < 0) return 'Expired';

  const days: number = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours: number = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;
  
  const minutes: number = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m left`;
}
