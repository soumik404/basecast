// app/api/predictions/all/route.ts
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const q = query(collection(db, 'predictions'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const predictions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ predictions }, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error fetching all predictions:', error);
    return NextResponse.json({ error: error.message || 'Failed to load predictions' }, { status: 500 });
  }
}
