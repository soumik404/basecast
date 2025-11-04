import { createWalletClient, custom, getContract as viemGetContract } from 'viem';
import { base } from 'viem/chains';
import PredictionMarketABI from '../contracts/PredictionMarket.json';
import { PREDICTION_MARKET_ADDRESS } from '../contracts/config';
import type { Abi } from 'viem';

export async function getContract() {
  if (!window.ethereum) throw new Error('Wallet not connected');

  const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });

  // Create a wallet client
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: custom(window.ethereum),
  });

  // Return the connected contract instance
  const contract = viemGetContract({
    address: PREDICTION_MARKET_ADDRESS,
     abi: PredictionMarketABI.abi as Abi,
    client: { wallet: walletClient },
  });

  return contract;
}
