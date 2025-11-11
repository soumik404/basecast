import { base, baseSepolia } from 'viem/chains';

// ============================================
// 🔧 CONTRACT CONFIGURATION
// ============================================
// Update these values with your deployed contract addresses

export const PREDICTION_MARKET_ADDRESS = '0xE32386066aF9A781542ecA92eD5FBF7bc2308Ae0' as `0x${string}`;

// Base USDC token address (mainnet)
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`;

// Chain configuration
export const CHAIN = base;
export const CHAIN_ID = base.id; // 8453 for Base mainnet

// Contract deployment info
export const CONTRACT_INFO = {
  network: 'Base Mainnet',
  chainId: CHAIN_ID,
  predictionMarket: PREDICTION_MARKET_ADDRESS,
  usdc: USDC_ADDRESS,
  explorer: `https://basescan.org/address/${PREDICTION_MARKET_ADDRESS}`,
};

// ============================================
// 📝 SETUP INSTRUCTIONS
// ============================================
// 1. Deploy your PredictionMarket contract on Base mainnet via Remix
// 2. Copy the deployed contract address
// 3. Replace PREDICTION_MARKET_ADDRESS above with your contract address
// 4. Make sure you deployed with the correct USDC token address
// 5. Save this file and restart your app

export const isContractConfigured = (): boolean => {
  return PREDICTION_MARKET_ADDRESS !== '0x0000000000000000000000000000000000000000';
};
