import { Brain, CheckCircle } from 'lucide-react';
import { useAdaptiveUI } from '../../hooks/useAdaptiveUI';

interface ComplexityModeIndicatorProps {
  compact?: boolean;
}

export default function ComplexityModeIndicator({ compact = false }: ComplexityModeIndicatorProps) {
  const { complexityLevel, uiMode } = useAdaptiveUI();

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'novice': return 'text-green-400 bg-green-500/10';
      case 'intermediate': return 'text-blue-400 bg-blue-500/10';
      case 'expert': return 'text-red-400 bg-red-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getLevelIcon = () => {
    if (uiMode === 'auto') {
      return <Brain className="w-3 h-3" />;
    }
    return <CheckCircle className="w-3 h-3" />;
  };

  if (compact) {
    return (
      <div 
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getLevelColor(complexityLevel)}`}
        title={`UI Mode: ${uiMode} | Level: ${complexityLevel}`}
      >
        {getLevelIcon()}
        <span className="capitalize">{complexityLevel}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getLevelColor(complexityLevel)}`}>
      {getLevelIcon()}
      <div className="flex flex-col">
        <div className="text-xs font-medium capitalize">{complexityLevel} Mode</div>
        <div className="text-xs opacity-70">
          {uiMode === 'auto' ? 'Auto-adapting' : 'Manual'}
        </div>
      </div>
    </div>
  );
}
