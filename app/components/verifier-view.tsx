'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Prediction } from '../types/prediction';
import { Shield, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface VerifierViewProps {
  userAddress?: string;
}

export function VerifierView({ userAddress }: VerifierViewProps): React.JSX.Element {
  const [pendingPredictions, setPendingPredictions] = useState<Prediction[]>([]);
  const [isVerifier, setIsVerifier] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rejectionReason, setRejectionReason] = useState<Record<string, string>>({});

  useEffect(() => {
    if (userAddress) {
      checkVerifierStatus();
      fetchPendingPredictions();
    }
  }, [userAddress]);

  async function checkVerifierStatus(): Promise<void> {
    try {
      const response: Response = await fetch('/api/verifiers');
      const data: { verifiers: Array<{ address: string; active: boolean }> } = await response.json();
      const isActive: boolean = data.verifiers.some(
        (v: { address: string; active: boolean }) => 
          v.address.toLowerCase() === userAddress?.toLowerCase() && v.active
      );
      setIsVerifier(isActive);
    } catch (error: unknown) {
      console.error('Failed to check verifier status:', error);
    }
  }

  async function fetchPendingPredictions(): Promise<void> {
    setIsLoading(true);
    try {
      const response: Response = await fetch('/api/predictions/pending');
      const data: { predictions: Prediction[] } = await response.json();
      setPendingPredictions(data.predictions);
    } catch (error: unknown) {
      console.error('Failed to fetch pending predictions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(predictionId: string, approve: boolean, reason?: string): Promise<void> {
    if (!userAddress || !isVerifier) return;

    const confirmMessage: string = approve 
      ? 'Approve this result? Payouts will be distributed immediately.'
      : 'Reject this result? The creator will need to propose again.';
    
    const confirm: boolean = window.confirm(confirmMessage);
    if (!confirm) return;

    try {
      const response: Response = await fetch('/api/predictions/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          predictionId, 
          approve, 
          verifierAddress: userAddress,
          rejectionReason: reason 
        }),
      });

      if (!response.ok) {
        const error: { error: string } = await response.json();
        throw new Error(error.error);
      }

      const actionText: string = approve ? 'approved' : 'rejected';
      alert(`Result ${actionText} successfully!`);
      fetchPendingPredictions(); // Refresh list
    } catch (error: unknown) {
      const errorMessage: string = error instanceof Error ? error.message : 'Failed to verify result';
      alert(errorMessage);
    }
  }

  if (!userAddress) {
    return (
      <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50/90 to-white/90 border-blue-200/50">
        <CardContent className="p-12 text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Connect your wallet to access verifier dashboard</p>
        </CardContent>
      </Card>
    );
  }

  if (!isVerifier) {
    return (
      <Card className="backdrop-blur-sm bg-gradient-to-br from-red-50/90 to-white/90 border-red-200/50">
        <CardContent className="p-12 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Not Authorized</h3>
          <p className="text-gray-600 mb-4">
            You are not registered as a verified resolver. Only authorized verifiers can access this dashboard.
          </p>
          <Badge className="bg-red-500 text-white">
            Not a Verifier
          </Badge>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50/90 to-white/90 border-blue-200/50">
        <CardContent className="p-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-600 mt-4">Loading pending verifications...</p>
        </CardContent>
      </Card>
    );
  }

  if (pendingPredictions.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-gradient-to-br from-green-50/90 to-white/90 border-green-200/50">
        <CardContent className="p-12 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">All Clear!</h3>
          <p className="text-gray-600">
            No predictions pending verification at the moment.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Verifier Badge */}
      <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50/90 to-white/90 border-blue-200/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500 rounded-full">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Verified Resolver</h3>
              <p className="text-sm text-gray-600">You have {pendingPredictions.length} prediction(s) to review</p>
            </div>
            <Badge className="ml-auto bg-blue-500 text-white">
              Active Verifier
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pending Predictions */}
      <div className="space-y-4">
        {pendingPredictions.map((prediction: Prediction) => {
          const totalPool: number = prediction.totalYes + prediction.totalNo;
          const yesPercentage: number = totalPool > 0 ? (prediction.totalYes / totalPool) * 100 : 50;

          return (
            <motion.div
              key={prediction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="relative overflow-hidden backdrop-blur-sm bg-gradient-to-br from-yellow-50/90 to-white/90 border-yellow-300/50 shadow-lg">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-bl-full" />
                
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
                    <Badge className="bg-yellow-500 text-white">
                      ⏳ Pending
                    </Badge>
                  </div>

                  <div className="flex gap-4 mt-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>Proposed {getTimeAgo(prediction.proposedAt || Date.now())}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Pool Stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-green-600">Yes: {yesPercentage.toFixed(1)}%</span>
                      <span className="text-red-600">No: {(100 - yesPercentage).toFixed(1)}%</span>
                    </div>
                    <Progress value={yesPercentage} className="h-3 bg-red-200" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{prediction.totalYes.toFixed(2)} {prediction.currency}</span>
                      <span>{prediction.totalNo.toFixed(2)} {prediction.currency}</span>
                    </div>
                  </div>

                  {/* Proposed Result */}
                  <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Creator proposes result:
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className={`${
                        prediction.proposedResult === 'yes' ? 'bg-green-500' : 'bg-red-500'
                      } text-white text-lg px-4 py-1`}>
                        {prediction.proposedResult?.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        Proposed by: {prediction.proposedBy?.slice(0, 6)}...{prediction.proposedBy?.slice(-4)}
                      </span>
                    </div>
                  </div>

                  {/* Rejection Reason Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Rejection Reason (optional, only used if rejecting):
                    </label>
                    <Textarea
                      placeholder="Enter reason for rejection..."
                      value={rejectionReason[prediction.id] || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                        setRejectionReason({ ...rejectionReason, [prediction.id]: e.target.value })
                      }
                      className="min-h-[80px]"
                    />
                  </div>

                  {/* Verification Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-yellow-200">
                    <Button
                      onClick={() => handleVerify(prediction.id, true)}
                      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve & Finalize
                    </Button>
                    <Button
                      onClick={() => handleVerify(prediction.id, false, rejectionReason[prediction.id])}
                      className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject Proposal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const now: number = Date.now();
  const diff: number = now - timestamp;
  
  const minutes: number = Math.floor(diff / (1000 * 60));
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours: number = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  
  const days: number = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days}d ago`;
}
