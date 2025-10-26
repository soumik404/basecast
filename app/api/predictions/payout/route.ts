import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { predictionId, choice, amount } = body;

    if (!predictionId || !choice || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (choice !== 'yes' && choice !== 'no') {
      return NextResponse.json(
        { error: 'Choice must be "yes" or "no"' },
        { status: 400 }
      );
    }

    const potentialPayout: number = store.calculatePotentialPayout(predictionId, choice, amount);

    return NextResponse.json({ 
      potentialPayout,
      profit: potentialPayout - amount,
      multiplier: amount > 0 ? (potentialPayout / amount).toFixed(2) : '0'
    });
  } catch (error: unknown) {
    console.error('Error calculating payout:', error);
    return NextResponse.json(
      { error: 'Failed to calculate payout' },
      { status: 500 }
    );
  }
}
