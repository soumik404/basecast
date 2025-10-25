import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import type { Prediction } from '../../../types/prediction';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const prediction: Prediction | undefined = store.getPrediction(id);

    if (!prediction) {
      return NextResponse.json(
        { error: 'Prediction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ prediction });
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'Failed to fetch prediction';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
