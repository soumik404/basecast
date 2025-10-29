import { NextResponse } from 'next/server'
import { createConfig, getPublicClient, getWalletClient } from '@wagmi/core'
import { base } from 'viem/chains'
import { http } from 'viem'
import { createPrediction } from '@/lib/createPrediction'
import PredictionMarketABI from '@/abis/PredictionMarket.json'
import { PREDICTION_MARKET_ADDRESS, USDC_ADDRESS } from '@/config'

// --- Wagmi Client Setup (Base Mainnet) ---
const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
})

/**
 * POST /api/create-prediction
 * Body: { address, title, description, useUSDC, deadline, maxCapacity }
 */
export async function POST(req) {
  try {
    const body = await req.json()
    const { address, title, description, useUSDC, deadline, maxCapacity } = body

    if (!address || !title || !description || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Connect wallet from client session (user signs tx in frontend)
    const walletClient = await getWalletClient(config)
    const publicClient = getPublicClient(config)

    if (!walletClient) {
      return NextResponse.json(
        { error: 'No connected wallet found. Please connect wallet.' },
        { status: 401 }
      )
    }

    // Execute contract call
    const result = await createPrediction({
      walletClient,
      publicClient,
      address,
      title,
      description,
      useUSDC,
      deadline,
      maxCapacity,
    })

    return NextResponse.json({
      success: true,
      message: 'Prediction created successfully!',
      txHash: result.txHash,
      chain: 'Base Mainnet',
    })
  } catch (error) {
    console.error('❌ Error creating prediction:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create prediction' },
      { status: 500 }
    )
  }
}
