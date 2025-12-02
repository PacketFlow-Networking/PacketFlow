import { useEffect } from 'react';
import { X, Keyboard } from 'lucide-react';

interface Shortcut {
  key: string;
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { key: '?', description: 'Show keyboard shortcuts', category: 'General' },
  { key: 'Esc', description: 'Close modal or dialog', category: 'General' },
  { key: 'Ctrl+,', description: 'Open alert configuration', category: 'General' },
  { key: 'Ctrl+P', description: 'Open user profile', category: 'General' },
  { key: '/', description: 'Focus search bar', category: 'Navigation' },
  { key: 'f', description: 'Focus search bar', category: 'Navigation' },
  
  // Shortcuts
  { key: 'a', description: 'Toggle anomalies only', category: 'Filters' },
  { key: 'c', description: 'Clear all filters', category: 'Filters' },
  { key: 'r', description: 'Reset filters to default', category: 'Filters' },
  { key: 't', description: 'Cycle through tabs (Events/Stats/Topology)', category: 'Navigation' },
  { key: 'n', description: 'Show network topology view', category: 'Navigation' },
  { key: 'i', description: 'Toggle Chat/Incidents panel', category: 'Navigation' },
  { key: 'Ctrl+Shift+3', description: 'Open 3D topology view', category: 'Navigation' },
  
  // Event Navigation
  { key: 'j', description: 'Next event', category: 'Events' },
  { key: 'k', description: 'Previous event', category: 'Events' },
  { key: 'Enter', description: 'Open selected event details', category: 'Events' },
  { key: 'Space', description: 'Open selected event details', category: 'Events' },
  
  // Actions
  { key: 'e', description: 'Export events', category: 'Actions' },
  { key: 'm', description: 'Toggle mock mode', category: 'Actions' },
  { key: 's', description: 'Open notification settings', category: 'Actions' },
];

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp = ({ isOpen, onClose }: KeyboardShortcutsHelpProps) => {
  if (!isOpen) return null;

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl animate-scale-in">
        <div className="panel shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10 border border-info/30">
                <Keyboard className="w-5 h-5 text-info" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text">Keyboard Shortcuts</h2>
                <p className="text-sm text-text-dim">Navigate faster with shortcuts</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-panel-hover transition-colors"
              aria-label="Close shortcuts"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar">
            {categories.map((category) => (
              <div key={category}>
                <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-info rounded" />
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts
                    .filter((s) => s.category === category)
                    .map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-panel-hover transition-colors"
                      >
                        <span className="text-sm text-text-dim">{shortcut.description}</span>
                        <kbd className="px-3 py-1.5 text-xs font-semibold text-text bg-panel border border-border rounded-md shadow-sm">
                          {shortcut.key}
                        </kbd>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-border">
            <p className="text-xs text-text-dim">
              Press <kbd className="px-2 py-1 text-xs bg-panel border border-border rounded">?</kbd> anytime to show this dialog
            </p>
            <button onClick={onClose} className="btn btn-primary">
              Got it
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

interface UseKeyboardShortcutsOptions {
  onShowHelp: () => void;
  onFocusSearch: () => void;
  onToggleAnomalies: () => void;
  onClearFilters: () => void;
  onResetFilters: () => void;
  onNextEvent: () => void;
  onPreviousEvent: () => void;
  onOpenEvent: () => void;
  onExport: () => void;
  onOpenSettings: () => void;
  onToggleTab?: () => void;
  onToggleLeftPanel?: () => void;
  onOpenAlertConfig?: () => void;
  onShowTopology?: () => void;
  onShow3DTopology?: () => void;
  onOpenUserProfile?: () => void;
  isModalOpen?: boolean;
}

export const useKeyboardShortcuts = (options: UseKeyboardShortcutsOptions) => {
  const {
    onShowHelp,
    onFocusSearch,
    onToggleAnomalies,
    onClearFilters,
    onResetFilters,
    onNextEvent,
    onPreviousEvent,
    onOpenEvent,
    onExport,
    onOpenSettings,
    onToggleTab,
    onToggleLeftPanel,
    onOpenAlertConfig,
    onShowTopology,
    onShow3DTopology,
    onOpenUserProfile,
    isModalOpen = false,
  } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Special case: '/' and 'f' should focus search even when not in input
      if ((e.key === '/' || e.key === 'f') && !isInput && !isModalOpen) {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      // Special case: '?' should show help regardless
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        onShowHelp();
        return;
      }

      // Special case: 'Esc' should close modals
      if (e.key === 'Escape' && isModalOpen) {
        e.preventDefault();
        return; // Let the modal handle closing
      }
      
      // Special case: 'Ctrl+,' for alert config
      if (e.key === ',' && (e.ctrlKey || e.metaKey) && !isInput) {
        e.preventDefault();
        if (onOpenAlertConfig) onOpenAlertConfig();
        return;
      }

      // Special case: 'Ctrl+Shift+3' for 3D topology
      if (e.key === '#' && e.ctrlKey && e.shiftKey && !isInput) {
        e.preventDefault();
        if (onShow3DTopology) onShow3DTopology();
        return;
      }

      // Special case: 'Ctrl+P' for user profile
      if (e.key === 'p' && (e.ctrlKey || e.metaKey) && !isInput) {
        e.preventDefault();
        if (onOpenUserProfile) onOpenUserProfile();
        return;
      }

      // Don't process other shortcuts when in input or modal is open
      if (isInput || isModalOpen) return;

      // Handle shortcuts
      switch (e.key.toLowerCase()) {
        case 'a':
          e.preventDefault();
          onToggleAnomalies();
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) return; // Allow Ctrl+C for copy
          e.preventDefault();
          onClearFilters();
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) return; // Allow Ctrl+R for refresh
          e.preventDefault();
          onResetFilters();
          break;
        case 'j':
          e.preventDefault();
          onNextEvent();
          break;
        case 'k':
          e.preventDefault();
          onPreviousEvent();
          break;
        case 'enter':
        case ' ':
          // Only if an event is selected
          e.preventDefault();
          onOpenEvent();
          break;
        case 'e':
          e.preventDefault();
          onExport();
          break;
        case 's':
          e.preventDefault();
          onOpenSettings();
          break;
        case 't':
          e.preventDefault();
          if (onToggleTab) onToggleTab();
          break;
        case 'i':
          e.preventDefault();
          if (onToggleLeftPanel) onToggleLeftPanel();
          break;
        case 'n':
          e.preventDefault();
          if (onShowTopology) onShowTopology();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    onShowHelp,
    onFocusSearch,
    onToggleAnomalies,
    onClearFilters,
    onResetFilters,
    onNextEvent,
    onPreviousEvent,
    onOpenEvent,
    onExport,
    onOpenSettings,
    isModalOpen,
  ]);
};
