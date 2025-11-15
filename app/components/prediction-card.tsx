'use client';
import { useEffect } from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Prediction } from '../types/prediction';
import { Clock, TrendingUp, Users } from 'lucide-react';
import { writeContract } from 'wagmi/actions';
import { readContract, readContracts, waitForTransactionReceipt } from '@wagmi/core';
import { parseEther } from 'viem';
import PredictionMarketABI from '../../contracts/PredictionMarket.json';
import { base } from 'viem/chains';
import { PREDICTION_MARKET_ADDRESS } from '../../contracts/config';
import { config } from '../../lib/wagmi'; 
import {  useWriteContract } from 'wagmi';
import { useReadContract } from "wagmi";
import { publicClient } from '../utils/publicClient';
import { no } from 'zod/v4/locales';
import { showBaseToast } from '@/app/utils/toast';
// import { walletClient, publicClient, baseSepolia } from '../utils/publicClient';


interface PredictionCardProps {
  prediction: Prediction;
  onBet?: (predictionId: string, choice: 'yes' | 'no', amount: number) => Promise<void>;
  userAddress?: string;
}

export function PredictionCard({ prediction, onBet, userAddress }: PredictionCardProps): React.JSX.Element {
const [userBetChoice, setUserBetChoice] = useState<'yes' | 'no' | undefined>(undefined);
  const [betAmount, setBetAmount] = useState<string>('');
   const { writeContractAsync } = useWriteContract();
  const [isPlacingBet, setIsPlacingBet] = useState<boolean>(false);
  const [selectedChoice, setSelectedChoice] = useState<'yes' | 'no' | null>(null);
  const [potentialPayout, setPotentialPayout] = useState<number>(0);
  const [isResolved, setIsResolved] = useState<boolean>(prediction.status === 'resolved');
  const [isPendingVerification, setIsPendingVerification] = useState<boolean>(prediction.status === 'pending_verification');

  const totalPool: number = prediction.totalYes + prediction.totalNo;
  const yesPercentage: number = totalPool > 0 ? (prediction.totalYes / totalPool) * 100 : 50;
  const noPercentage: number = 100 - yesPercentage;
  
  const capacityPercentage: number = prediction.maxCapacity 
    ? (totalPool / prediction.maxCapacity) * 100 
    : 0;
  const isFull: boolean = prediction.maxCapacity ? totalPool >= prediction.maxCapacity : false;
  const isCreator: boolean = userAddress ? prediction.creator.toLowerCase() === userAddress.toLowerCase() : false;

  const timeLeft: string = getTimeLeft(prediction.deadline);
const notconnect: boolean = !userAddress;
async function getUserBetForPrediction(userAddress: string, predictionId: number) {
  const nextBetId = await publicClient.readContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PredictionMarketABI.abi,
    functionName: "nextBetId",
  });

  const totalBets = Number(nextBetId) - 1;
  // console.log(`🔍 Scanning ${totalBets} bets for user ${userAddress}`);

  for (let i = 1; i <= totalBets; i++) {
    // ✅ Tell TypeScript what we expect back
    const bet = (await publicClient.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: "bets",
      args: [BigInt(i)],
    })) as [bigint, string, boolean, bigint, boolean]; // [predictionId, user, choice, amount, claimed]

    // console.log(`📦 Raw bet #${i}:`, bet);

    // 🧠 Extract data from the tuple
    const [predIdBig, user, choice, amount, claimed] = bet;
    const predId = Number(predIdBig);

    // Log everything clearly
    // console.log(`🔎 Bet #${i} → predictionId=${predId}, user=${user}, choice=${choice}`);

    // ✅ Check for user + prediction match
    if (
      user &&
      user.toLowerCase() === userAddress.toLowerCase() &&
      predId === predictionId
    ) {
      // console.log(`✅ Found match! Prediction ${predictionId}, Choice=${choice ? 'YES' : 'NO'}`);
      return { choice, amount };
    }
  }

  // console.log(`ℹ️ No bet found for user ${userAddress} on prediction ${predictionId}`);
  return null;
}




