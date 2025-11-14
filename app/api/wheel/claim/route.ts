import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage, parseUnits, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const TOKEN_ADDRESS = "0x1111111111166b7fe7bd91427724b487980afc69"; // reward token

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }]
  }
];

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature, message, amount } = await request.json();

    if (!walletAddress || !signature || !message || !amount) {
      return NextResponse.json({ success: false, error: 'Missing fields' }, { status: 400 });
    }

    // Signature validation
    const isValid = await verifyMessage({
      address: walletAddress,
      message,
      signature,
    });

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    // Find latest unclaimed spin
    const spinsRef = collection(db, 'spins');
    const q = query(
      spinsRef,
      where('walletAddress', '==', walletAddress.toLowerCase()),
      where('claimed', '==', false)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ success: false, error: 'No unclaimed reward found' }, { status: 404 });
    }

    const spinDoc = snapshot.docs.sort((a, b) => b.data().timestamp - a.data().timestamp)[0];

    // Setup Base Mainnet wallet client
        const PRIVATE_KEY = process.env.PRIVATE_KEY!;

    const account = privateKeyToAccount(`0x${PRIVATE_KEY}`);
    const client = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    // Convert amount → token units (change decimals if needed)
    const decimals = 18;
    const tokenAmount = parseUnits(amount.toString(), decimals);

    // Transfer token to winner
    const hash = await client.writeContract({
      address: TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [walletAddress, tokenAmount],
    });

    // Mark claimed
    await updateDoc(doc(db, 'spins', spinDoc.id), {
      claimed: true,
      claimTx: hash,
    });

    return NextResponse.json({
      success: true,
      txHash: hash,
      message: `Reward of ${amount} tokens claimed successfully!`,
    });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process claim' }, { status: 500 });
  }
}
