import type { SpinHistory } from '../app/types/wheel';

// In-memory storage for spin history (replace with Firebase/Supabase in production)
const spinHistory: Map<string, SpinHistory> = new Map();

export const wheelStore = {
  // Get user's last spin
  getLastSpin: (walletAddress: string): SpinHistory | null => {
    return spinHistory.get(walletAddress.toLowerCase()) || null;
  },

  // Record a new spin
  recordSpin: (spin: SpinHistory): void => {
    spinHistory.set(spin.walletAddress.toLowerCase(), spin);
  },

  // Update spin with transaction hash
  updateSpinTxHash: (walletAddress: string, txHash: string): void => {
    const spin = spinHistory.get(walletAddress.toLowerCase());
    if (spin) {
      spin.txHash = txHash;
      spinHistory.set(walletAddress.toLowerCase(), spin);
    }
  },

  // Check if user can spin (24h cooldown)
  canSpin: (walletAddress: string): boolean => {
    const lastSpin = spinHistory.get(walletAddress.toLowerCase());
    if (!lastSpin) return true;

    const now = Date.now();
    const timeSinceLastSpin = now - lastSpin.lastSpinTimestamp;
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours

    return timeSinceLastSpin >= cooldown;
  },

  // Get time until next spin
  getTimeUntilNextSpin: (walletAddress: string): number => {
    const lastSpin = spinHistory.get(walletAddress.toLowerCase());
    if (!lastSpin) return 0;

    const now = Date.now();
    const timeSinceLastSpin = now - lastSpin.lastSpinTimestamp;
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours
    const timeRemaining = cooldown - timeSinceLastSpin;

    return timeRemaining > 0 ? timeRemaining : 0;
  },

  // Get all spins (for admin/debugging)
  getAllSpins: (): SpinHistory[] => {
    return Array.from(spinHistory.values());
  },
};
