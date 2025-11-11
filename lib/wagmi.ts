// /lib/wagmi.ts
import { createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
const ALCHEMY_URL = `https://base-mainnet.g.alchemy.com/v2/afatatafqnGXDC6UU4l-YmEU4NvwJ015`;

export const config = createConfig({
  chains: [base],
  connectors: [injected()],
   ssr: true,
  storage: createStorage({
    storage: cookieStorage, // ✅ saves connection info
  }),
  transports: {
    [base.id]: http(ALCHEMY_URL),
  },
});
