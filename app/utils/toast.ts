'use client';

import { toast } from 'sonner';

// Generate short notification tones using the Web Audio API — no .mp3 files needed
function playTone(type: 'success' | 'error' | 'info' = 'info') {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Set tone frequency and duration per type
  const tone = {
    success: 880, // A5 - positive high tone
    error: 220,   // A3 - low buzz
    info: 440,    // A4 - neutral tone
  }[type];

  oscillator.frequency.value = tone;
  gainNode.gain.setValueAtTime(0.08, ctx.currentTime); // volume
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.5);
}

// Base-blue gradient toast style
const baseStyle = {
  background: 'linear-gradient(90deg, #2563eb, #1e40af)',
  color: 'white',
  borderRadius: '10px',
  padding: '12px 16px',
  fontWeight: 500,
  boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
};

export function showBaseToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
) {
  playTone(type);

  switch (type) {
    case 'success':
      toast.success(message, { style: baseStyle });
      break;
    case 'error':
      toast.error(message, { style: { ...baseStyle, background: 'linear-gradient(90deg, #ef4444, #b91c1c)' } });
      break;
    default:
      toast(message, { style: { ...baseStyle, background: 'linear-gradient(90deg, #60a5fa, #3b82f6)' } });
  }
}
