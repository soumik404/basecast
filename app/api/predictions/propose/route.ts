import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: Request) {
  try {
    const { predictionId, proposedResult, creator } = await req.json();

    if (!predictionId || !creator || !proposedResult)
      return new Response(JSON.stringify({ error: 'Missing data' }), { status: 400 });

    await addDoc(collection(db, 'resultProposals'), {
      predictionId,
      proposedResult,
      creator,
      createdAt: serverTimestamp(),
      verified: false,
      verifiedBy: null,
      onChainResolved: false,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('Error saving proposal:', err);
    return new Response(JSON.stringify({ error: 'Failed to save proposal' }), { status: 500 });
  }
}
