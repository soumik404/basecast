import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import type { Bet } from '../../types/prediction';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: {
      predictionId: string;
      user: string;
      amount: number;
      choice: 'yes' | 'no';
    } = await request.json();

    const { predictionId, user, amount, choice } = body;

    if (!predictionId || !user || !amount || !choice) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (choice !== 'yes' && choice !== 'no') {
      return NextResponse.json(
        { error: 'Choice must be yes or no' },
        { status: 400 }
      );
    }

    const bet: Bet | null = store.placeBet({
      predictionId,
      user,
      amount,
      choice,
    });

    if (!bet) {
      return NextResponse.json(
        { error: 'Cannot place bet on inactive or expired prediction' },
        { status: 400 }
      );
    }

    // Placeholder: Call smart contract
    await store.placeBetContract(predictionId, choice, amount);

    return NextResponse.json({ bet }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'Failed to place bet';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams: URLSearchParams = request.nextUrl.searchParams;
    const userAddress: string | null = searchParams.get('user');
    const predictionId: string | null = searchParams.get('predictionId');

    let bets: Bet[] = [];

    if (userAddress) {
      bets = store.getBetsForUser(userAddress);
    } else if (predictionId) {
      bets = store.getBetsForPrediction(predictionId);
    } else {
      bets = store.getAllBets();
    }

    return NextResponse.json({ bets });
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'Failed to fetch bets';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
