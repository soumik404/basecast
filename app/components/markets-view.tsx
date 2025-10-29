'use client';

import { useEffect, useState } from 'react';
import { PredictionCard } from './prediction-card';
import type { Prediction } from '../types/prediction';
import { Loader2 } from 'lucide-react';
// import { useReadContract, usePublicClient } from 'wagmi';
import { publicClient } from "../utils/publicClient";

import { getAddress } from 'viem';
import PredictionMarketABI from '../../contracts/PredictionMarket.json';
import { Abi } from 'viem';
import { PREDICTION_MARKET_ADDRESS } from '@/contracts/config';

interface MarketsViewProps {
  userAddress?: string;
}

export function MarketsView({ userAddress }: MarketsViewProps): React.JSX.Element {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalPredictions, setTotalPredictions] = useState<number | null>(null);

  // const publicClient = usePublicClient();

  useEffect(() => {
    async function fetchTotalPredictions() {
      if (!publicClient) return;
      try {
        const total = await publicClient.readContract({
          address: getAddress(PREDICTION_MARKET_ADDRESS),
          abi: PredictionMarketABI.abi as Abi,
          functionName: 'nextPredictionId', // 🔁 Make sure this matches your contract
        });

        console.log('Manual totalPredictions read:', total);
        setTotalPredictions(Number(total));
      } catch (err) {
        console.error('Error reading nextPredictionId:', err);
      }
    }

    fetchTotalPredictions();
  }, [publicClient]);
  // ✅ Fetch all predictions from the blockchain
  useEffect(() => {
    async function fetchPredictions() {
      if (!publicClient || !totalPredictions) return;
      try {
        const total = Number(totalPredictions);
        const fetched: Prediction[] = [];

      for (let i = 1; i < total; i++) {
  try {
    const p: any = await publicClient.readContract({
      address: getAddress(PREDICTION_MARKET_ADDRESS),
      abi: PredictionMarketABI.abi as Abi,
      functionName: 'getPrediction',
      args: [BigInt(i)],
    });

    fetched.push({
      id: i.toString(),
      title: p.title,
      description: p.description,
      currency:
        p.token === '0x0000000000000000000000000000000000000000'
          ? 'ETH'
          : 'USDC',
      deadline: Number(p.deadline) * 1000,
      totalYes: Number(p.totalYes),
      totalNo: Number(p.totalNo),
      status: 'active',
      creator: p.creator ?? '0x0000000000000000000000000000000000000000', // ✅ added creator
      createdAt: Date.now(), // fallback if contract doesn’t return timestamp
    });
  } catch (err) {
    console.warn(`Skipping prediction ${i}:`, err);
  }
}


        setPredictions(fetched);
      } catch (err) {
        console.error('Failed to fetch predictions:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPredictions();
  }, [publicClient, totalPredictions]);

  // ✅ Handle betting logic (unchanged)
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

    // await fetchPredictions(); // refresh predictions count if needed
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
