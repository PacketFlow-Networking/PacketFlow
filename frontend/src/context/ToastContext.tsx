import { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { ToastContainer, ToastData } from '../components/Toast/ToastContainer';
import { useAdaptiveDisplay } from '../hooks/useAdaptiveUI';

interface ToastContextValue {
  showToast: (options: Omit<ToastData, 'id'>) => void;
  showSuccess: (title: string, message?: string, playSound?: boolean) => void;
  showError: (title: string, message?: string, playSound?: boolean) => void;
  showWarning: (title: string, message?: string, playSound?: boolean) => void;
  showInfo: (title: string, message?: string, playSound?: boolean) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
  toasts: ToastData[];
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const timeoutsRef = useRef<Map<string, number>>(new Map());
  const adaptiveDisplay = useAdaptiveDisplay();

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      timeoutsRef.current.clear();
    };
  }, []);

  const showToast = useCallback((options: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    // Use adaptive duration if not explicitly set
    const duration = options.duration ?? adaptiveDisplay.toastDuration;
    const newToast: ToastData = {
      id,
      duration,
      dismissible: true,
      playSound: false,
      ...options,
    };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto-dismiss if duration is set
    if (newToast.duration && newToast.duration > 0) {
      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
        timeoutsRef.current.delete(id);
      }, newToast.duration);
      
      // Track timeout for cleanup
      timeoutsRef.current.set(id, timeoutId);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    // Clear timeout if exists
    const timeoutId = timeoutsRef.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutsRef.current.delete(id);
    }
    
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showSuccess = useCallback((title: string, message?: string, playSound?: boolean) => {
    showToast({ type: 'success', title, message, playSound });
  }, [showToast]);

  const showError = useCallback((title: string, message?: string, playSound?: boolean) => {
    // Errors get 1.5x longer duration
    showToast({ type: 'error', title, message, playSound, duration: Math.floor(adaptiveDisplay.toastDuration * 1.5) });
  }, [showToast, adaptiveDisplay.toastDuration]);

  const showWarning = useCallback((title: string, message?: string, playSound?: boolean) => {
    // Warnings get 1.2x longer duration
    showToast({ type: 'warning', title, message, playSound, duration: Math.floor(adaptiveDisplay.toastDuration * 1.2) });
  }, [showToast, adaptiveDisplay.toastDuration]);

  const showInfo = useCallback((title: string, message?: string, playSound?: boolean) => {
    showToast({ type: 'info', title, message, playSound });
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissToast,
        clearAll,
        toasts,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
