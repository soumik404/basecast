// app/api/bets/claimstore/route.ts
import { db } from '@/lib/firebase';
import { doc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { betId, userAddress, amount, txHash } = await req.json();

    if (!betId || !userAddress) {
      return NextResponse.json({ error: 'Missing betId or userAddress' }, { status: 400 });
    }

    // Store or update the claimed bet
    await setDoc(doc(db, 'claims', betId), {
      betId,
      userAddress,
      amount: amount || 0,
      txHash: txHash || '',
      claimedAt: serverTimestamp(),
    });

    console.log(`✅ Claimed stored for bet ${betId}`);

    return NextResponse.json({ message: 'Claim stored successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error storing claim:', error);
    return NextResponse.json({ error: error.message || 'Failed to store claim' }, { status: 500 });
  }
}
