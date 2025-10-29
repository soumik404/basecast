# 🚀 Deployed Contract Integration Guide

## Your Contract Details

Your **PredictionMarket.sol** contract was deployed with:
```solidity
constructor(address _usdcAddress, address _feeCollector)
```

### Constructor Parameters Explained

#### 1. **USDC Address** (`_usdcAddress`)
```
0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

**What is this?**
- This is the **official USDC token contract address on Base blockchain**
- USDC (USD Coin) is a stablecoin: 1 USDC = $1 USD
- Issued by Circle on Base network

**Why does your contract need it?**
Your prediction market needs to:
- Accept USDC as a betting currency (alongside ETH)
- Transfer USDC from users when they place bets
- Transfer USDC to winners when they claim rewards
- Verify USDC approvals before accepting bets

**Think of it like this:**
```
┌─────────────────────────────────────────┐
│  BASE BLOCKCHAIN                        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ USDC Token Contract             │   │
│  │ Address: 0x8335...2913          │   │
│  │                                 │   │
│  │ • Stores everyone's USDC        │   │
│  │ • Managed by Circle             │   │
│  │ • Like a "bank" for USDC        │   │
│  └─────────────────────────────────┘   │
│                  ↕                      │
│  ┌─────────────────────────────────┐   │
│  │ Your PredictionMarket Contract  │   │
│  │ Address: 0xYour...Address       │   │
│  │                                 │   │
│  │ • Knows where USDC bank is      │   │
│  │ • Can request USDC transfers    │   │
│  │ • Holds USDC in betting pools   │   │
│  │ • Pays winners from pools       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

#### 2. **Fee Collector** (`_feeCollector`)
```
Your wallet address (the deployer)
```

**What is this?**
- The wallet address that receives platform fees
- Platform charges 2% fee (200 basis points) on all bets
- Fees are automatically sent to this address when predictions are resolved

**Example:**
```
Total Pool: 10,000 USDC
Platform Fee (2%): 200 USDC → Sent to fee collector
Payout Pool (98%): 9,800 USDC → Distributed to winners
```

---

## 🔧 Setup Steps

### Step 1: Update Contract Address in Config

Open `src/contracts/config.ts` and replace:

```typescript
// BEFORE
export const PREDICTION_MARKET_ADDRESS = '0xa0c9451c776bea7914441cE7A12a8D0dee36f31C' as `0x${string}`;

// AFTER - Use your actual deployed contract address
export const PREDICTION_MARKET_ADDRESS = '0xYourActualContractAddress...' as `0x${string}`;
```

**Where to find your contract address?**
1. In Remix → Deployed Contracts section
2. Copy the address after "PREDICTIONMARKET AT 0x..."
3. Example: `0x1234567890abcdef1234567890abcdef12345678`

### Step 2: Verify USDC Address (Already Correct!)

