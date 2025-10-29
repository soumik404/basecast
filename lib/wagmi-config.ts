import { http, createConfig, createStorage } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';

// Determine which chain to use based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const targetChain = isDevelopment ? baseSepolia : base;

export const wagmiConfig = createConfig({
  chains: [targetChain],
  connectors: [
    coinbaseWallet({
      appName: 'Base Predictions',
      preference: 'all', // Support both EOA and Smart Wallet
    }),
  ],
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }),
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig;
  }
}
