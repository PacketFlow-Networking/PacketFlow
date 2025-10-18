import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  onDismiss: (id: string) => void;
  playSound?: boolean;
}

export const Toast = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  dismissible = true,
  onDismiss,
  playSound = false,
}: ToastProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (playSound) {
      playNotificationSound(type);
    }
  }, [playSound, type]);

  useEffect(() => {
    if (duration === 0) return; // Persistent toast

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 50));
        if (newProgress <= 0) {
          handleDismiss();
          return 0;
        }
        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [duration]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(id);
    }, 300);
  };

  const playNotificationSound = (soundType: ToastType) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different types
      const frequencies: Record<ToastType, number[]> = {
        success: [523.25, 659.25], // C5, E5
        error: [392, 311.13], // G4, Eb4
        warning: [440, 493.88], // A4, B4
        info: [523.25], // C5
      };

      const freqs = frequencies[soundType];
      oscillator.frequency.value = freqs[0];
      gainNode.gain.value = 0.1;

      oscillator.start(audioContext.currentTime);
      
      if (freqs[1]) {
        oscillator.frequency.setValueAtTime(freqs[1], audioContext.currentTime + 0.1);
      }
      
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.warn('Failed to play notification sound:', e);
    }
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  const colorClasses = {
    success: 'bg-green-900/90 border-green-700 text-green-100',
    error: 'bg-red-900/90 border-red-700 text-red-100',
    warning: 'bg-yellow-900/90 border-yellow-700 text-yellow-100',
    info: 'bg-blue-900/90 border-blue-700 text-blue-100',
  };

  const progressColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
        shadow-lg min-w-[320px] max-w-md
        ${colorClasses[type]}
        ${isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}
      `}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        {icons[type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{title}</p>
        {message && (
          <p className="mt-1 text-sm opacity-90 break-words">
            {message}
          </p>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Progress bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-lg overflow-hidden">
          <div
            className={`h-full transition-all ease-linear ${progressColors[type]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