The USDC address is already set correctly in `src/contracts/config.ts`:
```typescript
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`;
```

✅ **No changes needed here!** This matches what you passed to the constructor.

### Step 3: Restart Your App

```bash
npm run dev
```

Your app will now communicate with your deployed contract on Base!

---

## 🎮 Testing Your Integration

### Test 1: Connect Wallet
1. Click "Connect Wallet" button
2. Select Coinbase Wallet or another Base-compatible wallet
3. Make sure you're on Base network (Chain ID: 8453)
4. Approve the connection

**Expected Result:** Wallet connected, address shown in header

---

### Test 2: Check Verifier Tab Visibility

**As Owner (Deployer):**
- ✅ You should see **5 tabs**: Markets, Create, Dashboard, Leaderboard, **Verifier**
- ✅ Verifier tab has a shield icon and yellow gradient
- ✅ Header shows "Admin" badge

**As Regular User:**
- ✅ You should see **4 tabs**: Markets, Create, Dashboard, Leaderboard
- ❌ No Verifier tab (this is correct!)

**How it works:**
- App automatically calls `isVerifier(address)` on your contract
- App automatically calls `owner()` on your contract
- If either returns true → Shows Verifier tab
- If both false → Hides Verifier tab

---

### Test 3: Create a Prediction (Small Amount First!)

1. Go to **Create** tab
2. Fill in:
   - Title: "Test Prediction"
   - Description: "Testing the contract"
   - Currency: **USDC** (recommended for testing)
   - Deadline: Set 1 hour from now
   - Max Capacity: 100 USDC (small test amount)
3. Click "Create Prediction"
4. Approve transaction in wallet
5. Wait for confirmation

**Expected Result:**
- Transaction confirmed on Base
- Success message shown
- New prediction appears in Markets tab

---

### Test 4: Place a Bet with USDC

**Step 1: Approve USDC (First Time Only)**
1. Go to **Markets** tab
2. Find your test prediction
3. Click "Bet YES" or "Bet NO"
4. Enter amount: **10 USDC** (small test)
5. First transaction: Approve USDC spending
6. Approve in wallet

**Step 2: Place Bet**
7. Second transaction: Place bet
8. Approve in wallet
9. Wait for confirmation

**Expected Result:**
- 10 USDC deducted from your wallet
- Bet registered on-chain
- Progress bar updated
- Your bet appears in Dashboard

**Why two transactions?**
```
Transaction 1: "Hey USDC contract, let PredictionMarket spend my USDC"
Transaction 2: "Hey PredictionMarket, take my USDC and place this bet"
```

---

### Test 5: Place a Bet with ETH

1. Find a prediction
2. Click "Bet YES" or "Bet NO"
3. Enter amount: **0.01 ETH** (small test)
4. Click "Place Bet"
5. Approve transaction (only ONE transaction for ETH!)
6. Wait for confirmation

**Expected Result:**
- 0.01 ETH deducted from your wallet
- Bet registered on-chain
- Appears in Dashboard

**Why only one transaction for ETH?**
ETH doesn't need approval - you can send it directly!

---

### Test 6: Propose Result (As Creator)

**Wait for deadline to pass first!**

1. Go to **Markets** tab
2. Find your prediction (you're the creator)
3. Click "Propose YES" or "Propose NO"
4. Approve transaction
5. Wait for confirmation

**Expected Result:**
- Status changes to "⏳ Pending Verification"
- Yellow badge shown
- Can't place more bets
- Verifier tab shows this prediction (if you're verifier/owner)

---

### Test 7: Verify Result (As Verifier/Owner)

1. Go to **Verifier** tab (only visible if you're verifier/owner)
2. See your prediction with proposed result
3. Click "Approve & Finalize" or "Reject Proposal"
4. If rejecting, enter reason (e.g., "Wrong result - checking data")
5. Approve transaction
6. Wait for confirmation

**If Approved:**
- Status → "✓ Resolved"
- Winners calculated automatically
- Platform fee (2%) sent to fee collector
- Winners can claim rewards

**If Rejected:**
- Status → Back to "Active"
- Rejection reason displayed
- Creator can propose again

---

### Test 8: Claim Reward (As Winner)

**Only if you bet on the winning side!**

1. Go to **Dashboard** tab
2. Find resolved prediction with green "Won" badge
3. See estimated payout
4. Click "Claim Reward"
5. Approve transaction
6. Wait for confirmation

**Expected Result:**
- Tokens transferred to your wallet
- Badge changes to "✓ Claimed"
- Can't claim again (prevented by contract)
- Your profit added to leaderboard

---

## 🔐 Contract Features

### Two-Step Verification System

```
┌──────────────────────────────────────────────────────┐
│  Step 1: PROPOSE                                     │
│  ─────────────────────────────────────────────      │
│  Creator: "ETH reached $4000 = YES"                  │
│                                                      │
│  Status: Active → PendingVerification                │
│  Betting: CLOSED                                     │
│  Payouts: NOT YET                                    │
└──────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────┐
│  Step 2: VERIFY (Verifier/Owner Only)                │
│  ─────────────────────────────────────────────────   │
│  Verifier checks external data sources               │
│                                                      │
│  Option A: APPROVE                                   │
│    • Status: PendingVerification → Resolved          │
│    • Payouts: CALCULATED                             │
│    • Fee: 2% to fee collector                        │
│    • Winners: CAN CLAIM                              │
│                                                      │
│  Option B: REJECT                                    │
│    • Status: PendingVerification → Active            │
│    • Reason: Stored on-chain                         │
│    • Creator: Can propose again                      │
└──────────────────────────────────────────────────────┘
```

### Platform Fee (2%)

Every time a prediction is resolved:
```
Total Pool = Yes Pool + No Pool

