"use client";

import { motion } from 'framer-motion';

export const AnimatedLoader = ({ query }: { query: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-96 space-y-4"
    >
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            className="w-2.5 h-2.5 bg-zinc-500 rounded-full"
          />
        ))}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-400">
          Searching for <span className="text-zinc-400 font-medium">{query}</span>
        </p>
      </div>
    </motion.div>
  );
};
