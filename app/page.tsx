'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WalletDefault } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import { MarketsView } from './components/markets-view';
import { CreatePredictionView } from './components/create-prediction-view';
import { DashboardView } from './components/dashboard-view';
import { LeaderboardView } from './components/leaderboard-view';
import { VerifierView } from './components/verifier-view';
import { TrendingUp, PlusCircle, BarChart3, Trophy, Shield } from 'lucide-react';
import { sdk } from "@farcaster/miniapp-sdk";
import { useContract } from '@/hooks/useContract';
import { usePublicClient } from 'wagmi';
import { publicClient } from "../app/utils/publicClient";

import PredictionMarketABI from '@/contracts/PredictionMarket.json';
import { PREDICTION_MARKET_ADDRESS } from '@/contracts/config';

export default function HomePage(): React.JSX.Element {
    useEffect(() => {
      const initializeFarcaster = async () => {
        try {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (document.readyState !== 'complete') {
            await new Promise(resolve => {
              if (document.readyState === 'complete') {
                resolve(void 0);
              } else {
                window.addEventListener('load', () => resolve(void 0), { once: true });
              }

            });
          }

          await sdk.actions.ready();
          console.log("Farcaster SDK initialized successfully - app fully loaded");
        } catch (error) {
          console.error('Failed to initialize Farcaster SDK:', error);
          setTimeout(async () => {
            try {
              await sdk.actions.ready();
              console.log('Farcaster SDK initialized on retry');
            } catch (retryError) {
              console.error('Farcaster SDK retry failed:', retryError);
            }

          }, 1000);
        }

      };
      initializeFarcaster();
    }, []);
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<string>('markets');
  const [isVerifier, setIsVerifier] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Check if connected address is verifier or owner
 const [isOwner, setIsOwner] = useState<boolean>(false);

useEffect(() => {
  const checkOwner = async () => {
    if (!address) return setIsOwner(false);

    const envOwner = process.env.NEXT_PUBLIC_OWNER_ADDRESS?.toLowerCase();
    if (envOwner) {
      setIsOwner(address.toLowerCase() === envOwner);
      return;
    }

    // fallback to reading from contract if no env set
    try {
      const owner = await publicClient.readContract({
        address: PREDICTION_MARKET_ADDRESS,
        abi: PredictionMarketABI.abi,
        functionName: 'owner',
      }) as string;
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
    } catch (err) {
      console.error('Owner check failed:', err);
      setIsOwner(false);
    }
  };

  checkOwner();
}, [address]);

  // Show verifier tab only if user is verifier or owner
  const showVerifierTab = isOwner;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-blue-200/50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-lg opacity-50" />
                <div className="relative p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  Base Predictions
                </h1>
                <p className="text-xs text-gray-600">Decentralized Prediction Markets</p>
              </div>
            </motion.div>

            {/* Wallet Connect */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <WalletDefault />
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <TabsList className={`grid w-full ${showVerifierTab ? 'grid-cols-5' : 'grid-cols-4'} mb-8 bg-white/80 backdrop-blur-sm border border-blue-200/50 p-1 rounded-xl shadow-lg`}>
            <TabsTrigger
              value="markets"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Markets</span>
            </TabsTrigger>
            <TabsTrigger
              value="create"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Create</span>
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white rounded-lg transition-all"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </TabsTrigger>
            {showVerifierTab && (
              <TabsTrigger
                value="verifier"
                className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-yellow-600 data-[state=active]:text-white rounded-lg transition-all"
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Verifier</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab Content */}
          <AnimatePresence mode="sync">
            <TabsContent value="markets" className="mt-0">
              <motion.div
                key="markets"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Active Markets
                  </h2>
                  <p className="text-gray-600">
                    Browse and bet on active prediction markets
                  </p>
                </div>
                <MarketsView userAddress={address} />
              </motion.div>
            </TabsContent>

            <TabsContent value="create" className="mt-0">
              <motion.div
                key="create"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Create Prediction
                  </h2>
                  <p className="text-gray-600">
                    Launch a new prediction market for the community
                  </p>
                </div>
                <CreatePredictionView userAddress={address} />
              </motion.div>
            </TabsContent>

            <TabsContent value="dashboard" className="mt-0">
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Your Dashboard
                  </h2>
                  <p className="text-gray-600">
                    Track your bets and performance
                  </p>
                </div>
                <DashboardView userAddress={address} />
              </motion.div>
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-0">
              <motion.div
                key="leaderboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    Leaderboard
                  </h2>
                  <p className="text-gray-600">
                    Top performers in prediction markets
                  </p>
                </div>
                <LeaderboardView />
              </motion.div>
            </TabsContent>

            {showVerifierTab && (
              <TabsContent value="verifier" className="mt-0">
                <motion.div
                  key="verifier"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      Verifier Dashboard
                      {isOwner && (
                        <span className="ml-3 text-sm font-normal px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                          Admin
                        </span>
                      )}
                    </h2>
                    <p className="text-gray-600">
                      Review and approve proposed prediction results
                    </p>
                  </div>
                  <VerifierView userAddress={address} />
                </motion.div>
              </TabsContent>
            )}
          </AnimatePresence>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-blue-200/50 backdrop-blur-sm bg-white/50">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="text-sm">
            Built on Base • Build By Gainchainn • Powered by OnchainKit 
          </p>
        </div>
      </footer>
    </div>
  );
}
