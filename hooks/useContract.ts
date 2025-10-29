'use client';

import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, parseUnits, formatUnits } from 'viem';
import PredictionMarketABI from '../contracts/PredictionMarket.json';
import { PREDICTION_MARKET_ADDRESS, USDC_ADDRESS } from '@/contracts/config';
import { useState, useEffect } from 'react';
import { publicClient } from "../app/utils/publicClient";
import { base } from 'wagmi/chains';
import { useSwitchChain } from 'wagmi';
import { WalletClient } from 'viem';

// Enums
export const BetChoice = {
  Yes: 0,
  No: 1,
} as const;

export const PredictionStatus = {
  Active: 0,
  PendingVerification: 1,
  Resolved: 2,
  Cancelled: 3,
} as const;

export function useContract() {
  const { address } = useAccount();
  // const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [isVerifierUser, setIsVerifierUser] = useState(false);
  const [isOwnerUser, setIsOwnerUser] = useState(false);

  // ✅ Check if connected user is verifier or owner
  useEffect(() => {
    const checkRole = async () => {
      if (!address || !publicClient) return;

      try {
        const verifierStatus = await publicClient.readContract({
          address: PREDICTION_MARKET_ADDRESS,
          abi: PredictionMarketABI.abi,
          functionName: 'verifiers',
          args: [address],
        }) as boolean;

        const ownerAddress = await publicClient.readContract({
          address: PREDICTION_MARKET_ADDRESS,
          abi: PredictionMarketABI.abi,
          functionName: 'owner',
        }) as `0x${string}`;

        setIsVerifierUser(verifierStatus);
        setIsOwnerUser(ownerAddress.toLowerCase() === address.toLowerCase());
      } catch (error) {
        console.error('❌ Role check failed:', error);
        setIsVerifierUser(false);
        setIsOwnerUser(false);
      }
    };

    checkRole();
  }, [address, publicClient]);

  // ============================================
  // 📖 READ FUNCTIONS
  // ============================================

  const getPrediction = async (predictionId: bigint) => {
    return publicClient!.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'getPrediction',
      args: [predictionId],
    });
  };

  const getBet = async (betId: bigint) => {
    return publicClient!.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'getBet',
      args: [betId],
    });
  };

  const getUserBets = async (userAddress: `0x${string}`): Promise<bigint[]> => {
    return publicClient!.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'getUserBets',
      args: [userAddress],
    }) as Promise<bigint[]>;
  };

  const getPredictionBets = async (predictionId: bigint): Promise<bigint[]> => {
    return publicClient!.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'getPredictionBets',
      args: [predictionId],
    }) as Promise<bigint[]>;
  };

  const getNextPredictionId = async (): Promise<bigint> => {
    return publicClient!.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'nextPredictionId',
    }) as Promise<bigint>;
  };

  // ✅ Updated — call the mapping getter directly
  const isVerifier = async (verifierAddress: `0x${string}`): Promise<boolean> => {
    return publicClient!.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'verifiers',
      args: [verifierAddress],
    }) as Promise<boolean>;
  };

  const getOwner = async (): Promise<`0x${string}`> => {
    return publicClient!.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'owner',
    }) as Promise<`0x${string}`>;
  };

  const getFeeCollector = async (): Promise<`0x${string}`> => {
    return publicClient!.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'feeCollector',
    }) as Promise<`0x${string}`>;
  };

  const getPlatformFeeBPS = async (): Promise<bigint> => {
    return publicClient!.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'PLATFORM_FEE_BPS',
    }) as Promise<bigint>;
  };

  // ============================================
  // ✍️ WRITE FUNCTIONS
  // ============================================

  const createPrediction = async (title: string, description: string, useUSDC: boolean, deadline: bigint, maxCapacity: bigint) => {
    const tokenAddress = useUSDC ? USDC_ADDRESS : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const hash = await walletClient!.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'createPrediction',
      args: [title, description, tokenAddress, deadline, maxCapacity],
      account: address!,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  };







  const placeBet = async (predictionId: bigint, isYes: boolean, amount: bigint, useUSDC: boolean) => {
    const choice = isYes ? BetChoice.Yes : BetChoice.No;
    const tx = {
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'placeBet',
      args: [predictionId, choice, amount],
      account: address!,
    } as const;

    const hash = useUSDC
      ? await walletClient!.writeContract(tx)
      : await walletClient!.writeContract({ ...tx, value: amount });

    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  };

  const proposeResult = async (predictionId: bigint, isYes: boolean) => {
    const result = isYes ? BetChoice.Yes : BetChoice.No;
    const hash = await walletClient!.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'proposeResult',
      args: [predictionId, result],
      account: address!,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  };

  const verifyResult = async (predictionId: bigint, approve: boolean, rejectionReason: string = '') => {
    const hash = await walletClient!.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'verifyResult',
      args: [predictionId, approve, rejectionReason],
      account: address!,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  };

  const claimReward = async (betId: bigint) => {
    const hash = await walletClient!.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'claimReward',
      args: [betId],
      account: address!,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  };

  const addVerifier = async (verifierAddress: `0x${string}`) => {
    const hash = await walletClient!.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'addVerifier',
      args: [verifierAddress],
      account: address!,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  };

  const removeVerifier = async (verifierAddress: `0x${string}`) => {
    const hash = await walletClient!.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'removeVerifier',
      args: [verifierAddress],
      account: address!,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  };

  // ============================================
  // 💰 USDC Approval
  // ============================================

  const approveUSDC = async (amount: bigint) => {
    const erc20ABI = [
      {
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ];

    const hash = await walletClient!.writeContract({
      address: USDC_ADDRESS,
      abi: erc20ABI,
      functionName: 'approve',
      args: [PREDICTION_MARKET_ADDRESS, amount],
      account: address!,
    });
    await publicClient!.waitForTransactionReceipt({ hash });
    return hash;
  };

  // ============================================
  // 🧮 Utils
  // ============================================

  const parseAmount = (amount: string, currency: 'ETH' | 'USDC') =>
    currency === 'ETH' ? parseEther(amount) : parseUnits(amount, 6);

  const formatAmount = (amount: bigint, currency: 'ETH' | 'USDC') =>
    currency === 'ETH' ? formatUnits(amount, 18) : formatUnits(amount, 6);

  // ============================================
  // 🔁 Return All
  // ============================================

  return {
    getPrediction,
    getBet,
    getUserBets,
    getPredictionBets,
    getNextPredictionId,
    isVerifier,
    getOwner,
    getFeeCollector,
    getPlatformFeeBPS,
    createPrediction,
    placeBet,
    proposeResult,
    verifyResult,
    claimReward,
    addVerifier,
    removeVerifier,
    approveUSDC,
    parseAmount,
    formatAmount,
    address,
    isConnected: !!address,
    isVerifierUser,
    isOwnerUser,
    canAccessVerifierTab: isVerifierUser || isOwnerUser,
  };
}
