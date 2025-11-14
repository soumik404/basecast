import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
    }

    const spinsRef = collection(db, 'spins');
    const q = query(spinsRef, where('walletAddress', '==', address.toLowerCase()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // ✅ New user — allow to spin
      return NextResponse.json({ canSpin: true, lastSpin: null, timeUntilNextSpin: 0 });
    }

    // 🕒 Find the most recent spin
    const spins = snapshot.docs.map(doc => doc.data());
    const lastSpin = spins.sort((a, b) => b.timestamp - a.timestamp)[0];

    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000; // 24h
    const timeUntilNextSpin = Math.max(0, cooldown - (now - lastSpin.timestamp));
    const canSpin = now - lastSpin.timestamp >= cooldown;

    return NextResponse.json({
      canSpin,
      lastSpin,
      timeUntilNextSpin,
      claimedAmount: lastSpin?.claimed ? lastSpin.rewardAmount : 0,
    });
  } catch (error) {
    console.error('Error checking spin eligibility:', error);
    return NextResponse.json({ error: 'Failed to check spin eligibility' }, { status: 500 });
  }
}