// 🧠 Auto-detect user bet for this specific prediction
useEffect(() => {
  const checkUserBet = async () => {
    if (!userAddress || !prediction?.predictionId) return;

    try {
      const result = await getUserBetForPrediction(userAddress, Number(prediction.predictionId));
      if (result) {
        const choice = result.choice ? 'yes' : 'no';
        setUserBetChoice(choice);
      } else {
        setUserBetChoice(undefined);
      }
    } catch (err) {
      console.error("❌ Error checking user bet:", err);
    }
  };

  checkUserBet();
}, [userAddress, prediction?.predictionId]);

  
  async function saveBetOffchain(predictionId: string, userAddress: string, choice: 'yes' | 'no', amount: number) {
  try {
    const res = await fetch('/api/predictions/betstore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId, userAddress, choice, amount }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save bet');
    console.log('✅ Bet Succesfull');
  } catch (err) {
    console.error('❌ Error bet');
  }
}


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

  
async function handleBet(predictionId: bigint, choice: 'yes' | 'no', betAmount: string): Promise<void> {
  if (!userAddress || !betAmount || isPlacingBet) return;

  setIsPlacingBet(true); // disable button instantly
  let message: HTMLDivElement | null = null; // toast reference

  try {
    console.log("💡 Checking if user already bet...");
    const existingBet = await getUserBetForPrediction(userAddress, Number(predictionId));

    if (existingBet) {
      const previousChoice = existingBet.choice ? 'yes' : 'no';
      showBaseToast(`You already bet "${previousChoice.toUpperCase()}" on this prediction.`, 'error');
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      showBaseToast('Enter a valid amount', 'error');
      return;
    }

    // 🧠 Create toast element (immediate feedback)
    message = document.createElement('div');
    message.innerText = "⏳ Preparing transaction... please wait for your wallet popup";
    message.style.position = 'fixed';
    message.style.top = '20px';
    message.style.right = '20px';
    message.style.padding = '10px 15px';
    message.style.background = '#2563eb';
    message.style.color = 'white';
    message.style.borderRadius = '8px';
    message.style.zIndex = '9999';
    message.setAttribute('role', 'tx-toast');
    document.body.appendChild(message);

    // 🚀 Send transaction
    const hash = await writeContractAsync({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'placeBet',
      args: [predictionId, choice === 'yes'],
      value: parseEther(betAmount),
      chain: base,
      gas: 400000n,
    });

    console.log('✅ Transaction sent:', hash);

    showBaseToast('✅ Transaction sent! Waiting for confirmation...', 'info');

    // 🕐 Wait for confirmation
    await waitForTransactionReceipt(config, { hash });

    showBaseToast('✅ Bet placed successfully!', 'success');
    console.log('🧾 Bet confirmed on-chain:', hash);

    await saveBetOffchain(predictionId.toString(), userAddress, choice, parseFloat(betAmount));

    setBetAmount('');
    setSelectedChoice(null);
    setPotentialPayout(0);
    setUserBetChoice(choice);
  } catch (err: any) {
    console.error('❌ Bet failed:', err);

    // 🧹 Handle user rejection gracefully
    if (err?.name === 'UserRejectedRequestError' || err?.message?.includes('User rejected')) {
      showBaseToast('❌ You canceled the transaction.', 'error');
    } else {
      showBaseToast('❌ Bet failed: ' + (err?.shortMessage || err?.message || 'Transaction reverted'),  'error');
    }
  } finally {
    // 🧹 Always cleanup
    setIsPlacingBet(false);
    if (message && document.body.contains(message)) {
      document.body.removeChild(message);
    }
  }
}






