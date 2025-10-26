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
  const [potentialPayout, setPotentialPayout] = useState<number>(0);
  const [isResolved, setIsResolved] = useState<boolean>(prediction.status === 'resolved');

  const totalPool: number = prediction.totalYes + prediction.totalNo;
  const yesPercentage: number = totalPool > 0 ? (prediction.totalYes / totalPool) * 100 : 50;
  const noPercentage: number = 100 - yesPercentage;
  
  const capacityPercentage: number = prediction.maxCapacity 
    ? (totalPool / prediction.maxCapacity) * 100 
    : 0;
  const isFull: boolean = prediction.maxCapacity ? totalPool >= prediction.maxCapacity : false;
  const isCreator: boolean = userAddress ? prediction.creator.toLowerCase() === userAddress.toLowerCase() : false;

  const timeLeft: string = getTimeLeft(prediction.deadline);

  async function calculatePayout(choice: 'yes' | 'no', amount: number): Promise<void> {
    try {
      const response: Response = await fetch('/api/predictions/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ predictionId: prediction.id, choice, amount }),
      });
      const data: { potentialPayout: number } = await response.json();
      setPotentialPayout(data.potentialPayout);
    } catch (error: unknown) {
      console.error('Failed to calculate payout:', error);
    }
  }

  async function handleBet(choice: 'yes' | 'no'): Promise<void> {
    if (!onBet || !userAddress || !betAmount || isPlacingBet) return;

    const amount: number = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (isFull) {
      alert('This prediction market is at full capacity!');
      return;
    }

    setIsPlacingBet(true);
    try {
      await onBet(prediction.id, choice, amount);
      setBetAmount('');
      setSelectedChoice(null);
      setPotentialPayout(0);
      alert('Bet placed successfully!');
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : 'Failed to place bet';
      alert(errorMessage);
    } finally {
      setIsPlacingBet(false);
    }
  }

  async function handleResolve(result: 'yes' | 'no'): Promise<void> {
    if (!userAddress || !isCreator) return;

    const confirm: boolean = window.confirm(`Are you sure you want to resolve this prediction as "${result.toUpperCase()}"? This cannot be undone.`);
    if (!confirm) return;

    try {
      const response: Response = await fetch('/api/predictions/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          predictionId: prediction.id, 
          result, 
          resolverAddress: userAddress 
        }),
      });

      if (!response.ok) {
        const error: { error: string } = await response.json();
        throw new Error(error.error);
      }

      setIsResolved(true);
      alert(`Prediction resolved as "${result.toUpperCase()}"!`);
      window.location.reload();
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : 'Failed to resolve prediction';
      alert(errorMessage);
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
            {prediction.maxCapacity && (
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                <span>{capacityPercentage.toFixed(0)}% filled</span>
              </div>
            )}
          </div>
          
          {/* Status Badges */}
          {isResolved && prediction.result && (
            <Badge className="bg-purple-500 text-white mt-2">
              Resolved: {prediction.result.toUpperCase()} wins!
            </Badge>
          )}
          {isFull && !isResolved && (
            <Badge className="bg-orange-500 text-white mt-2">
              FULL CAPACITY
            </Badge>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Capacity Progress (if applicable) */}
          {prediction.maxCapacity && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-gray-700">Pool Capacity</span>
                <span className="text-blue-600">
                  {totalPool.toFixed(0)} / {prediction.maxCapacity.toFixed(0)} {prediction.currency}
                </span>
              </div>
              <Progress 
                value={capacityPercentage} 
                className="h-2 bg-blue-100"
              />
            </div>
          )}

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

          {/* Resolve Buttons (Creator Only) */}
          {isCreator && !isResolved && prediction.status === 'active' && (
            <div className="space-y-2 pt-4 border-t border-blue-100">
              <p className="text-sm font-medium text-gray-700">You are the creator - resolve this prediction:</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleResolve('yes')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Resolve as YES
                </Button>
                <Button
                  onClick={() => handleResolve('no')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Resolve as NO
                </Button>
              </div>
            </div>
          )}

          {/* Betting Interface */}
          {userAddress && onBet && !isResolved && prediction.status === 'active' && (
            <div className="space-y-3 pt-4 border-t border-blue-100">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={betAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value: string = e.target.value;
                    setBetAmount(value);
                    const amount: number = parseFloat(value);
                    if (!isNaN(amount) && amount > 0 && selectedChoice) {
                      calculatePayout(selectedChoice, amount);
                    } else {
                      setPotentialPayout(0);
                    }
                  }}
                  className="flex-1"
                  step="0.01"
                  min="0"
                />
              </div>
              
              {potentialPayout > 0 && (
                <div className="p-2 bg-blue-50 rounded text-sm">
                  <span className="text-gray-700">Potential payout: </span>
                  <span className="font-bold text-blue-600">
                    {potentialPayout.toFixed(2)} {prediction.currency}
                  </span>
                  <span className="text-gray-500 ml-2">
                    ({((potentialPayout / parseFloat(betAmount || '1')) * 100 - 100).toFixed(0)}% profit)
                  </span>
                </div>
              )}
              
              {isFull && (
                <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
                  ⚠️ This market is at full capacity. No more bets can be placed.
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => {
                    setSelectedChoice('yes');
                    handleBet('yes');
                  }}
                  disabled={isPlacingBet || !betAmount || isFull}
                  className="bg-green-500 hover:bg-green-600 text-white"
                  onMouseEnter={() => {
                    const amount: number = parseFloat(betAmount);
                    if (!isNaN(amount) && amount > 0) {
                      calculatePayout('yes', amount);
                      setSelectedChoice('yes');
                    }
                  }}
                >
                  {isPlacingBet && selectedChoice === 'yes' ? 'Betting...' : 'Bet Yes'}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedChoice('no');
                    handleBet('no');
                  }}
                  disabled={isPlacingBet || !betAmount || isFull}
                  className="bg-red-500 hover:bg-red-600 text-white"
                  onMouseEnter={() => {
                    const amount: number = parseFloat(betAmount);
                    if (!isNaN(amount) && amount > 0) {
                      calculatePayout('no', amount);
                      setSelectedChoice('no');
                    }
                  }}
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
