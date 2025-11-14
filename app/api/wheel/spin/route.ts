import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { WHEEL_SEGMENTS } from '../../../types/wheel';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, postURL } = body;

    if (!walletAddress || !postURL) {
      return NextResponse.json({ success: false, error: 'Missing wallet address or post URL' }, { status: 400 });
    }

    // 🧠 Check last spin (24h cooldown)
    const spinsRef = collection(db, 'spins');
    const q = query(spinsRef, where('walletAddress', '==', walletAddress.toLowerCase()));
    const snapshot = await getDocs(q);

    const spins = snapshot.docs.map(doc => doc.data());
    const lastSpin = spins.sort((a, b) => b.timestamp - a.timestamp)[0];
    const now = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;

    if (lastSpin && now - lastSpin.timestamp < cooldown) {
      return NextResponse.json({
        success: false,
        error: 'Spin cooldown active',
        timeRemaining: cooldown - (now - lastSpin.timestamp),
      });
    }

    // 🎯 Weighted prize selection
    const weights = [0, 60, 3, 25, 0, 12, 1,0];
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < weights.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    const selectedSegment = WHEEL_SEGMENTS[selectedIndex];

    // 💾 Save spin to Firestore
    const spin = {
      walletAddress: walletAddress.toLowerCase(),
      postURL,
      rewardAmount: selectedSegment.value,
      prize: selectedSegment.label,
      claimed: false,
      timestamp: now,
    };

    await addDoc(spinsRef, spin);

    return NextResponse.json({
      success: true,
      segmentIndex: selectedIndex,
      prize: selectedSegment.label,
      rewardAmount: selectedSegment.value,
    });
  } catch (error) {
    console.error('Error spinning wheel:', error);
    return NextResponse.json({ success: false, error: 'Failed to spin wheel' }, { status: 500 });
  }
}
