import { Address } from 'viem';

// Contract addresses (from environment variables)
export const PREDICTION_MARKET_ADDRESS = (process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || '') as Address;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '') as Address;

// PredictionMarket Contract ABI (minimal - only functions we use)
export const PREDICTION_MARKET_ABI = [
  // Read functions
  {
    inputs: [{ name: 'predictionId', type: 'uint256' }],
    name: 'getPrediction',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'creator', type: 'address' },
          { name: 'token', type: 'address' },
          { name: 'deadline', type: 'uint256' },
          { name: 'maxCapacity', type: 'uint256' },
          { name: 'totalYes', type: 'uint256' },
          { name: 'totalNo', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'proposedResult', type: 'uint8' },
          { name: 'proposedBy', type: 'address' },
          { name: 'proposedAt', type: 'uint256' },
          { name: 'finalResult', type: 'uint8' },
          { name: 'verifiedBy', type: 'address' },
          { name: 'verifiedAt', type: 'uint256' },
          { name: 'rejectionReason', type: 'string' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'betId', type: 'uint256' }],
    name: 'getBet',
    outputs: [
      {
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'predictionId', type: 'uint256' },
          { name: 'user', type: 'address' },
          { name: 'choice', type: 'uint8' },
          { name: 'amount', type: 'uint256' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'claimed', type: 'bool' },
          { name: 'payout', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserBets',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'predictionId', type: 'uint256' }],
    name: 'getPredictionBets',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'predictionId', type: 'uint256' },
      { name: 'choice', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'calculatePotentialPayout',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'verifier', type: 'address' }],
    name: 'verifiers',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write functions
  {
    inputs: [
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'token', type: 'address' },
      { name: 'deadline', type: 'uint256' },
      { name: 'maxCapacity', type: 'uint256' },
    ],
    name: 'createPrediction',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'predictionId', type: 'uint256' },
      { name: 'choice', type: 'uint8' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'placeBet',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'predictionId', type: 'uint256' },
      { name: 'result', type: 'uint8' },
    ],
    name: 'proposeResult',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'predictionId', type: 'uint256' },
      { name: 'approve', type: 'bool' },
      { name: 'rejectionReason', type: 'string' },
    ],
    name: 'verifyResult',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'betId', type: 'uint256' }],
    name: 'claimReward',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'verifier', type: 'address' }],
    name: 'addVerifier',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'verifier', type: 'address' }],
    name: 'removeVerifier',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'predictionId', type: 'uint256' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'title', type: 'string' },
      { indexed: false, name: 'token', type: 'address' },
      { indexed: false, name: 'deadline', type: 'uint256' },
      { indexed: false, name: 'maxCapacity', type: 'uint256' },
    ],
    name: 'PredictionCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'betId', type: 'uint256' },
      { indexed: true, name: 'predictionId', type: 'uint256' },
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'choice', type: 'uint8' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'BetPlaced',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'predictionId', type: 'uint256' },
      { indexed: false, name: 'proposedResult', type: 'uint8' },
      { indexed: true, name: 'proposer', type: 'address' },
    ],
    name: 'ResultProposed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'predictionId', type: 'uint256' },
      { indexed: false, name: 'finalResult', type: 'uint8' },
      { indexed: true, name: 'verifier', type: 'address' },
    ],
    name: 'ResultVerified',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'betId', type: 'uint256' },
      { indexed: true, name: 'user', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' },
    ],
    name: 'RewardClaimed',
    type: 'event',
  },
] as const;

// USDC ERC20 ABI (minimal)
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'faucet',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Helper functions
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
