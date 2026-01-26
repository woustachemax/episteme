import { motion } from 'framer-motion';
import { AlertTriangle, Zap } from 'lucide-react';
import { useState } from 'react';

type BiasAlertProps = {
  biasScore: number;
  threshold?: number;
  onFactCheckClick?: () => void;
  summary?: string;
};

const BIAS_THRESHOLD = 0.6;

export const BiasAlert = ({ 
  biasScore, 
  threshold = BIAS_THRESHOLD,
  onFactCheckClick,
  summary
}: BiasAlertProps) => {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed || biasScore < threshold) {
    return null;
  }

  const exceedsThreshold = biasScore >= threshold;
  
  if (!exceedsThreshold) {
    return null;
  }

  const getAlertLevel = (score: number) => {
    if (score >= 0.8) return { level: 'critical', label: 'Critical Bias Detected' };
    if (score >= 0.7) return { level: 'high', label: 'High Bias Indicators' };
    return { level: 'moderate', label: 'Moderate Bias Detected' };
  };

  const alert = getAlertLevel(biasScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`rounded-lg p-5 border flex items-start gap-4 ${
        alert.level === 'critical' 
          ? 'bg-red-950/40 border-red-700/50' 
          : alert.level === 'high'
          ? 'bg-orange-950/40 border-orange-700/50'
          : 'bg-yellow-950/40 border-yellow-700/50'
      }`}
    >
      <AlertTriangle 
        size={20} 
        className={`shrink-0 mt-0.5 ${
          alert.level === 'critical' 
            ? 'text-red-400' 
            : alert.level === 'high'
            ? 'text-orange-400'
            : 'text-yellow-400'
        }`}
      />
      
      <div className="flex-1">
        <h4 className={`font-semibold text-sm mb-1 ${
          alert.level === 'critical' 
            ? 'text-red-300' 
            : alert.level === 'high'
            ? 'text-orange-300'
            : 'text-yellow-300'
        }`}>
          {alert.label}
        </h4>
        
        <p className={`text-sm mb-3 ${
          alert.level === 'critical' 
            ? 'text-red-200/80' 
            : alert.level === 'high'
            ? 'text-orange-200/80'
            : 'text-yellow-200/80'
        }`}>
          This article contains significant bias indicators (score: {(biasScore * 100).toFixed(0)}%). 
          {summary && ` ${summary}`}
        </p>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onFactCheckClick}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all hover:scale-105 active:scale-95 ${
              alert.level === 'critical' 
                ? 'bg-red-700/40 text-red-300 hover:bg-red-700/60 border border-red-600/40' 
                : alert.level === 'high'
                ? 'bg-orange-700/40 text-orange-300 hover:bg-orange-700/60 border border-orange-600/40'
                : 'bg-yellow-700/40 text-yellow-300 hover:bg-yellow-700/60 border border-yellow-600/40'
            }`}
          >
            <Zap size={14} />
            Fact Check with AI
          </button>
          
          <button
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/40 border border-zinc-600/40 transition-all"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
};
