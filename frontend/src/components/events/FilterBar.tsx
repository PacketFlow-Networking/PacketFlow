import { useState } from 'react';
import { Search, Filter, X, Clock } from 'lucide-react';
import { useStore } from '../../context/store';
import type { SeverityLevel } from '../../types';

const FilterBar = () => {
  const { filters, setFilters, resetFilters } = useStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const severityOptions: SeverityLevel[] = ['critical', 'high', 'medium', 'low', 'normal'];
  const protocolOptions = ['TCP', 'UDP', 'ICMP', 'DNS', 'HTTP', 'HTTPS'];
  const timeRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: '5m', label: 'Last 5 min' },
    { value: '15m', label: 'Last 15 min' },
    { value: '30m', label: 'Last 30 min' },
    { value: '1h', label: 'Last 1 hour' },
  ];

  const toggleSeverity = (severity: SeverityLevel) => {
    const newSeverities = filters.severities.includes(severity)
      ? filters.severities.filter(s => s !== severity)
      : [...filters.severities, severity];
    setFilters({ severities: newSeverities });
  };

  const toggleProtocol = (protocol: string) => {
    const newProtocols = filters.protocols.includes(protocol)
      ? filters.protocols.filter(p => p !== protocol)
      : [...filters.protocols, protocol];
    setFilters({ protocols: newProtocols });
  };

  const hasActiveFilters = 
    filters.searchQuery ||
    filters.severities.length > 0 ||
    filters.protocols.length > 0 ||
    filters.onlyAnomalies ||
    filters.timeRange !== 'all';

  const getSeverityColor = (severity: SeverityLevel) => {
    const colors: Record<SeverityLevel, string> = {
      critical: 'bg-critical text-white',
      high: 'bg-warn text-base',
      medium: 'bg-info/70 text-base',
      low: 'bg-ok/70 text-base',
      normal: 'bg-text-dim text-base',
      info: 'bg-info/70 text-base',
      warn: 'bg-warn text-base',
      ok: 'bg-ok/70 text-base',
    };
    return colors[severity] || colors.normal;
  };

  return (
    <div className="border-b border-border bg-panel">
      {/* Main Filter Bar */}
      <div className="p-3 flex items-center gap-3">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-dim" />
          <input
            type="text"
            placeholder="Search by IP, port, or keywords..."
            value={filters.searchQuery}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="input pl-10 pr-10 w-full"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters({ searchQuery: '' })}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-dim hover:text-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Filters */}
        <button
          onClick={() => setFilters({ onlyAnomalies: !filters.onlyAnomalies })}
          className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
            filters.onlyAnomalies
              ? 'bg-warn text-base'
              : 'bg-panel-hover text-text hover:bg-border'
          }`}
        >
          Anomalies Only
        </button>

        {/* Time Range */}
        <select
          value={filters.timeRange}
          onChange={(e) => setFilters({ timeRange: e.target.value as any })}
          className="px-3 py-2 bg-panel-hover border border-border rounded text-sm text-text"
        >
          {timeRangeOptions.map(option => (
            <option key={option.value} value={option.value}>
              <Clock className="w-3 h-3 inline mr-1" />
              {option.label}
            </option>
          ))}
        </select>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`p-2 rounded transition-colors ${
            showAdvanced ? 'bg-info text-base' : 'bg-panel-hover text-text hover:bg-border'
          }`}
          title="Advanced Filters"
        >
          <Filter className="w-4 h-4" />
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 rounded text-sm text-text-dim hover:text-text hover:bg-panel-hover transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="p-3 border-t border-border space-y-3">
          {/* Severity Filters */}
          <div>
            <label className="text-xs text-text-dim mb-2 block">Severity</label>
            <div className="flex flex-wrap gap-2">
              {severityOptions.map(severity => (
                <button
                  key={severity}
                  onClick={() => toggleSeverity(severity)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    filters.severities.includes(severity)
                      ? getSeverityColor(severity)
                      : 'bg-panel-hover text-text-dim hover:text-text'
                  }`}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Protocol Filters */}
          <div>
            <label className="text-xs text-text-dim mb-2 block">Protocol</label>
            <div className="flex flex-wrap gap-2">
              {protocolOptions.map(protocol => (
                <button
                  key={protocol}
                  onClick={() => toggleProtocol(protocol)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    filters.protocols.includes(protocol)
                      ? 'bg-info text-base'
                      : 'bg-panel-hover text-text-dim hover:text-text'
                  }`}
                >
                  {protocol}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="px-3 py-2 bg-base border-t border-border flex items-center gap-2 flex-wrap text-xs">
          <span className="text-text-dim">Active filters:</span>
          {filters.severities.length > 0 && (
            <span className="badge badge-info">
              {filters.severities.length} severity
            </span>
          )}
          {filters.protocols.length > 0 && (
            <span className="badge badge-info">
              {filters.protocols.length} protocol
            </span>
          )}
          {filters.onlyAnomalies && (
            <span className="badge badge-warn">Anomalies only</span>
          )}
          {filters.timeRange !== 'all' && (
            <span className="badge badge-info">
              {timeRangeOptions.find(o => o.value === filters.timeRange)?.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
