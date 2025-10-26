import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { betId, userAddress } = body;

    if (!betId || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = store.claimReward(betId, userAddress);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to claim reward. Check if you own this bet and it has not been claimed yet.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      amount: result.amount,
      message: `Successfully claimed ${result.amount} tokens!` 
    });
  } catch (error: unknown) {
    console.error('Error claiming reward:', error);
    return NextResponse.json(
      { error: 'Failed to claim reward' },
      { status: 500 }
    );
  }
}
