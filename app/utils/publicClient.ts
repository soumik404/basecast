import { createPublicClient, http } from 'viem';
import { base} from 'viem/chains';

export const publicClient = createPublicClient({
  chain: base,
  transport: http('https://base-mainnet.g.alchemy.com/v2/afatatafqnGXDC6UU4l-YmEU4NvwJ015'), // ✅ direct Base RPC
});