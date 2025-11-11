'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { waitForTransactionReceipt, readContract } from '@wagmi/core';
import { config } from '@/lib/wagmi';
import {  useWriteContract } from 'wagmi';

import PredictionMarketABI from '@/contracts/PredictionMarket.json';
import { PREDICTION_MARKET_ADDRESS } from '@/contracts/config';
import { base } from 'viem/chains';
import { showBaseToast } from '@/app/utils/toast';

interface Prediction {
  id: string;
  title: string;
  description: string;
  predictionId: number;
  proposedResult?: 'yes' | 'no';
  proposedBy?: string;
  verified?: boolean;
  verifiedBy?: string;
  deadline: number;
  totalYes?: number;
  totalNo?: number;
  currency?: string;
  result?: string;
  resolved?: boolean;
}

interface VerifierViewProps {
  userAddress?: string;
}

export function VerifierView({ userAddress }: VerifierViewProps): React.JSX.Element {
  const [pendingPredictions, setPendingPredictions] = useState<Prediction[]>([]);
  const [isVerifier, setIsVerifier] = useState<boolean>(false);
     const { writeContractAsync } = useWriteContract();
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'proposed' | 'unresolved'>('proposed');

  // ✅ Check if user is the contract owner (verifier)
  useEffect(() => {
    if (userAddress) checkVerifierStatus();
  }, [userAddress]);

  async function checkVerifierStatus(): Promise<void> {
    try {
      const ownerAddress = (await readContract(config, {
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI.abi,
        functionName: 'owner',
        chainId: base.id,
      })) as string;

      const user = (userAddress || '').toLowerCase();
      const owner = (ownerAddress || '').toLowerCase();
      setIsVerifier(user === owner);
      console.log(`👑 Owner: ${owner} | 👤 User: ${user} | IsVerifier: ${user === owner}`);
    } catch (error) {
      console.error('❌ Owner check failed:', error);
      setIsVerifier(false);
    }
  }

  // ✅ Fetch proposed + unresolved predictions
  useEffect(() => {
    fetchPendingPredictions();
  }, []);

 async function fetchPendingPredictions(): Promise<void> {
  setIsLoading(true);
  try {
    // 🔹 Fetch predictions (main market info)
    const predictionSnap = await getDocs(collection(db, 'predictions'));
    const predictions = predictionSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Prediction[];

    // 🔹 Fetch result proposals (proposed results)
    const proposalSnap = await getDocs(collection(db, 'resultProposals'));
    const proposals = proposalSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as any[];

    const now = Date.now() / 1000;

    // 🔸 Merge proposal info with full prediction data
    const pendingProposals = proposals
      .filter((p) => !p.verified)
      .map((proposal) => {
        const relatedPrediction = predictions.find(
          (pred) => String(pred.predictionId) === String(proposal.predictionId)
        );
        return {
          ...relatedPrediction,
          ...proposal, // proposal overrides some fields like proposedResult
        };
      });

    // 🔸 Expired predictions without any proposal
    const expiredUnresolved = predictions.filter(
      (p) => !p.resolved && !p.proposedResult && Number(p.deadline) <= now
    );

    // ✅ Merge both lists for UI
    const allPending = [...pendingProposals, ...expiredUnresolved];
    setPendingPredictions(allPending);
  } catch (error) {
    console.error('❌ Failed to fetch pending predictions:', error);
  } finally {
    setIsLoading(false);
  }
}

  // ✅ Handle verify or reject
  async function handleVerify(predictionId: string, approve: boolean, reason?: string): Promise<void> {
    if (!userAddress || !isVerifier) return;

    const confirmMessage = approve
      ? '✅ Approve this result? It will be resolved on-chain.'
      : '❌ Reject this result? The creator will need to propose again.';

    if (!window.confirm(confirmMessage)) return;

    try {
      const proposal = pendingPredictions.find((p) => String(p.predictionId) === String(predictionId));
      if (!proposal) throw new Error('Proposal not found');

      if (approve) {
        
        const hash = await writeContractAsync( {
          address: PREDICTION_MARKET_ADDRESS,
          abi: PredictionMarketABI.abi,
          functionName: 'resolvePrediction',
          args: [BigInt(predictionId), proposal.proposedResult === 'yes'],
          chain: base,
          gas: 400000n,

        });

        console.log('📡 Tx sent:', hash);
        await waitForTransactionReceipt(config, { hash });
        console.log('✅ Tx confirmed:', hash);

        await updateDoc(doc(db, 'resultProposals', proposal.id), {
          verified: true,
          verifiedBy: userAddress,
          onChainResolved: true,
        });

        showBaseToast('✅ Prediction verified and resolved on-chain!',    'success');
      } else {
        await updateDoc(doc(db, 'resultProposals', proposal.id), {
          verified: true,
          verifiedBy: userAddress,
          rejected: true,
          rejectionReason: reason || 'No reason provided',
          onChainResolved: false,
        });

        showBaseToast('🚫 Proposal rejected successfully.', 'success');
      }

      fetchPendingPredictions();
    } catch (err: any) {
      console.error('❌ Verification failed:', err);
      showBaseToast('Verification failed: ' + (err.message || 'unknown error'), 'error');
    }
  }

  // ✅ Manual resolve for expired (no proposals)
  async function handleManualResolve(prediction: Prediction, choice: 'yes' | 'no'): Promise<void> {
    if (!userAddress || !isVerifier) return;

    if (!window.confirm(`Manually resolve this prediction as "${choice.toUpperCase()}"?`)) return;

    try {
      const hash = await writeContractAsync({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI.abi,
        functionName: 'resolvePrediction',
        args: [BigInt(prediction.predictionId), choice === 'yes'],
        chain: base,
        gas: 400000n,
      });

      console.log('📡 Tx sent:', hash);
      await waitForTransactionReceipt(config, { hash });
      console.log('✅ Tx confirmed:', hash);

      await updateDoc(doc(db, 'predictions', prediction.id), {
        resolved: true,
        result: choice,
        verifiedBy: userAddress,
        onChainResolved: true,
      });

      showBaseToast(`✅ Manually resolved as "${choice.toUpperCase()}"`, 'success');
      fetchPendingPredictions();
    } catch (error) {
      console.error('❌ Manual resolve failed:', error);
      showBaseToast('Manual resolve failed.', 'error');
    }
  }

  // 🧠 UI States
  if (!userAddress)
    return (
      <Card className="bg-white/70 border-blue-200/50 text-center p-8">
        <Shield className="w-10 h-10 mx-auto text-blue-400 mb-2" />
        <p className="text-gray-600">Connect your wallet to view verifier dashboard</p>
      </Card>
    );

  if (!isVerifier)
    return (
      <Card className="bg-red-50 border-red-300 p-8 text-center">
        <AlertTriangle className="w-10 h-10 mx-auto text-red-500 mb-2" />
        <h3 className="text-lg font-bold text-gray-900">Not Authorized</h3>
        <p className="text-gray-600">Only the contract owner can access this dashboard.</p>
      </Card>
    );

  if (isLoading)
    return (
      <Card className="bg-blue-50 border-blue-200 p-10 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-gray-600 mt-4">Loading pending verifications...</p>
      </Card>
    );

  if (pendingPredictions.length === 0)
    return (
      <Card className="bg-green-50 border-green-300 p-10 text-center">
        <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-2" />
        <h3 className="text-lg font-bold text-gray-900">All Clear!</h3>
        <p className="text-gray-600">No predictions pending verification right now.</p>
      </Card>
    );

  // ✅ UI Rendering
  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200 p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-bold text-gray-900">Verifier Dashboard</h3>
            <p className="text-sm text-gray-600">
              You have {pendingPredictions.length} prediction(s) to review
            </p>
          </div>
        </div>
        <Badge className="bg-blue-500 text-white">Admin (Owner)</Badge>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList className="bg-yellow-100/50">
          <TabsTrigger value="proposed">Proposed Results</TabsTrigger>
          <TabsTrigger value="unresolved">Unresolved (No Proposal)</TabsTrigger>
        </TabsList>

        {/* 🟡 Proposed Results */}
        <TabsContent value="proposed">
          {pendingPredictions.filter((p) => p.proposedResult).length === 0 ? (
            <p className="text-gray-500 text-center py-6">No pending proposed results.</p>
          ) : (
            pendingPredictions
              .filter((p) => p.proposedResult)
              .map((prediction) => (
                <motion.div
                  key={prediction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6 border-yellow-300 bg-yellow-50/90 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold">{prediction.title}</CardTitle>
                      <CardDescription>{prediction.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <Badge
                          className={`${
                            prediction.proposedResult === 'yes'
                              ? 'bg-green-500'
                              : 'bg-red-500'
                          } text-white`}
                        >
                          Proposed: {prediction.proposedResult?.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-600">
                          By {prediction.proposedBy?.slice(0, 6)}...{prediction.proposedBy?.slice(-4)}
                        </span>
                      </div>
                      <Textarea
                        placeholder="Rejection reason (optional)"
                        value={rejectionReason[prediction.id] || ''}
                        onChange={(e) =>
                          setRejectionReason({
                            ...rejectionReason,
                            [prediction.id]: e.target.value,
                          })
                        }
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleVerify(prediction.predictionId.toString(), true)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve & Resolve
                        </Button>
                        <Button
                          onClick={() =>
                            handleVerify(
                              prediction.predictionId.toString(),
                              false,
                              rejectionReason[prediction.id]
                            )
                          }
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
          )}
        </TabsContent>

        {/* 🔴 Unresolved Predictions */}
        <TabsContent value="unresolved">
          {pendingPredictions.filter((p) => !p.proposedResult).length === 0 ? (
            <p className="text-gray-500 text-center py-6">No expired unresolved predictions.</p>
          ) : (
            pendingPredictions
              .filter((p) => !p.proposedResult)
              .map((prediction) => (
                <motion.div
                  key={prediction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6 border-red-300 bg-red-50/90 shadow-md">
                    <CardHeader>
                      <CardTitle className="text-lg font-bold">{prediction.title}</CardTitle>
                      <CardDescription>{prediction.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-gray-600 text-sm">
                        Deadline passed, but creator didn’t propose a result.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={() => handleManualResolve(prediction, 'yes')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Resolve YES
                        </Button>
                        <Button
                          onClick={() => handleManualResolve(prediction, 'no')}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Resolve NO
                        </Button>
                        <Button
  variant="outline"
  onClick={() => fetch('/api/predictions/resync', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ predictionId: prediction.predictionId })
  })}
>
  🔄 Force Sync with Blockchain
</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days}d ago`;
}
