'use client';

import { useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { THANKS_MESSAGES } from '@/lib/constants';

interface ThanksOverlayProps {
  show: boolean;
  onDone: () => void;
}

export function ThanksOverlay({ show, onDone }: ThanksOverlayProps) {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  const fireConfetti = useCallback(() => {
    const duration = 1500;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 45,
        origin: { x: 0, y: 0.7 },
        colors: ['#EC4899', '#F43F5E', '#FB7185', '#FDA4AF'],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 45,
        origin: { x: 1, y: 0.7 },
        colors: ['#EC4899', '#F43F5E', '#FB7185', '#FDA4AF'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, []);

  useEffect(() => {
    if (show) {
      const msg = THANKS_MESSAGES[Math.floor(Math.random() * THANKS_MESSAGES.length)];
      setMessage(msg);
      setVisible(true);
      fireConfetti();

      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDone, 300);
      }, 2000);

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
        <div className="text-6xl mb-4">💕</div>
      </div>
      <p className="text-3xl font-bold text-white drop-shadow-lg">
        {message}
      </p>
    </div>
  );
}
