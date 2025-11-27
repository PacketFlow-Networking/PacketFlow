import { useToast } from '../../context/ToastContext';
import { Bell, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export const ToastDemo = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  return (
    <div className="fixed bottom-24 right-6 panel p-4 shadow-lg w-64 z-30">
      <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
        <Bell className="w-4 h-4" />
        Toast Demo
      </h3>
      <div className="space-y-2">
        <button
          onClick={() => showSuccess('Success!', 'Operation completed successfully', true)}
          className="w-full btn btn-secondary text-xs flex items-center gap-2 justify-center"
        >
          <CheckCircle className="w-3 h-3" />
          Success Toast
        </button>
        <button
          onClick={() => showError('Error!', 'Something went wrong', true)}
          className="w-full btn btn-secondary text-xs flex items-center gap-2 justify-center"
        >
          <AlertCircle className="w-3 h-3" />
          Error Toast
        </button>
        <button
          onClick={() => showWarning('Warning!', 'Critical anomaly detected', true)}
          className="w-full btn btn-secondary text-xs flex items-center gap-2 justify-center"
        >
          <AlertTriangle className="w-3 h-3" />
          Warning Toast
        </button>
        <button
          onClick={() => showInfo('Info', 'Backend connected', true)}
          className="w-full btn btn-secondary text-xs flex items-center gap-2 justify-center"
        >
          <Info className="w-3 h-3" />
          Info Toast
        </button>
      </div>
    </div>
  );
};
