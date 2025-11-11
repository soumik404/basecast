import { collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { publicClient } from "@/app/utils/publicClient";
import PredictionMarketABI from "@/contracts/PredictionMarket.json";
import { PREDICTION_MARKET_ADDRESS } from "@/contracts/config";

export async function resyncPrediction(predictionId: number) {
  console.log(`🔄 Syncing prediction ${predictionId} from blockchain...`);

  // Step 1: Read on-chain data
  const onchain = await publicClient.readContract({
    address: PREDICTION_MARKET_ADDRESS,
    abi: PredictionMarketABI.abi,
    functionName: "predictions",
    args: [BigInt(predictionId)],
  });

  const [deadline, maxCapacity, totalYes, totalNo, status, finalResult] = onchain as any;

  const statusMap: Record<number, string> = {
    0: "active",
    1: "pending_verification",
    2: "resolved",
    3: "cancelled",
  };

  // Step 2: Search Firestore for this predictionId
  const predictionsRef = collection(db, "predictions");
  const q = query(predictionsRef, where("predictionId", "==", predictionId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.warn(`⚠️ No Firestore document found for predictionId ${predictionId}`);
    throw new Error(`Prediction ${predictionId} not found in Firestore`);
  }

  // Step 3: Update that doc
  const docRef = snapshot.docs[0].ref;

  await updateDoc(docRef, {
    status: statusMap[Number(status)] || "unknown",
    result: finalResult ? "yes" : "no",
    onChainResolved: true,
    totalYes: Number(totalYes) / 1e18,
    totalNo: Number(totalNo) / 1e18,
    maxCapacity: Number(maxCapacity) / 1e18,
    deadline: Number(deadline),
    updatedAt: Date.now(),
  });
// Also sync the resultProposals collection (optional)
const proposalsRef = collection(db, "resultProposals");
const q2 = query(proposalsRef, where("predictionId", "==", predictionId));
const snapshot2 = await getDocs(q2);

if (!snapshot2.empty) {
  const proposalRef = snapshot2.docs[0].ref;
  await updateDoc(proposalRef, {
    verified: true,
    onChainResolved: true,
    result: finalResult ? "yes" : "no",
    updatedAt: Date.now(),
  });
  console.log(`✅ Synced resultProposals for predictionId ${predictionId}`);
}

  console.log(`✅ Firestore updated for predictionId ${predictionId} (doc: ${snapshot.docs[0].id})`);
}
