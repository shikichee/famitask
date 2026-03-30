'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { PRAISE_MESSAGES } from '@/lib/constants';

interface CelebrationOverlayProps {
  show: boolean;
  points: number;
  memberName?: string;
  onDone: () => void;
}

export function CelebrationOverlay({ show, points, memberName, onDone }: CelebrationOverlayProps) {
  const [praise, setPraise] = useState('');
  const [visible, setVisible] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confettiRef = useRef<any>(null);

  // Preload canvas-confetti during idle time
  useEffect(() => {
    const load = () => { import('canvas-confetti').then(m => { confettiRef.current = m.default; }); };
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(load);
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(load, 1000);
      return () => clearTimeout(id);
    }
  }, []);

  const fireConfetti = useCallback(async () => {
    let confetti = confettiRef.current;
    if (!confetti) {
      const m = await import('canvas-confetti');
      confetti = m.default;
      confettiRef.current = confetti;
    }
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#F29F05', '#F28705', '#F25C05', '#F2B199', '#F2F2F2'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#F29F05', '#F28705', '#F25C05', '#F2B199', '#F2F2F2'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  useEffect(() => {
    if (show) {
      const msg = PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
      setPraise(msg);
      setVisible(true);
      fireConfetti();

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDone, 300);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [show, fireConfetti, onDone]);

  if (!show && !visible) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex flex-col items-center justify-center
        bg-black/20 backdrop-blur-sm
        transition-opacity duration-300
        ${visible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={() => { setVisible(false); setTimeout(onDone, 300); }}
    >
      <div className="animate-bounce">
        <div className="text-6xl mb-4">🎉</div>
      </div>
      <p className="text-3xl font-bold text-white drop-shadow-lg mb-2">
        {praise}
      </p>
      {memberName && (
        <p className="text-lg text-white/90 drop-shadow-md">
          {memberName}が +{points}pt ゲット!
        </p>
      )}
    </div>
  );
}
