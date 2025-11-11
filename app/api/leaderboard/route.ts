import { db } from '@/lib/firebase';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

// ✅ Fetch cached leaderboard
export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, 'leaderboard'));
    const leaderboard = snapshot.docs.map((doc) => doc.data());
    return NextResponse.json({ leaderboard }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ Store updated leaderboard
export async function POST(req: Request) {
  try {
    const { leaderboard } = await req.json();
    if (!Array.isArray(leaderboard)) throw new Error('Invalid leaderboard data');

    for (const entry of leaderboard) {
      await setDoc(doc(db, 'leaderboard', entry.address), entry);
    }

    return NextResponse.json({ message: 'Leaderboard updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
