import { useState } from 'react';
import { useStore } from '../../context/store';
import { Plus, X, Info, Shield, AlertTriangle } from 'lucide-react';
import type { IPListEntry } from '../../types';

const IPListPanel = () => {
  const { whitelist, blacklist } = useStore(state => state.alertConfig);
  const addWhitelistIP = useStore(state => state.addWhitelistIP);
  const removeWhitelistIP = useStore(state => state.removeWhitelistIP);
  const addBlacklistIP = useStore(state => state.addBlacklistIP);
  const removeBlacklistIP = useStore(state => state.removeBlacklistIP);
  const events = useStore(state => state.events); // H5-02: Get events for safety check

  const [activeList, setActiveList] = useState<'whitelist' | 'blacklist'>('whitelist');
  const [newIP, setNewIP] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showSafetyWarning, setShowSafetyWarning] = useState(false); // H5-02: Safety warning modal
  const [pendingEntry, setPendingEntry] = useState<IPListEntry | null>(null); // H5-02: Store pending entry

  const validateIP = (ip: string): boolean => {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(\/\d{1,3})?$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  };
  
  // H5-02: Check if IP has recent HIGH/CRITICAL alerts
  const checkIPRecentAlerts = (ip: string): { hasAlerts: boolean; count: number; severity: string } => {
    const now = Date.now();
    const RECENT_THRESHOLD = 30 * 60 * 1000; // Last 30 minutes
    
    // Extract base IP (remove CIDR notation if present)
    const baseIP = ip.split('/')[0];
    
    // Find recent high/critical alerts involving this IP
    const recentAlerts = events.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      const isRecent = now - eventTime < RECENT_THRESHOLD;
      const isHighSeverity = event.severity === 'high' || event.severity === 'critical';
      const involvesIP = event.src.includes(baseIP) || event.dst.includes(baseIP);
      
      return isRecent && isHighSeverity && involvesIP;
    });
    
    const criticalCount = recentAlerts.filter(e => e.severity === 'critical').length;
    const highestSeverity = criticalCount > 0 ? 'critical' : recentAlerts.length > 0 ? 'high' : 'none';
    
    return {
      hasAlerts: recentAlerts.length > 0,
      count: recentAlerts.length,
      severity: highestSeverity
    };
  };

  const handleAdd = () => {
    if (!newIP.trim()) return;
    
    if (!validateIP(newIP.trim())) {
      alert('Invalid IP address format. Use IPv4 (e.g., 192.168.1.1) or IPv6 format, optionally with CIDR notation.');
      return;
    }

    const entry: IPListEntry = {
      ip: newIP.trim(),
      comment: newComment.trim() || undefined,
      added_at: new Date().toISOString()
    };

    if (activeList === 'whitelist') {
      if (whitelist.some(e => e.ip === entry.ip)) {
        alert('This IP is already in the whitelist');
        return;
      }
      
      // H5-02: Check for recent alerts before whitelisting
      const alertCheck = checkIPRecentAlerts(entry.ip);
      if (alertCheck.hasAlerts) {
        setPendingEntry(entry);
        setShowSafetyWarning(true);
        return; // Show warning modal, don't add yet
      }
      
      addWhitelistIP(entry);
    } else {
      if (blacklist.some(e => e.ip === entry.ip)) {
        alert('This IP is already in the blacklist');
        return;
      }
      addBlacklistIP(entry);
    }

    setNewIP('');
    setNewComment('');
  };
  
  // H5-02: Confirm adding IP despite warnings
  const confirmAddDespiteWarning = () => {
    if (pendingEntry && activeList === 'whitelist') {
      addWhitelistIP(pendingEntry);
      setNewIP('');
      setNewComment('');
      setPendingEntry(null);
      setShowSafetyWarning(false);
    }
  };
  
  // H5-02: Cancel adding IP
  const cancelAdd = () => {
    setPendingEntry(null);
    setShowSafetyWarning(false);
  };

  const handleRemove = (ip: string) => {
    if (activeList === 'whitelist') {
      removeWhitelistIP(ip);
    } else {
      removeBlacklistIP(ip);
    }
  };

  const currentList = activeList === 'whitelist' ? whitelist : blacklist;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-blue-400 mb-1">IP Whitelist & Blacklist</p>
          <p>
            <strong>Whitelist:</strong> IPs that never trigger alerts (trusted sources).
            <br />
            <strong>Blacklist:</strong> IPs that always trigger alerts (known threats).
          </p>
        </div>
      </div>

      {/* List Selector */}
      <div className="flex gap-2 p-1 bg-gray-800 rounded-lg">
        <button
          onClick={() => setActiveList('whitelist')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeList === 'whitelist'
              ? 'bg-green-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          Whitelist ({whitelist.length})
        </button>
        <button
          onClick={() => setActiveList('blacklist')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-colors ${
            activeList === 'blacklist'
              ? 'bg-red-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Blacklist ({blacklist.length})
        </button>
      </div>

      {/* Add Form */}
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-sm font-medium text-white mb-3">
          Add to {activeList === 'whitelist' ? 'Whitelist' : 'Blacklist'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">IP Address or CIDR</label>
            <input
              type="text"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              placeholder="e.g., 192.168.1.1 or 10.0.0.0/24"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Comment (optional)</label>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="e.g., Office network"
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add IP
          </button>
        </div>
      </div>

      {/* IP List */}
      <div>
        <h3 className="text-sm font-medium text-gray-200 mb-3">
          Current {activeList === 'whitelist' ? 'Whitelist' : 'Blacklist'}
        </h3>
        {currentList.length === 0 ? (
          <div className="p-8 text-center text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700">
            <p>No IPs in {activeList === 'whitelist' ? 'whitelist' : 'blacklist'}</p>
            <p className="text-sm mt-1">Add IPs using the form above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentList.map(entry => (
              <div
                key={entry.ip}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-white">{entry.ip}</code>
                    {activeList === 'whitelist' && (
                      <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded border border-green-500/30">
                        Trusted
                      </span>
                    )}
                    {activeList === 'blacklist' && (
                      <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded border border-red-500/30">
                        Blocked
                      </span>
                    )}
                  </div>
                  {entry.comment && (
                    <p className="text-xs text-gray-400 mt-1">{entry.comment}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Added: {new Date(entry.added_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(entry.ip)}
                  className="ml-3 p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Remove IP"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* H5-02: Safety Warning Modal */}
      {showSafetyWarning && pendingEntry && (
        <>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]" onClick={cancelAdd} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-md animate-scale-in">
            <div className="bg-gray-900 rounded-xl shadow-2xl border-2 border-yellow-500/50">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-yellow-500/20 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Security Warning</h3>
                    <p className="text-sm text-gray-400">This IP was recently flagged</p>
                  </div>
                </div>
                
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-white text-sm mb-2">
                    The IP address{' '}
                    <span className="font-mono font-semibold text-yellow-400">{pendingEntry.ip}</span>
                    {' '}has recent HIGH or CRITICAL alerts.
                  </p>
                  <p className="text-gray-300 text-sm">
                    Whitelisting this IP will prevent future alerts from this source.
                  </p>
                  <div className="mt-3 text-xs text-gray-400">
                    <p>• {checkIPRecentAlerts(pendingEntry.ip).count} alert(s) in the last 30 minutes</p>
                    <p>• Highest severity: {checkIPRecentAlerts(pendingEntry.ip).severity.toUpperCase()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={cancelAdd}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAddDespiteWarning}
                    className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    Proceed Anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default IPListPanel;
