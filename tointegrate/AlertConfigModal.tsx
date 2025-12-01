import { useState } from 'react';
import { X, Shield, Sliders, List, Bell } from 'lucide-react';
import { useStore } from '../../context/store';
import SensitivityPanel from './SensitivityPanel';
import ThresholdsPanel from './ThresholdsPanel';
import IPListPanel from './IPListPanel';
import RulesPanel from './RulesPanel';
import NotificationsPanel from './NotificationsPanel';

interface AlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'sensitivity' | 'thresholds' | 'iplists' | 'rules' | 'notifications';

const AlertConfigModal = ({ isOpen, onClose }: AlertConfigModalProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('sensitivity');
  const resetAlertConfig = useStore(state => state.resetAlertConfig);

  if (!isOpen) return null;

  const tabs = [
    { id: 'sensitivity' as const, label: 'Sensitivity', icon: Sliders },
    { id: 'thresholds' as const, label: 'Thresholds', icon: Shield },
    { id: 'iplists' as const, label: 'IP Lists', icon: List },
    { id: 'rules' as const, label: 'Rules', icon: Bell },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
  ];

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all alert settings to defaults?')) {
      resetAlertConfig();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Alert Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 px-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'sensitivity' && <SensitivityPanel />}
          {activeTab === 'thresholds' && <ThresholdsPanel />}
          {activeTab === 'iplists' && <IPListPanel />}
          {activeTab === 'rules' && <RulesPanel />}
          {activeTab === 'notifications' && <NotificationsPanel />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Reset to Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertConfigModal;
