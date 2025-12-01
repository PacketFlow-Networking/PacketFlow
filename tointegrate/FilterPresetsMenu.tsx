import { useState } from 'react';
import { Save, Bookmark, Trash2, Clock, X } from 'lucide-react';
import { useStore } from '../context/store';
import { useToast } from '../context/ToastContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const FilterPresetsMenu = () => {
  const { 
    filters, 
    alertConfig, 
    saveFilterPreset, 
    applyFilterPreset, 
    deleteFilterPreset,
    trackFilterApplication 
  } = useStore();
  const { showSuccess, showInfo } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      showInfo('Name Required', 'Please enter a name for this filter preset');
      return;
    }

    // Check if filters are not default/empty
    const hasFilters = 
      filters.searchQuery || 
      filters.severities.length > 0 || 
      filters.protocols.length > 0 || 
      filters.ports.length > 0 || 
      filters.onlyAnomalies || 
      filters.timeRange !== 'all';

    if (!hasFilters) {
      showInfo('No Filters Active', 'Apply some filters before saving a preset');
      return;
    }

    saveFilterPreset(presetName, filters);
    showSuccess('Preset Saved', `Filter preset "${presetName}" has been saved`);
    setPresetName('');
    setIsSaveModalOpen(false);
  };

  const handleApplyPreset = (id: string, name: string) => {
    applyFilterPreset(id);
    trackFilterApplication();
    showSuccess('Preset Applied', `Applied filter preset "${name}"`);
    setIsOpen(false);
  };

  const handleDeletePreset = (id: string, name: string) => {
    if (confirm(`Delete preset "${name}"?`)) {
      deleteFilterPreset(id);
      showSuccess('Preset Deleted', `Filter preset "${name}" has been deleted`);
    }
  };

  const presets = alertConfig.filter_presets || []; // Safety check for undefined

  return (
    <>
      <div className="relative">
        {/* Main Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--color-panel)] hover:bg-[var(--color-panel-hover)] border border-[var(--color-border)] rounded-lg transition-colors"
          title="Filter Presets"
        >
          <Bookmark className="w-4 h-4" />
          <span>Presets</span>
          {presets.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
              {presets.length}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-30"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg shadow-2xl z-40 overflow-hidden">
              {/* Header */}
              <div className="p-3 border-b border-[var(--color-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-blue-400" />
                  <h3 className="font-semibold text-white">Filter Presets</h3>
                </div>
                <button
                  onClick={() => setIsSaveModalOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                >
                  <Save className="w-3 h-3" />
                  Save Current
                </button>
              </div>

              {/* Presets List */}
              <div className="max-h-96 overflow-y-auto scrollbar">
                {presets.length === 0 ? (
                  <div className="p-6 text-center text-gray-400">
                    <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No saved presets</p>
                    <p className="text-xs mt-1">Apply filters and click "Save Current"</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {presets.map((preset) => (
                      <div
                        key={preset.id}
                        className="group p-3 hover:bg-[var(--color-base)] rounded-lg transition-colors"
                      >
                        {/* Preset Name & Time */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white truncate">
                              {preset.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {dayjs(preset.created_at).fromNow()}
                              </span>
                              {preset.last_used && (
                                <span className="text-xs text-green-400">
                                  • Last used {dayjs(preset.last_used).fromNow()}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeletePreset(preset.id, preset.name)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                            title="Delete preset"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>

                        {/* Filter Summary */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {preset.filters.searchQuery && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                              Search: {preset.filters.searchQuery}
                            </span>
                          )}
                          {preset.filters.severities.length > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded">
                              {preset.filters.severities.length} severities
                            </span>
                          )}
                          {preset.filters.protocols.length > 0 && (
                            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                              {preset.filters.protocols.length} protocols
                            </span>
                          )}
                          {preset.filters.onlyAnomalies && (
                            <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded">
                              Anomalies only
                            </span>
                          )}
                          {preset.filters.timeRange !== 'all' && (
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-300 rounded">
                              {preset.filters.timeRange}
                            </span>
                          )}
                        </div>

                        {/* Apply Button */}
                        <button
                          onClick={() => handleApplyPreset(preset.id, preset.name)}
                          className="w-full px-3 py-2 text-sm bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded transition-colors"
                        >
                          Apply Preset
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Save Preset Modal */}
      {isSaveModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fadeIn"
            onClick={() => setIsSaveModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-md animate-scale-in">
            <div className="bg-[var(--color-panel)] border border-[var(--color-border)] rounded-lg shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <Save className="w-5 h-5 text-blue-400" />
                  <h3 className="font-semibold text-white">Save Filter Preset</h3>
                </div>
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="p-1 hover:bg-[var(--color-base)] rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Preset Name
                  </label>
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSavePreset();
                      }
                    }}
                    placeholder="e.g., Critical DNS Events"
                    className="w-full px-3 py-2 bg-[var(--color-base)] border border-[var(--color-border)] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Current Filters Preview */}
                <div className="p-3 bg-[var(--color-base)] rounded-lg border border-[var(--color-border)]">
                  <p className="text-xs text-gray-400 mb-2">Current Filters:</p>
                  <div className="flex flex-wrap gap-1">
                    {filters.searchQuery && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                        Search: {filters.searchQuery}
                      </span>
                    )}
                    {filters.severities.length > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded">
                        {filters.severities.join(', ')}
                      </span>
                    )}
                    {filters.protocols.length > 0 && (
                      <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
                        {filters.protocols.join(', ')}
                      </span>
                    )}
                    {filters.onlyAnomalies && (
                      <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded">
                        Anomalies only
                      </span>
                    )}
                    {filters.timeRange !== 'all' && (
                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-300 rounded">
                        Time: {filters.timeRange}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--color-border)]">
                <button
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreset}
                  className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default FilterPresetsMenu;
