'use client';

import { useEffect, useState } from 'react';

interface ConfettiProps {
  onComplete?: () => void;
}

export default function Confetti({ onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    angle: number;
    velocity: number;
    color: string;
    size: number;
  }>>([]);

  useEffect(() => {
    // Create confetti particles
    const colors = ['#AC66DA', '#74C648', '#E7E4E4', '#D93F3F'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10,
      angle: Math.random() * 360,
      velocity: 0.8 + Math.random() * 1.2, // Slower velocity
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 6,
    }));

    setParticles(newParticles);

    // Animate particles - slower animation
    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(particle => ({
          ...particle,
          y: particle.y + particle.velocity,
          angle: particle.angle + 2, // Slower rotation
          x: particle.x + Math.sin(particle.angle * Math.PI / 180) * 0.3, // Slower horizontal movement
        })).filter(particle => particle.y < 110)
      );
    }, 20); // Slightly slower frame rate

    // Cleanup after animation - longer duration
    const timeout = setTimeout(() => {
      clearInterval(interval);
      onComplete?.();
    }, 5000); // Increased from 3000 to 5000ms

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute rounded-sm"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.angle}deg)`,
            opacity: particle.y > 100 ? 0 : 1,
            transition: 'opacity 0.3s',
          }}
        />
      ))}
    </div>
  );
}

