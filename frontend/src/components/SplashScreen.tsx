import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 350);
          return 100;
        }
        return prev + 5;
      });
    }, 110);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, y: -20, transition: { duration: 0.5, ease: 'easeInOut' } }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white text-slate-900 select-none px-4"
      >
        <div className="relative flex flex-col items-center max-w-sm w-full text-center">
          {/* Geometric Emblem representing connected forensic evidence nodes */}
          <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
            {/* Outer network perimeter */}
            <motion.svg
              viewBox="0 0 100 100"
              className="w-full h-full text-blue-600"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              {/* Connecting evidence edges */}
              <line x1="50" y1="15" x2="85" y2="50" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1="85" y1="50" x2="50" y2="85" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1="50" y1="85" x2="15" y2="50" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1="15" y1="50" x2="50" y2="15" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
              <line x1="50" y1="15" x2="50" y2="85" stroke="#93C5FD" strokeWidth="1.5" />
              <line x1="15" y1="50" x2="85" y2="50" stroke="#93C5FD" strokeWidth="1.5" />

              {/* Node A (Vulnerability) */}
              <circle cx="50" cy="15" r="4.5" fill="#2563EB" />
              {/* Node B (Attribution) */}
              <circle cx="85" cy="50" r="4.5" fill="#2563EB" />
              {/* Node C (Telemetry) */}
              <circle cx="50" cy="85" r="4.5" fill="#2563EB" />
              {/* Node D (Artifact) */}
              <circle cx="15" cy="50" r="4.5" fill="#2563EB" />
            </motion.svg>

            {/* Central Temporal Core Node */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.05, 0.95, 1], opacity: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute w-8 h-8 rounded-full bg-slate-900 border-2 border-white shadow-sm flex items-center justify-center text-white"
            >
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            </motion.div>
          </div>

          {/* Wordmark */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-2xl font-bold tracking-tight text-slate-900 uppercase font-sans"
          >
            Temporal CTI Forensics
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-sm font-medium tracking-widest text-slate-500 uppercase mt-2 mb-8 font-mono"
          >
            Evidence. Time. Trust.
          </motion.p>

          {/* Subtle animated progress indicator */}
          <div className="w-48 h-1 bg-slate-100 rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400 tracking-wider">
            INITIALIZING FORENSIC GRAPH PIPELINE {progress}%
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
