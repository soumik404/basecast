import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

// GET predictions pending verification
export async function GET(): Promise<NextResponse> {
  try {
    const predictions = store.getPendingVerificationPredictions();
    return NextResponse.json({ predictions });
  } catch (error: unknown) {
    console.error('Error fetching pending predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending predictions' },
      { status: 500 }
    );
  }
}
