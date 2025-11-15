'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, DollarSign, FileText } from 'lucide-react';
import { useWriteContract } from 'wagmi';
import { base } from 'viem/chains';
import { Abi, parseEther } from 'viem';
import PredictionMarketABI from '../../contracts/PredictionMarket.json';
import { decodeEventLog } from 'viem';
import { PREDICTION_MARKET_ADDRESS } from '@/contracts/config';
import { publicClient } from '../utils/publicClient';
import { showBaseToast } from '@/app/utils/toast';
import { pl } from 'zod/v4/locales';

interface CreatePredictionViewProps {
  userAddress?: string;
}

export function CreatePredictionView({ userAddress }: CreatePredictionViewProps): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { writeContractAsync } = useWriteContract();

  async function handleCreate() {
    if (!userAddress) return showBaseToast('⚠️ Please connect your wallet first','error');
    if (!title.trim() || !description.trim() || !deadline)
      return showBaseToast('⚠️ Please fill in all fields', 'error');

    const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
    if (deadlineTimestamp < Date.now() / 1000)
      return showBaseToast('⚠️ Deadline must be in the future', 'error');

    // ✅ Validate max capacity
    let capacityWei = 0n;
    if (maxCapacity) {
      const parsed = parseFloat(maxCapacity);
      if (isNaN(parsed) || parsed < 0) {
        return showBaseToast('❌ Invalid capacity. Please enter a positive number.', 'error');
      }
      if (parsed < 0.0001) {
        return showBaseToast('⚠️ Minimum capacity should be at least 0.0001 ETH.', 'error');
      }
      capacityWei = parseEther(maxCapacity); // ✅ convert ETH → wei
    }

    setIsCreating(true);
    try {
      console.log('🧠 Creating prediction on Base...');
      const txHash = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI.abi as Abi,
        functionName: 'createPrediction',
        args: [BigInt(deadlineTimestamp), capacityWei],
        chain: base,
      });

      console.log('📡 Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Decode event to extract predictionId
      const event = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: PredictionMarketABI.abi as Abi,
              data: log.data,
              topics: log.topics,
            }) as { eventName: string; args?: Record<string, any> };
          } catch {
            return null;
          }
        })
        .find((e) => e && e.eventName === 'PredictionCreated');

      const predictionId = event?.args?.predictionId
        ? Number(event.args.predictionId)
        : Date.now();

      console.log('🆔 Prediction Created:', predictionId);

      // ✅ Save to Firestore
      const predictionRef = doc(collection(db, 'predictions'));
      await setDoc(predictionRef, {
        title,
        description,
        predictionId,
        deadline: deadlineTimestamp,
        maxCapacity: parseFloat(maxCapacity) || 0,
        creator: userAddress,
        txHash,
        createdAt: Date.now(),
        status: 'active',
        totalYes: 0,
        totalNo: 0,
      });

      showBaseToast('✅ Prediction created successfully', 'success');

      setTitle('');
      setDescription('');
      setDeadline('');
      setMaxCapacity('');
    } catch (error: any) {
      showBaseToast('❌ Transaction failed: ' + (error?.message || 'Unknown error'), 'error');
      
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
          <CardTitle className="text-2xl font-bold text-gray-900">Create New Prediction</CardTitle>
          <CardDescription className="text-gray-600">
            Launch a new prediction market for the community to bet on
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Event Title
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
              <Label htmlFor="deadline" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Deadline
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
              <DollarSign className="w-4 h-4" /> Max Pool Capacity (Optional)
            </Label>
            <Input
              id="maxCapacity"
              type="number"
              placeholder="e.g., 10 (leave empty for unlimited)"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              className="bg-white/80"
              step="0.01"
              min="0"
            />
            <p className="text-xs text-gray-500">
              Example: Enter “10” for 10 ETH max. Leave empty for unlimited.
            </p>
          </div>

          <Button
            onClick={handleCreate}
            disabled={!userAddress || isCreating}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
            size="lg"
          >
            {isCreating ? '⏳ Creating...' : 'Create Prediction'}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
