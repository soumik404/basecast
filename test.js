import fs from 'fs';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const PredictionMarketABI = JSON.parse(fs.readFileSync('./contracts/PredictionMarket.json', 'utf-8'));


// Create client
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Your deployed contract
const contractAddress = '0xa0c9451c776bea7914441cE7A12a8D0dee36f31C';

// Address you want to check
const verifierToCheck = '0x5976df85eC2DF3Eca601c1631401133e57f30554'; // replace if needed

async function checkVerifier() {
  try {
    const isVerifier = await publicClient.readContract({
      address: contractAddress,
      abi: PredictionMarketABI.abi,
      functionName: 'verifiers',
      args: [verifierToCheck],
    });

    console.log(`✅ Verifier status for ${verifierToCheck}:`, isVerifier);
  } catch (err) {
    console.error('❌ Error reading verifier status:', err);
  }
}

checkVerifier();
