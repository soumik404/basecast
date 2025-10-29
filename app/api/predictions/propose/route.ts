import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { predictionId, result, proposerAddress } = body;

    if (!predictionId || !result || !proposerAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: predictionId, result, proposerAddress' },
        { status: 400 }
      );
    }

    if (result !== 'yes' && result !== 'no') {
      return NextResponse.json(
        { error: 'Result must be "yes" or "no"' },
        { status: 400 }
      );
    }

    const success: boolean = store.proposeResult(predictionId, result, proposerAddress);

    if (!success) {
      return NextResponse.json(
        { 
          error: 'Failed to propose result. Make sure:\n' +
                 '- You are the creator of this prediction\n' +
                 '- The prediction is active\n' +
                 '- The deadline has passed'
        },
        { status: 403 }
      );
    }

    const prediction = store.getPrediction(predictionId);
    return NextResponse.json({ 
      success: true, 
      prediction,
      message: 'Result proposed successfully. Waiting for verifier confirmation.'
    });
  } catch (error: unknown) {
    console.error('Error proposing result:', error);
    return NextResponse.json(
      { error: 'Failed to propose result' },
      { status: 500 }
    );
  }
}
