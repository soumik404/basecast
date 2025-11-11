'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Search } from 'lucide-react';
import { PredictionCard } from './prediction-card';
import type { Prediction } from '../types/prediction';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { showBaseToast } from '@/app/utils/toast';
interface MarketViewProps {
  userAddress?: string;
}

export function MarketsView({ userAddress }: MarketViewProps): React.JSX.Element {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [filtered, setFiltered] = useState<Prediction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'pending_verification' | 'resolved'>('active');

  // ✅ Load predictions from Firestore
  useEffect(() => {
    async function fetchPredictions() {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'predictions'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        // ✅ Normalize prediction data
        const items: Prediction[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const isResolved =
            data.status === 'resolved' ||
            data.resolved === true ||
            data.onChainResolved === true;

          return {
            id: doc.id,
            ...data,
            status: isResolved ? 'resolved' : data.status || 'active',
            resolved: isResolved,
            result: data.result || data.proposedResult || '',
          };
        }) as Prediction[];

        setPredictions(items);
        setFiltered(items);
      } catch (err) {
        console.error('Error loading predictions:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPredictions();
  }, []);

  // ✅ Filter by tab and search
  useEffect(() => {
    let filteredList = predictions;
    const now = Date.now() / 1000;

    const normalizeDeadline = (deadline: number) =>
      deadline > 1e12 ? deadline / 1000 : deadline;

    if (activeTab === 'active') {
      filteredList = filteredList.filter(
        (p) => p.status === 'active' && normalizeDeadline(p.deadline) > now
      );
    } else if (activeTab === 'pending_verification') {
  filteredList = filteredList.filter(
    (p) =>
      !p.onChainResolved && // ❌ Exclude already resolved
      !p.resolved &&        // ❌ Exclude manually marked resolved
      !p.verified &&        // ❌ Exclude verified ones
      (
        p.status === 'pending_verification' ||
        (p.status === 'active' && normalizeDeadline(p.deadline) <= now)
      )
  );

    } else if (activeTab === 'resolved') {
      filteredList = filteredList.filter(
        (p) =>
          p.status === 'resolved' ||
          p.resolved === true ||
          p.onChainResolved === true
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filteredList = filteredList.filter(
        (p) =>
          p.title?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term) ||
          p.creator?.toLowerCase().includes(term)
      );
    }

    setFiltered(filteredList);
  }, [searchTerm, activeTab, predictions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto p-4 space-y-6"
    >
      <Card className="backdrop-blur-sm bg-gradient-to-br from-blue-50/90 to-white/90 border-blue-200/50 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Prediction Markets
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 🔍 Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search predictions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-white/80"
            />
          </div>

          {/* 🗂 Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="bg-blue-100/50">
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending_verification">Pending</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>

            {/* Active Tab */}
            <TabsContent value="active">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-gray-500 text-center py-6">
                  No active predictions found.
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {filtered.map((p) => (
                    <PredictionCard key={p.id} prediction={p} userAddress={userAddress} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Pending Tab */}
            <TabsContent value="pending_verification">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-gray-500 text-center py-6">
                  No pending predictions.
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {filtered.map((p) => (
                    <PredictionCard key={p.id} prediction={p} userAddress={userAddress} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Resolved Tab */}
            <TabsContent value="resolved">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-blue-500 w-6 h-6" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-gray-500 text-center py-6">
                  No resolved predictions yet.
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {filtered.map((p) => (
                    <PredictionCard key={p.id} prediction={p} userAddress={userAddress} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
