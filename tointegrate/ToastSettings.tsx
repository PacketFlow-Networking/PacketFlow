import { useState } from 'react';
import { Bell, BellOff, Volume2, VolumeX, X } from 'lucide-react';

interface ToastSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ToastSettings = ({ isOpen, onClose }: ToastSettingsProps) => {
  const [settings, setSettings] = useState({
    enableToasts: true,
    enableSound: true,
    showCriticalOnly: false,
    showConnectionStatus: true,
  });

  if (!isOpen) return null;

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [key]: !prev[key] };
      // Save to localStorage
      localStorage.setItem('toastSettings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md">
        <div className="panel p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Settings
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-panel-hover transition-colors"
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            {/* Enable Toasts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.enableToasts ? (
                  <Bell className="w-5 h-5 text-info" />
                ) : (
                  <BellOff className="w-5 h-5 text-text-dim" />
                )}
                <div>
                  <p className="font-medium text-text">Enable Notifications</p>
                  <p className="text-sm text-text-dim">Show toast notifications for events</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('enableToasts')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.enableToasts ? 'bg-info' : 'bg-border'
                }`}
                aria-label="Toggle notifications"
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.enableToasts ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Enable Sound */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.enableSound ? (
                  <Volume2 className="w-5 h-5 text-info" />
                ) : (
                  <VolumeX className="w-5 h-5 text-text-dim" />
                )}
                <div>
                  <p className="font-medium text-text">Sound Alerts</p>
                  <p className="text-sm text-text-dim">Play sound for critical alerts</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('enableSound')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.enableSound ? 'bg-info' : 'bg-border'
                }`}
                aria-label="Toggle sound"
                disabled={!settings.enableToasts}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.enableSound ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Critical Only */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-critical animate-pulse" />
                </div>
                <div>
                  <p className="font-medium text-text">Critical Only</p>
                  <p className="text-sm text-text-dim">Show only high-priority alerts</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('showCriticalOnly')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.showCriticalOnly ? 'bg-info' : 'bg-border'
                }`}
                aria-label="Toggle critical only"
                disabled={!settings.enableToasts}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.showCriticalOnly ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-ok" />
                </div>
                <div>
                  <p className="font-medium text-text">Connection Status</p>
                  <p className="text-sm text-text-dim">Notify on connect/disconnect</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('showConnectionStatus')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.showConnectionStatus ? 'bg-info' : 'bg-border'
                }`}
                aria-label="Toggle connection status"
                disabled={!settings.enableToasts}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.showConnectionStatus ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6 p-3 bg-info/10 border border-info/30 rounded-lg">
            <p className="text-sm text-info">
               Notifications help you stay aware of critical network events without constantly 
              monitoring the interface.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
