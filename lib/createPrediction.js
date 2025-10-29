import { writeContract, waitForTransactionReceipt } from '@wagmi/core'
import { base } from 'viem/chains'
import PredictionMarketABI from '../abis/PredictionMarket.json'
import { PREDICTION_MARKET_ADDRESS, USDC_ADDRESS } from '../config'

/**
 * Create a new prediction on the Prediction Market contract.
 * 
 * @param {Object} params
 * @param {import('viem').WalletClient} params.walletClient - Connected wallet client
 * @param {import('viem').PublicClient} params.publicClient - Public client for reading/waiting
 * @param {string} params.address - Wallet address of the user
 * @param {string} params.title - Title of the prediction
 * @param {string} params.description - Description
 * @param {boolean} params.useUSDC - Whether to use USDC or ETH
 * @param {bigint|string} params.deadline - Deadline timestamp (in seconds)
 * @param {bigint|string} params.maxCapacity - Max capacity (optional)
 */
export async function createPrediction({
  walletClient,
  publicClient,
  address,
  title,
  description,
  useUSDC,
  deadline,
  maxCapacity,
}) {
  if (!walletClient || !publicClient) {
    throw new Error('Wallet not connected or public client not available.')
  }

  // Ensure BigInt values
  const deadlineBig = typeof deadline === 'bigint' ? deadline : BigInt(deadline)
  const capacityBig = typeof maxCapacity === 'bigint' ? maxCapacity : BigInt(maxCapacity || 0)

  // Token selection
  const tokenAddress = useUSDC ? USDC_ADDRESS : '0x0000000000000000000000000000000000000000'

  console.log('🟦 Creating prediction on Base Mainnet...')

  // Write contract
  const hash = await walletClient.writeContract({
    chain: base, // ✅ ensures Base Mainnet
    address: PREDICTION_MARKET_ADDRESS,
    abi: PredictionMarketABI.abi,
    functionName: 'createPrediction',
    args: [title, description, tokenAddress, deadlineBig, capacityBig],
    account: address,
  })

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash })

  console.log('✅ Prediction Created! TX Hash:', hash)

  return {
    txHash: hash,
    deadline: deadlineBig.toString(),
    maxCapacity: capacityBig.toString(),
    status: receipt.status,
  }
}
