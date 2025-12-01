import { useState } from 'react';
import { Download, FileText, FileJson, FileCode, BarChart3, ChevronDown } from 'lucide-react';
import { exportToCSV, exportToJSON, exportToText, exportStatsSummary, generateFilename } from '../utils/export';
import type { NetworkEvent } from '../types';

interface ExportMenuProps {
  events: NetworkEvent[];
  filteredCount: number;
}

const ExportMenu = ({ events, filteredCount }: ExportMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (format: 'csv' | 'json' | 'text' | 'stats') => {
    // Generate timestamp for filename
    new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    switch (format) {
      case 'csv':
        exportToCSV(events, generateFilename('ainetui-events', 'csv'));
        break;
      case 'json':
        exportToJSON(events, generateFilename('ainetui-events', 'json'));
        break;
      case 'text':
        exportToText(events, generateFilename('ainetui-report', 'txt'));
        break;
      case 'stats':
        exportStatsSummary(events, generateFilename('ainetui-stats', 'txt'));
        break;
    }
    
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-panel-hover hover:bg-border text-text rounded transition-colors text-sm"
        disabled={events.length === 0}
        aria-label="Export events"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
        <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-panel border border-border rounded">E</kbd>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-panel border border-border rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="p-2 border-b border-border bg-panel-hover">
              <p className="text-xs text-text-dim">
                Exporting {filteredCount} event{filteredCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="py-1">
              <button
                onClick={() => handleExport('csv')}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-panel-hover text-text text-sm transition-colors"
              >
                <FileCode className="w-4 h-4 text-ok" />
                <div className="flex-1 text-left">
                  <div className="font-medium">CSV Spreadsheet</div>
                  <div className="text-xs text-text-dim">Excel, Numbers, Sheets</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('json')}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-panel-hover text-text text-sm transition-colors"
              >
                <FileJson className="w-4 h-4 text-info" />
                <div className="flex-1 text-left">
                  <div className="font-medium">JSON Data</div>
                  <div className="text-xs text-text-dim">Structured data format</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('text')}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-panel-hover text-text text-sm transition-colors"
              >
                <FileText className="w-4 h-4 text-warn" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Text Report</div>
                  <div className="text-xs text-text-dim">Human-readable format</div>
                </div>
              </button>

              <div className="border-t border-border my-1"></div>

              <button
                onClick={() => handleExport('stats')}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-panel-hover text-text text-sm transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-critical" />
                <div className="flex-1 text-left">
                  <div className="font-medium">Statistics Summary</div>
                  <div className="text-xs text-text-dim">Top talkers, protocols</div>
                </div>
              </button>
            </div>

            <div className="p-2 border-t border-border bg-base">
              <p className="text-xs text-text-dim text-center">
                Files include timestamp in filename
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportMenu;
