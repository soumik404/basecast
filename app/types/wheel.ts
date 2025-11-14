export interface SpinHistory {
  id: string;
  walletAddress: string;
  lastSpinTimestamp: number;
  rewardAmount: number;
  postURL: string;
  txHash?: string;
  prize: string;
}

export interface WheelSegment {
  id: number;
  label: string;
  value: number;
  color: string;
  textColor: string;
}

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { id: 0, label: '25 ZORA', value: 25.00, color: '#94a3b8', textColor: '#ffffff' },
  { id: 1, label: '0.10 ZORA', value: 0.1, color: '#3b82f6', textColor: '#ffffff' },
  { id: 2, label: '1 ZORA', value: 1.00, color: '#64748b', textColor: '#ffffff' },
  { id: 3, label: '0.25 ZORA', value: 0.25, color: '#8b5cf6', textColor: '#ffffff' },
  { id: 4, label: '1000 ZORA', value: 1000.00, color: '#94a3b8', textColor: '#ffffff' },
  { id: 5, label: '0.5 ZORA', value: 0.5, color: '#06b6d4', textColor: '#ffffff' },
  { id: 6, label: '2 ZORA', value: 2.00, color: '#64748b', textColor: '#ffffff' },
  { id: 7, label: '100 ZORA', value: 100.0, color: '#10b981', textColor: '#ffffff' },
];

export const SPIN_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
