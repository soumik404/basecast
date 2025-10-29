import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { predictionId, approve, verifierAddress, rejectionReason } = body;

    if (!predictionId || approve === undefined || !verifierAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: predictionId, approve, verifierAddress' },
        { status: 400 }
      );
    }

    if (typeof approve !== 'boolean') {
      return NextResponse.json(
        { error: 'approve must be a boolean (true/false)' },
        { status: 400 }
      );
    }

    const success: boolean = store.verifyResult(
      predictionId, 
      approve, 
      verifierAddress,
      rejectionReason
    );

    if (!success) {
      return NextResponse.json(
        { 
          error: 'Failed to verify result. Make sure:\n' +
                 '- You are an authorized verifier\n' +
                 '- The prediction is pending verification'
        },
        { status: 403 }
      );
    }

    const prediction = store.getPrediction(predictionId);
    const message = approve 
      ? 'Result verified and approved! Payouts have been calculated.'
      : 'Result rejected. The prediction is back to active status.';

    return NextResponse.json({ 
      success: true, 
      prediction,
      message
    });
  } catch (error: unknown) {
    console.error('Error verifying result:', error);
    return NextResponse.json(
      { error: 'Failed to verify result' },
      { status: 500 }
    );
  }
}
