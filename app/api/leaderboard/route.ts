import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import type { LeaderboardEntry } from '../../types/prediction';

export async function GET(): Promise<NextResponse> {
  try {
    const leaderboard: LeaderboardEntry[] = store.getLeaderboard();
    return NextResponse.json({ leaderboard });
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'Failed to fetch leaderboard';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

