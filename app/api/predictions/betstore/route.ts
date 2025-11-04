import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { predictionId, userAddress, choice, amount } = await request.json();

    if (!predictionId || !userAddress || !choice || !amount)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const betRef = doc(db, `bets/${predictionId}/users/${userAddress}`);
    const betSnap = await getDoc(betRef);

    if (betSnap.exists()) {
      const existing = betSnap.data();

      // If the user tries to bet on the opposite side, prevent it
      if (existing.choice !== choice) {
        return NextResponse.json(
          { error: 'You already placed a bet on the opposite side.' },
          { status: 400 }
        );
      }

      // Update the existing bet
      await updateDoc(betRef, {
        totalBet: existing.totalBet + amount,
        betCount: existing.betCount + 1,
        lastBetAmount: amount,
        lastUpdated: serverTimestamp(),
      });
    } else {
      // Create a new bet entry
      await setDoc(betRef, {
        predictionId,
        userAddress,
        choice,
        totalBet: amount,
        betCount: 1,
        lastBetAmount: amount,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error saving bet:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