Platform Fee (2%) = Total Pool × 0.02
  → Sent to fee collector immediately

Payout Pool (98%) = Total Pool - Platform Fee
  → Distributed to winners proportionally
```

**Example:**
```
Total Pool: 10,000 USDC
  - Platform Fee: 200 USDC → Fee collector
  - Payout Pool: 9,800 USDC → Winners

Winner calculation:
Your Payout = (Your Stake / Winning Pool) × Payout Pool

If you bet 500 USDC on YES and YES won with 4,000 total:
Your Payout = (500 / 4,000) × 9,800 = 1,225 USDC
Your Profit = 1,225 - 500 = 725 USDC (145% return)
```

---

## 📝 Contract Functions Available

### Read Functions (Free, No Gas)
- `getPrediction(predictionId)` - Get prediction details
- `getBet(betId)` - Get bet details
- `getUserBets(address)` - Get all bet IDs for a user
- `getPredictionBets(predictionId)` - Get all bet IDs for a prediction
- `isVerifier(address)` - Check if address is verifier
- `owner()` - Get contract owner
- `feeCollector()` - Get fee collector address
- `PLATFORM_FEE_BPS()` - Get platform fee (200 = 2%)
- `USDC_ADDRESS()` - Get USDC token address
- `nextPredictionId()` - Get next prediction ID
- `nextBetId()` - Get next bet ID

### Write Functions (Require Gas)
- `createPrediction(...)` - Create new prediction
- `placeBet(...)` - Place bet (payable for ETH)
- `proposeResult(...)` - Propose outcome (creator only)
- `verifyResult(...)` - Approve/reject proposal (verifier only)
- `claimReward(betId)` - Claim winnings
- `addVerifier(address)` - Add verifier (owner only)
- `removeVerifier(address)` - Remove verifier (owner only)

---

## 🛠️ Advanced: Add More Verifiers

### Via Remix (Recommended)
1. Open your contract in Remix
2. Go to "Deployed Contracts" section
3. Find `addVerifier` function
4. Enter verifier address: `0x...`
5. Click "transact"
6. Approve transaction
7. That address can now verify proposals!

### Via Code (For Future Integration)
```typescript
import { useContract } from '@/hooks/useContract';

const { addVerifier } = useContract();

await addVerifier('0xNewVerifierAddress...');
```

---

## ✅ Verification Checklist

Before going live with real money:

- [ ] Contract deployed on Base mainnet
- [ ] Contract address updated in `config.ts`
- [ ] USDC address correct (0x8335...2913)
- [ ] Fee collector receiving fees
- [ ] Wallet connects successfully
- [ ] Verifier tab shows/hides correctly
- [ ] Can create predictions
- [ ] Can place USDC bets (with approval)
- [ ] Can place ETH bets
- [ ] Propose result works (after deadline)
- [ ] Verify result works (approve/reject)
- [ ] Claim reward works
- [ ] Platform fee (2%) calculated correctly
- [ ] Multiple verifiers can be added
- [ ] Dashboard shows correct stats
- [ ] Leaderboard updates properly

---

## 🎉 You're Ready!

Your Base Prediction Market is fully integrated with your deployed smart contract!

**Key Features Working:**
✅ Wallet connection with Base support
✅ Create predictions with ETH or USDC
✅ Place bets with capacity limits
✅ Two-step verification (propose → verify)
✅ Automatic payout calculation (98% to winners, 2% fee)
✅ Claim rewards system
✅ Role-based access (verifier tab only for authorized users)
✅ Dashboard with win/loss tracking
✅ Leaderboard with profit rankings

**Gas Fees on Base:**
- Create prediction: ~$0.10
- Place bet: ~$0.05
- Approve USDC: ~$0.03
- Claim reward: ~$0.05

**Total cost to test full flow: ~$0.25!** 🚀

Start with small amounts, test everything, then scale up! Good luck with your prediction market! 🎊
