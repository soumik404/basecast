import { createPublicClient, createWalletClient, custom, http, parseEther, parseUnits } from 'viem';
import { base } from 'viem/chains';
import PredictionMarketABI from '@/contracts/PredictionMarket.json';
import { PREDICTION_MARKET_ADDRESS, USDC_ADDRESS, isContractConfigured } from '@/contracts/config';

// ============================================
// 🔧 CONTRACT INTEGRATION LAYER
// ============================================
// This file provides functions to interact with your deployed smart contract
// It replaces the mock functions in store.ts

export class ContractService {
  private publicClient;
  
  constructor() {
    // Create public client for reading blockchain data
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });
  }

  // ============================================
  // 📝 CREATE PREDICTION
  // ============================================
  async createPrediction(
    title: string,
    description: string,
    currency: 'USDC' | 'ETH',
    deadline: number,
    maxCapacity: number,
    walletClient: any
  ): Promise<string> {
    if (!isContractConfigured()) {
      throw new Error('Contract not configured. Please update PREDICTION_MARKET_ADDRESS in src/contracts/config.ts');
    }

    const useUSDC = currency === 'USDC';
    const deadlineTimestamp = BigInt(Math.floor(deadline / 1000)); // Convert to seconds
    const capacityBigInt = currency === 'USDC' 
      ? parseUnits(maxCapacity.toString(), 6) // USDC has 6 decimals
      : parseEther(maxCapacity.toString()); // ETH has 18 decimals

    const hash = await walletClient.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'createPrediction',
      args: [title, description, useUSDC, deadlineTimestamp, capacityBigInt],
    });

    // Wait for confirmation
    await this.publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }

  // ============================================
  // 💰 PLACE BET
  // ============================================
  async placeBet(
    predictionId: string,
    choice: 'yes' | 'no',
    amount: number,
    currency: 'USDC' | 'ETH',
    walletClient: any
  ): Promise<string> {
    if (!isContractConfigured()) {
      throw new Error('Contract not configured');
    }

    const choiceBool = choice === 'yes';
    const predictionIdBigInt = BigInt(predictionId);
    const amountBigInt = currency === 'USDC'
      ? parseUnits(amount.toString(), 6)
      : parseEther(amount.toString());

    if (currency === 'USDC') {
      // Need to approve USDC spending first
      await this.approveUSDC(amountBigInt, walletClient);
    }

    const hash = await walletClient.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'placeBet',
      args: [predictionIdBigInt, choiceBool, amountBigInt],
      value: currency === 'ETH' ? amountBigInt : undefined,
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }

  // ============================================
  // 📊 PROPOSE RESULT (Creator only)
  // ============================================
  async proposeResult(
    predictionId: string,
    result: 'yes' | 'no',
    walletClient: any
  ): Promise<string> {
    if (!isContractConfigured()) {
      throw new Error('Contract not configured');
    }

    const predictionIdBigInt = BigInt(predictionId);
    const resultBool = result === 'yes';

    const hash = await walletClient.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'proposeResult',
      args: [predictionIdBigInt, resultBool],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }

  // ============================================
  // ✅ VERIFY RESULT (Verifier only)
  // ============================================
  async verifyResult(
    predictionId: string,
    approve: boolean,
    walletClient: any
  ): Promise<string> {
    if (!isContractConfigured()) {
      throw new Error('Contract not configured');
    }

    const predictionIdBigInt = BigInt(predictionId);

    const hash = await walletClient.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'verifyResult',
      args: [predictionIdBigInt, approve],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }

  // ============================================
  // 🎁 CLAIM REWARD
  // ============================================
  async claimReward(
    predictionId: string,
    walletClient: any
  ): Promise<string> {
    if (!isContractConfigured()) {
      throw new Error('Contract not configured');
    }

    const predictionIdBigInt = BigInt(predictionId);

    const hash = await walletClient.writeContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'claimReward',
      args: [predictionIdBigInt],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }

  // ============================================
  // 💳 APPROVE USDC SPENDING
  // ============================================
  private async approveUSDC(
    amount: bigint,
    walletClient: any
  ): Promise<string> {
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

    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: erc20ABI,
      functionName: 'approve',
      args: [PREDICTION_MARKET_ADDRESS, amount],
    });

    await this.publicClient.waitForTransactionReceipt({ hash });

    return hash;
  }

  // ============================================
  // 📖 READ PREDICTION DATA
  // ============================================
  async getPrediction(predictionId: string): Promise<any> {
    if (!isContractConfigured()) {
      return null;
    }

    const predictionIdBigInt = BigInt(predictionId);

    const data = await this.publicClient.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'getPrediction',
      args: [predictionIdBigInt],
    });

    return data;
  }

  // ============================================
  // 👤 READ USER BET DATA
  // ============================================
  async getUserBet(predictionId: string, userAddress: string): Promise<any> {
    if (!isContractConfigured()) {
      return null;
    }

    const predictionIdBigInt = BigInt(predictionId);

    const data = await this.publicClient.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'getUserBet',
      args: [predictionIdBigInt, userAddress as `0x${string}`],
    });

    return data;
  }

  // ============================================
  // 🔍 CHECK IF VERIFIER
  // ============================================
  async isVerifier(address: string): Promise<boolean> {
    if (!isContractConfigured()) {
      return false;
    }

    const result = await this.publicClient.readContract({
      address: PREDICTION_MARKET_ADDRESS,
      abi: PredictionMarketABI.abi,
      functionName: 'isVerifier',
      args: [address as `0x${string}`],
    });

    return result as boolean;
  }
}

// Export singleton instance
export const contractService = new ContractService();
