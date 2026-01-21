"use client";

import { motion } from 'framer-motion';

export const AnimatedLoader = ({ query }: { query: string }) => {
  const dots = [0, 1, 2, 3, 4];
  
  const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  };

  const textVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  const dotVariants = {
    initial: { opacity: 0.3, y: 0 },
    animate: (i: number) => ({
      opacity: [0.3, 1, 1, 1, 0.3],
      y: [0, -8, -8, -8, 0],
      transition: {
        duration: 2.4,
        repeat: Infinity,
        delay: i * 0.2,
      },
    }),
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center justify-center min-h-96 space-y-8"
    >
      <div className="flex gap-2 h-12">
        {dots.map((dot) => (
          <motion.div
            key={dot}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            custom={dot}
            className="w-3 h-3 bg-linear-to-b from-zinc-400 to-zinc-600 rounded-full"
          />
        ))}
      </div>

      {/* Search query text */}
      <motion.div
        variants={textVariants}
        initial="initial"
        animate="animate"
        className="text-center space-y-2"
      >
        <p className="text-lg font-medium text-white">
          Searching for <span className="text-zinc-400 font-semibold">{query}</span>
        </p>
        <p className="text-sm text-gray-500">
          Analyzing and generating comprehensive results...
        </p>
      </motion.div>

      <motion.div
        animate={{ width: ['0%', '100%', '0%'] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="h-1 bg-linear-to-r from-zinc-400 via-zinc-500 to-zinc-400 rounded-full"
        style={{ maxWidth: '200px' }}
      />

      <div className="flex gap-3 text-xs text-gray-400 mt-4">
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          ∘ Searching web
        </motion.span>
        <span>∘</span>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
        >
          ∘ Analyzing
        </motion.span>
        <span>∘</span>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
        >
          ∘ Generating
        </motion.span>
      </div>
    </motion.div>
  );
};
