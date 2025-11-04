// /lib/wagmi.ts
import { createConfig, http, cookieStorage, createStorage } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [injected()],
   ssr: true,
  storage: createStorage({
    storage: cookieStorage, // ✅ saves connection info
  }),
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});
