'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, DollarSign, FileText } from 'lucide-react';
import { useWriteContract } from 'wagmi';
import { base } from 'viem/chains';
import { getAddress } from "viem";

// import { parseEther } from 'viem';
import { PREDICTION_MARKET_ADDRESS } from '@/contracts/config';
import { Abi } from 'viem';
import PredictionMarketABI from '../../contracts/PredictionMarket.json';
interface CreatePredictionViewProps {
  userAddress?: string;
}

export function CreatePredictionView({ userAddress }: CreatePredictionViewProps): React.JSX.Element {
  const [title, setTitle] = useState<string>('');

const TOKEN_ADDRESSES: Record<'ETH' | 'USDC', `0x${string}`> = {
  ETH: '0x0000000000000000000000000000000000000000', // native token placeholder
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bDA02913', // Base mainnet USDC
};

  const [description, setDescription] = useState<string>('');
  const [currency, setCurrency] = useState<'USDC' | 'ETH'>('USDC');
  const [deadline, setDeadline] = useState<string>('');
  const [maxCapacity, setMaxCapacity] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const { writeContractAsync } = useWriteContract(); // ✅ async version

  async function handleCreate(): Promise<void> {
    if (!userAddress) {
      alert('Please connect your wallet first');
      return;
    }

    if (!title || !description || !deadline) {
      alert('Please fill in all fields');
      return;
    }

    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
    if (deadlineTimestamp < Date.now() / 1000) {
      alert('Deadline must be in the future');
      return;
    }

    setIsCreating(true);

    try {
      // --- 🧠 Step 1: Send TX from user wallet (user pays gas)
      const txHash = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI.abi as Abi,
        functionName: 'createPrediction',
        args: [title, description, getAddress(TOKEN_ADDRESSES[currency]), BigInt(deadlineTimestamp), BigInt(maxCapacity || 0)],
        chain: base,
      });

      console.log('Transaction sent:', txHash);
      alert(`✅ Prediction created! TX: ${txHash}`);

      // --- 🧠 Step 2: Save details to backend for display
      const capacityValue = maxCapacity ? parseFloat(maxCapacity) : undefined;
      await fetch('/api/predictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          currency,
          deadline: deadlineTimestamp,
          creator: userAddress,
          maxCapacity: capacityValue,
        }),
      });

      setTitle('');
      setDescription('');
      setDeadline('');
      setMaxCapacity('');
    } catch (error: any) {
      console.error('❌ Error creating prediction:', error);
      alert(error.message || 'Failed to create prediction');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl mx-auto"
    >
      <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50/90 to-white/90 border-blue-200/50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Create New Prediction
          </CardTitle>
          <CardDescription className="text-gray-600">
            Launch a new prediction market for the community to bet on
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 🎯 all your UI unchanged */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Event Title
            </Label>
            <Input
              id="title"
              placeholder="e.g., ETH will reach $5000 by end of year"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/80"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide details about this prediction..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-white/80 min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currency" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Betting Currency
              </Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as 'USDC' | 'ETH')}>
                <SelectTrigger id="currency" className="bg-white/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="ETH">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Deadline
              </Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-white/80"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxCapacity" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Max Pool Capacity (Optional)
            </Label>
            <Input
              id="maxCapacity"
              type="number"
              placeholder="e.g., 100000 (leave empty for unlimited)"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              className="bg-white/80"
              step="100"
              min="0"
            />
            <p className="text-xs text-gray-500">
              Set a maximum betting pool size. When reached, no more bets can be placed.
            </p>
          </div>

          {!userAddress && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Please connect your wallet to create a prediction
              </p>
            </div>
          )}

          <Button
            onClick={handleCreate}
            disabled={!userAddress || isCreating}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            size="lg"
          >
            {isCreating ? 'Creating...' : 'Create Prediction'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
