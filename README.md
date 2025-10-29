# 🎯 Base Prediction Market

A decentralized prediction market built on Base with gasless transactions, two-step verification, and secure payouts.

## ✨ Features

- 🔗 **Base Blockchain** - Built on Base for fast, low-cost transactions
- ⛽ **Gasless Transactions** - Users don't pay gas fees (powered by Base Paymaster)
- 🔐 **Two-Step Verification** - Creators propose, verifiers confirm results
- 💰 **Fair Payouts** - Proportional reward distribution to winners
- 📊 **Live Statistics** - Real-time pool updates and potential earnings
- 🎨 **Base-Themed UI** - Beautiful glassmorphism design
- 📱 **Mobile Responsive** - Works seamlessly on all devices
- 🔒 **Smart Contract Security** - Audited OpenZeppelin contracts

## 🚀 Quick Start

### For Users

1. Visit the app (link coming soon)
2. Connect your Base wallet (Coinbase Wallet or MetaMask)
3. Get test USDC or ETH from the faucet
4. Create predictions or place bets
5. Claim rewards when you win!

### For Developers

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete setup instructions.

**Quick Deploy:**
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your details

# Compile contracts
npm run compile

# Deploy to Base Sepolia
npm run deploy:sepolia

# Start frontend
npm run dev
```

## 📖 How It Works

### 1. Create a Prediction
Anyone can create a prediction with:
- Title and description
- Betting currency (USDC or ETH)
- Deadline for betting
- Optional max capacity

### 2. Place Bets
Users bet "Yes" or "No" by staking tokens:
- See potential payouts before betting
- Track live pool percentages
- Betting closes at deadline or capacity

### 3. Two-Step Resolution
**Step 1:** Creator proposes result after deadline
**Step 2:** Verified resolver confirms or rejects
**Result:** Payouts calculated and distributed

### 4. Claim Rewards
Winners claim proportional rewards from total pool:
```
Your Reward = (Your Stake / Winning Pool) × Total Pool
```

## 🛠️ Tech Stack

**Smart Contracts:**
- Solidity 0.8.20
- OpenZeppelin Contracts
- Hardhat for deployment

**Frontend:**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion animations
- Recharts for visualizations

**Blockchain:**
- Base (Ethereum L2)
- Wagmi + Viem for Web3
- OnchainKit by Coinbase
- Base Paymaster for gasless txs

## 📁 Project Structure

```
base-prediction-market/
├── contracts/              # Solidity smart contracts
│   ├── PredictionMarket.sol
│   └── MockUSDC.sol
├── scripts/               # Deployment scripts
│   ├── deploy.ts
│   └── check-balance.ts
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── hooks/           # Custom hooks (useContract)
│   ├── lib/             # Utilities and configs
│   └── types/           # TypeScript types
├── hardhat.config.ts    # Hardhat configuration
└── DEPLOYMENT_GUIDE.md  # Complete setup guide
```

## 🔐 Security Features

- ✅ ReentrancyGuard on all critical functions
- ✅ Verifier whitelist system
- ✅ Two-step resolution process
- ✅ Safe ERC20 token handling
- ✅ Owner-only admin functions
- ✅ Emergency withdrawal mechanism
- ✅ Platform fee (2%) to prevent spam

## 🌐 Live Contracts

### Base Sepolia Testnet
- **PredictionMarket:** `Coming Soon`
- **MockUSDC:** `Coming Soon`

### Base Mainnet
- **PredictionMarket:** `Coming Soon`
- **USDC:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete setup instructions
- [Smart Contract Docs](./contracts/README.md) - Contract functions and events
- [API Reference](./docs/API.md) - Frontend hooks and utilities

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📜 License

MIT License - see [LICENSE](./LICENSE) for details

## 🆘 Support

- [Open an Issue](https://github.com/Soumik404/base-prediction-market/issues)
- [Join Discord](https://discord.gg/buildonbase)
- [Base Documentation](https://docs.base.org)

## 🎉 Acknowledgments

- Built on [Base](https://base.org)
- Powered by [OnchainKit](https://onchainkit.xyz)
- UI components by [shadcn/ui](https://ui.shadcn.com)
- Smart contracts by [OpenZeppelin](https://openzeppelin.com/contracts)

---

**Built with ❤️ on Base**
