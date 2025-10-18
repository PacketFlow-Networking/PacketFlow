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

  const [activeList, setActiveList] = useState<'whitelist' | 'blacklist'>('whitelist');
  const [newIP, setNewIP] = useState('');
  const [newComment, setNewComment] = useState('');

  const validateIP = (ip: string): boolean => {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}(\/\d{1,3})?$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
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
    </div>
  );
};

export default IPListPanel;