async function handleProposeResult(result: 'yes' | 'no'): Promise<void> {
  if (!userAddress || !isCreator) return;

  const confirm = window.confirm(`Propose "${result.toUpperCase()}" as result?`);
  if (!confirm) return;

  try {
    const res = await fetch('/api/predictions/propose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        predictionId: prediction.predictionId,
        proposedResult: result,
        creator: userAddress,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to propose result');

    showBaseToast(`✅ Proposed "${result.toUpperCase()}" successfully. Waiting for verifier.`, 'success');
  } catch (err: any) {
    console.error('❌ Proposal failed:', err);
    showBaseToast('❌ Failed: ' + err.message, 'error');
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
              ETH
            </Badge>
          </div>
          
          <div className="flex gap-4 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{timeLeft}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{totalPool.toFixed(2)} ETH</span>
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
              ✓ Resolved: {prediction.result.toUpperCase()} wins!
            </Badge>
          )}
          {isPendingVerification && prediction.proposedResult && (
            <Badge className="bg-yellow-500 text-white mt-2">
              ⏳ Pending Verification: {prediction.proposedResult.toUpperCase()} proposed
            </Badge>
          )}
          {prediction.rejectionReason && (
            <Badge className="bg-red-500 text-white mt-2">
              ⚠️ Rejected: {prediction.rejectionReason}
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
                  {totalPool.toFixed(0)} / {prediction.maxCapacity.toFixed(0)} ETH
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
              <span>{prediction.totalYes.toFixed(2)} ETH</span>
              <span>{prediction.totalNo.toFixed(2)} ETH</span>
            </div>
          </div>

          {/* Propose Result Buttons (Creator Only) */}
          {isCreator && !isResolved && !isPendingVerification && prediction.status === 'active' && prediction.deadline < Date.now() && (
            <div className="space-y-2 pt-4 border-t border-blue-100">
              <p className="text-sm font-medium text-gray-700">You are the creator - propose result:</p>
              <p className="text-xs text-gray-500">A verifier will need to approve your proposal before payouts are distributed.</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handleProposeResult('yes')}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Propose YES
                </Button>
                <Button
                  onClick={() => handleProposeResult('no')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Propose NO
                </Button>
              </div>
            </div>
          )}
          
          {/* Pending Verification Status (Creator) */}
          {isCreator && isPendingVerification && (
            <div className="space-y-2 pt-4 border-t border-blue-100">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm font-medium text-yellow-800">⏳ Waiting for Verifier Approval</p>
                <p className="text-xs text-yellow-600 mt-1">
                  You proposed: <span className="font-bold">{prediction.proposedResult?.toUpperCase()}</span>
                </p>
              </div>
            </div>
          )}

          {/* Betting Interface */}
          {/* Betting Interface */}
           {notconnect && (
        <div className="p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-700">
          ⚠️ Please connect your wallet to place a bet.
        </div>
      )}
{userAddress &&
  !isResolved &&
  !isPendingVerification &&
  prediction.status === 'active' &&
  !isExpired(prediction.deadline) ? (
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
            {potentialPayout.toFixed(2)} ETH
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
     

      {userBetChoice && (
        <div className="text-sm text-gray-700 mb-2">
          You already bet on:{' '}
          <span
            className={`font-bold ${
              userBetChoice === 'yes' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {userBetChoice.toUpperCase()}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => {
            setSelectedChoice('yes');
            handleBet(BigInt(prediction.predictionId), 'yes', betAmount);
          }}
          disabled={Boolean(
            isPlacingBet ||
              !betAmount ||
              isFull ||
              (userBetChoice && userBetChoice !== 'yes')
          )}
          className="bg-green-500 hover:bg-green-600 text-white"
        >
          {isPlacingBet && selectedChoice === 'yes' ? 'Betting...' : 'Bet Yes'}
        </Button>

        <Button
          onClick={() => {
            setSelectedChoice('no');
            handleBet(BigInt(prediction.predictionId), 'no', betAmount);
          }}
          disabled={Boolean(
            isPlacingBet ||
              !betAmount ||
              isFull ||
              (userBetChoice && userBetChoice !== 'no')
          )}
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          {isPlacingBet && selectedChoice === 'no' ? 'Betting...' : 'Bet No'}
        </Button>
      </div>
    </div>
  ) : (
    

    // 🧠 When expired or resolved
    <div className="pt-4 border-t border-blue-100 text-center text-gray-500 text-sm">
      ⚠️ Betting closed, prediction expired or resolved.
    </div>
  )}

        </CardContent>
      </Card>
    </motion.div>
  );
}

function getTimeLeft(deadline: number): string {
  const now = Date.now();
  const diff = deadline * 1000 - now; // ✅ convert seconds → milliseconds

  if (diff < 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h left`;

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${minutes}m left`;
}
function isExpired(deadline: number): boolean {
  // Convert deadline from seconds → milliseconds
  return Date.now() > deadline * 1000;
}