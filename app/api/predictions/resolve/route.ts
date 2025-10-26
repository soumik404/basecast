import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { predictionId, result, resolverAddress } = body;

    if (!predictionId || !result || !resolverAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (result !== 'yes' && result !== 'no') {
      return NextResponse.json(
        { error: 'Result must be "yes" or "no"' },
        { status: 400 }
      );
    }

    const success: boolean = store.resolvePrediction(predictionId, result, resolverAddress);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to resolve prediction. Check if you are the creator and the prediction is active.' },
        { status: 403 }
      );
    }

    const prediction = store.getPrediction(predictionId);
    return NextResponse.json({ success: true, prediction });
  } catch (error: unknown) {
    console.error('Error resolving prediction:', error);
    return NextResponse.json(
      { error: 'Failed to resolve prediction' },
      { status: 500 }
    );
  }
}
