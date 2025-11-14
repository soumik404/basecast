// /app/components/lucky-wheel.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { WHEEL_SEGMENTS, type WheelSegment } from '../types/wheel';

interface LuckyWheelProps {
  onSpinComplete: (segmentIndex: number) => void;
  isSpinning?: boolean;
   // when set -> wheel will animate to this index
  disabled?: boolean;
  forcedIndex: number | null;
  size?: number;
}

export function LuckyWheel({
  onSpinComplete,
  isSpinning = false,
  disabled = false,
  forcedIndex,
  size = 400,
}: LuckyWheelProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [animating, setAnimating] = useState<boolean>(false);
  const segmentsCount = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / segmentsCount;

  // draw wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = size * pixelRatio;
    canvas.height = size * pixelRatio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    const angleRad = (2 * Math.PI) / segmentsCount;

    WHEEL_SEGMENTS.forEach((segment: WheelSegment, index: number) => {
      const startAngle = index * angleRad - Math.PI / 2;
      const endAngle = startAngle + angleRad;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();

      // border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      // text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + angleRad / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = segment.textColor;
      ctx.font = `${Math.max(12, Math.floor(size / 28))}px sans-serif`;
      // split long labels into two lines if necessary
      const label = segment.label;
      if (label.length > 10) {
        const parts = label.split(' ');
        ctx.fillText(parts[0] || label, radius * 0.62, -8);
        ctx.fillText(parts.slice(1).join(' ') || '', radius * 0.62, 12);
      } else {
        ctx.fillText(label, radius * 0.65, 0);
      }
      ctx.restore();
    });

    // center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 5;
    ctx.stroke();

    // SPIN text
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', centerX, centerY);

    ctx.restore();
  }, [rotation, size, segmentsCount]);

  // helper: compute desired final absolute rotation (degrees) so that pointer at top lands on segment index
  function computeDesiredFinalRotationForIndex(index: number, startRotationDeg: number) {
    // pointer sits at top (0 deg reference). We use same adjustedRotation method as before:
    // adjustedRotation = (360 - finalRotation + 90) % 360
    // We want adjustedRotation to be center angle of segment index:
    const segCenter = index * segmentAngle + segmentAngle / 2; // degrees
    const adjustedRotation = segCenter; // target adjustedRotation
    const desiredFinalRotation = (360 - adjustedRotation + 90) % 360; // degrees
    // Now compute delta from startRotation
    const startNorm = ((startRotationDeg % 360) + 360) % 360;
    const delta = (desiredFinalRotation - startNorm + 360) % 360;
    return { desiredFinalRotation, delta };
  }

  // Animate when spinToIndex is provided from parent
  // Handle spinning animation based on backend forcedIndex
useEffect(() => {
  if (!isSpinning || forcedIndex === null) return;

  const total = WHEEL_SEGMENTS.length;
  const anglePerSegment = 360 / total;

  const finalAngle =
    360 * 5 + // 5 full spins
    (360 - (forcedIndex * anglePerSegment + anglePerSegment / 2)); // align with pointer

  const duration = 4000;
  const startRotation = rotation;
  const startTime = performance.now();

  const animate = (time: number) => {
    const progress = Math.min((time - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    const current = startRotation + (finalAngle - startRotation) * ease;
    setRotation(current);

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onSpinComplete(forcedIndex);
    }
  };

  requestAnimationFrame(animate);
}, [isSpinning, forcedIndex]);
 // intentional: only when spinToIndex changes

  // Render pointer & canvas
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* pointer at top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20 pointer-events-none">
        <div style={{ borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderBottom: '26px solid #ffcc00' }} />
      </div>

      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={`rounded-full shadow-2xl ${disabled || animating ? 'opacity-70' : 'cursor-pointer'}`}
      />

      {/* center overlay (optional visual) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow">
          <span className="font-bold text-sm text-blue-600">SPIN</span>
        </div>
      </div>
    </div>
  );
}

export default LuckyWheel;
