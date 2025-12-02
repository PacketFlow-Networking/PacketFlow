import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface PacketFlowIntroProps {
  onComplete?: () => void;
}

/**
 * PacketFlowIntro - Animated startup screen
 * 
 * Features:
 * - Fade-in and scale animation for "PacketFlow" text
 * - Wave fill effect that sweeps across the text
 * - Auto-completes after animation finishes
 * - Respects project color scheme (dark background)
 */
const PacketFlowIntro = ({ onComplete }: PacketFlowIntroProps) => {
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    if (animationComplete && onComplete) {
      const timer = setTimeout(onComplete, 1000); // 1s delay after animation
      return () => clearTimeout(timer);
    }
  }, [animationComplete, onComplete]);

  return (
    <div className="flex items-center justify-center h-screen bg-base overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        onAnimationComplete={() => setAnimationComplete(true)}
        className="relative"
        style={{ perspective: '1000px' }}
      >
        {/* Base text with white outline and dark fill */}
        <h1
          className="text-[6rem] font-bold tracking-wider select-none relative"
          style={{
            color: 'rgb(11, 18, 32)', // Same as background (dark)
            WebkitTextStroke: '0.5px rgba(255, 255, 255, 0.95)', // Very thin outline
            textShadow: '0 0 30px rgba(255, 255, 255, 0.2)',
            fontWeight: '600', // Lighter weight
          }}
        >
          PacketFlow
        </h1>
        
        {/* Wave fill overlay (blue color rising from bottom) */}
        <h1
          className="text-[6rem] font-bold tracking-wider select-none absolute inset-0"
          style={{
            color: 'transparent',
            background: 'linear-gradient(180deg, rgba(100, 149, 237, 0.95) 0%, rgba(100, 149, 237, 0.7) 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextStroke: '0.5px rgba(255, 255, 255, 0.95)', // Same thin outline
            clipPath: 'inset(100% 0 0 0)', // Start hidden (clipped from bottom)
            animation: 'waveFillUp 2.5s ease-out forwards',
            animationDelay: '0.5s',
            fontWeight: '600', // Lighter weight
          }}
        >
          PacketFlow
        </h1>
      </motion.div>

      <style>{`
        @keyframes waveFillUp {
          0% {
            clip-path: inset(100% 0 0 0);
          }
          100% {
            clip-path: inset(0 0 0 0);
          }
        }
      `}</style>
    </div>
  );
};

export default PacketFlowIntro;
