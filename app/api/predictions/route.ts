import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import type { Prediction } from '../../types/prediction';

export async function GET(): Promise<NextResponse> {
  try {
    const predictions: Prediction[] = store.getActivePredictions();
    return NextResponse.json({ predictions });
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'Failed to fetch predictions';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: {
      title: string;
      description: string;
      currency: 'USDC' | 'ETH';
      deadline: number;
      creator: string;
    } = await request.json();

    const { title, description, currency, deadline, creator } = body;

    if (!title || !description || !currency || !deadline || !creator) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (deadline < Date.now()) {
      return NextResponse.json(
        { error: 'Deadline must be in the future' },
        { status: 400 }
      );
    }

    const prediction: Prediction = store.createPrediction({
      title,
      description,
      currency,
      deadline,
      creator,
    });

    // Placeholder: Call smart contract
    await store.createPredictionContract(title, description, currency, deadline);

    return NextResponse.json({ prediction }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'Failed to create prediction';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
