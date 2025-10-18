import { useStore } from '../../context/store';
import { Bell, Volume2, MessageSquare, AlertTriangle, Info } from 'lucide-react';

const NotificationsPanel = () => {
  const { notifications } = useStore(state => state.alertConfig);
  const updateAlertConfig = useStore(state => state.updateAlertConfig);

  const toggleNotification = (key: keyof typeof notifications) => {
    updateAlertConfig({
      notifications: {
        ...notifications,
        [key]: !notifications[key]
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-blue-400 mb-1">Notification Settings</p>
          <p>
            Configure how and when you receive notifications for alerts. These settings affect
            all alert types including anomalies, rule matches, and system events.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Master Toggle */}
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${notifications.enabled ? 'bg-green-600/20' : 'bg-gray-700'}`}>
                <Bell className={`w-5 h-5 ${notifications.enabled ? 'text-green-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Enable Notifications</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Master switch for all alert notifications
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleNotification('enabled')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.enabled ? 'bg-green-600' : 'bg-gray-600'
              }`}
              role="switch"
              aria-checked={notifications.enabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Individual Settings */}
        <div className={`space-y-3 transition-opacity ${notifications.enabled ? 'opacity-100' : 'opacity-50'}`}>
          {/* Toast Notifications */}
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${notifications.toast ? 'bg-blue-600/20' : 'bg-gray-700'}`}>
                  <MessageSquare className={`w-5 h-5 ${notifications.toast ? 'text-blue-400' : 'text-gray-500'}`} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Toast Notifications</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Show popup notifications in the bottom-right corner
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleNotification('toast')}
                disabled={!notifications.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.toast && notifications.enabled ? 'bg-blue-600' : 'bg-gray-600'
                } ${!notifications.enabled && 'opacity-50 cursor-not-allowed'}`}
                role="switch"
                aria-checked={notifications.toast}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.toast ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Sound Alerts */}
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${notifications.sound ? 'bg-purple-600/20' : 'bg-gray-700'}`}>
                  <Volume2 className={`w-5 h-5 ${notifications.sound ? 'text-purple-400' : 'text-gray-500'}`} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Sound Alerts</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Play an audible alert for critical anomalies
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleNotification('sound')}
                disabled={!notifications.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.sound && notifications.enabled ? 'bg-purple-600' : 'bg-gray-600'
                } ${!notifications.enabled && 'opacity-50 cursor-not-allowed'}`}
                role="switch"
                aria-checked={notifications.sound}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.sound ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Auto-create Incidents */}
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${notifications.autoIncident ? 'bg-orange-600/20' : 'bg-gray-700'}`}>
                  <AlertTriangle className={`w-5 h-5 ${notifications.autoIncident ? 'text-orange-400' : 'text-gray-500'}`} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Auto-create Incidents</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Automatically create incidents for critical alerts
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleNotification('autoIncident')}
                disabled={!notifications.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifications.autoIncident && notifications.enabled ? 'bg-orange-600' : 'bg-gray-600'
                } ${!notifications.enabled && 'opacity-50 cursor-not-allowed'}`}
                role="switch"
                aria-checked={notifications.autoIncident}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notifications.autoIncident ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview/Status */}
      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-200 mb-3">Current Configuration</h3>
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Master notifications:</span>
              <span className={notifications.enabled ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                {notifications.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Toast popups:</span>
              <span className={notifications.enabled && notifications.toast ? 'text-blue-400' : 'text-gray-500'}>
                {notifications.enabled && notifications.toast ? 'On' : 'Off'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Sound alerts:</span>
              <span className={notifications.enabled && notifications.sound ? 'text-purple-400' : 'text-gray-500'}>
                {notifications.enabled && notifications.sound ? 'On' : 'Off'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Auto incidents:</span>
              <span className={notifications.enabled && notifications.autoIncident ? 'text-orange-400' : 'text-gray-500'}>
                {notifications.enabled && notifications.autoIncident ? 'On' : 'Off'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-200 mb-3">Tips</h3>
        <div className="space-y-2 text-sm text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-blue-400"></span>
            <span>Toast notifications appear briefly and don't require dismissal</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400"></span>
            <span>Sound alerts only play for critical anomalies (score  0.8)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400"></span>
            <span>Auto-incident creation helps track and resolve critical issues systematically</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-400"></span>
            <span>You can temporarily disable notifications during maintenance windows</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;
