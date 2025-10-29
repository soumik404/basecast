import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

export const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org'), // ✅ direct Base RPC
});
