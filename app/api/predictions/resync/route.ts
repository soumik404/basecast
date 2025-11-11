// /app/api/predictions/resync/route.ts
import { NextResponse } from "next/server";
import { resyncPrediction } from "../../../../lib/resyncprediction";

export async function POST(req: Request) {
  const { predictionId } = await req.json();
  try {
    await resyncPrediction(Number(predictionId));
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Resync failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
