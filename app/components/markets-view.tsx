'use client';

import { useEffect, useState } from 'react';
import { PredictionCard } from './prediction-card';
import type { Prediction } from '../types/prediction';
import { Loader2 } from 'lucide-react';

interface MarketsViewProps {
  userAddress?: string;
}

export function MarketsView({ userAddress }: MarketsViewProps): React.JSX.Element {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchPredictions();
  }, []);

  async function fetchPredictions(): Promise<void> {
    try {
      const response: Response = await fetch('/api/predictions');
      const data: { predictions: Prediction[] } = await response.json();
      setPredictions(data.predictions);
    } catch (error: unknown) {
      console.error('Failed to fetch predictions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBet(
    predictionId: string,
    choice: 'yes' | 'no',
    amount: number
  ): Promise<void> {
    if (!userAddress) {
      throw new Error('Please connect your wallet first');
    }

    const response: Response = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        predictionId,
        user: userAddress,
        amount,
        choice,
      }),
    });

    if (!response.ok) {
      const error: { error: string } = await response.json();
      throw new Error(error.error || 'Failed to place bet');
    }

    // Refresh predictions to show updated totals
    await fetchPredictions();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">No active predictions yet.</p>
        <p className="text-gray-500 text-sm mt-2">Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {predictions.map((prediction: Prediction) => (
        <PredictionCard
          key={prediction.id}
          prediction={prediction}
          onBet={handleBet}
          userAddress={userAddress}
        />
      ))}
    </div>
  );
}
