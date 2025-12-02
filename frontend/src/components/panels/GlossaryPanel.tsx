import { useState } from 'react';
import { HelpCircle, X, Book, Search } from 'lucide-react';
import { useStore } from '../../context/store';
import { useAdaptiveUI } from '../../hooks/useAdaptiveUI';

interface Term {
  name: string;
  definition: string;
  example?: string;
  category: 'detection' | 'protocol' | 'metric' | 'threat';
}

const GLOSSARY: Term[] = [
  // Detection Methods
  { name: 'Z-Score', definition: 'Statistical measure of how many standard deviations a value is from the mean. Used to detect outliers.', example: 'Z-Score of 4.5 means the value is 4.5 standard deviations above normal.', category: 'detection' },
  { name: 'IQR', definition: 'Interquartile Range: A robust measure of statistical dispersion, the difference between the 75th and 25th percentiles.', example: 'Values outside 1.5IQR are considered outliers.', category: 'detection' },
  { name: 'EWMA', definition: 'Exponentially Weighted Moving Average: Gives more weight to recent observations while tracking trends.', example: 'Detects gradual traffic increases better than simple averages.', category: 'detection' },
  { name: 'Rate-Based', definition: 'Detection method that triggers when packet or flow rates exceed configured thresholds.', example: 'Alert when packets/second > 10,000', category: 'detection' },
  { name: 'Behavioral', definition: 'Analyzes patterns like packet sizes and inter-arrival times to detect anomalies.', example: 'Detects DNS tunneling through unusual packet size entropy.', category: 'detection' },
  { name: 'Port Scan', definition: 'Detection of attempts to connect to multiple ports, indicating reconnaissance activity.', example: 'Single source trying 20+ different destination ports.', category: 'detection' },
  
  // Protocols
  { name: 'DNS', definition: 'Domain Name System: Translates domain names to IP addresses.', example: 'Converts google.com  142.250.185.46', category: 'protocol' },
  { name: 'HTTP', definition: 'HyperText Transfer Protocol: Web traffic protocol for transmitting web pages.', example: 'Loading websites in your browser.', category: 'protocol' },
  { name: 'HTTPS', definition: 'HTTP Secure: Encrypted version of HTTP using TLS/SSL.', example: 'Secure websites with padlock icon.', category: 'protocol' },
  { name: 'TLS', definition: 'Transport Layer Security: Cryptographic protocol for secure communications.', example: 'Encrypts sensitive data like passwords.', category: 'protocol' },
  { name: 'TCP', definition: 'Transmission Control Protocol: Reliable, connection-oriented protocol.', example: 'Web browsing, email, file transfers.', category: 'protocol' },
  { name: 'UDP', definition: 'User Datagram Protocol: Fast, connectionless protocol without reliability guarantees.', example: 'Video streaming, DNS queries, gaming.', category: 'protocol' },
  
  // Metrics
  { name: 'Anomaly Score', definition: 'Numerical value (0-1) indicating how unusual an event is. Higher scores mean more anomalous.', example: '0.95 = Critical anomaly, 0.5 = Moderate, 0.1 = Normal', category: 'metric' },
  { name: 'Flows', definition: 'Number of distinct network connections (source IP + dest IP + protocol).', example: '500 flows = 500 different conversations.', category: 'metric' },
  { name: 'Throughput', definition: 'Amount of data transferred, measured in bytes.', example: '2.5 MB throughput in 5 seconds.', category: 'metric' },
  { name: 'Packet Rate', definition: 'Number of packets transmitted per second.', example: '1,200 packets/second', category: 'metric' },
  { name: 'Baseline Rate', definition: 'Normal/expected rate calculated from historical data.', example: 'Normal traffic: 50 packets/sec', category: 'metric' },
  
  // Threats
  { name: 'DNS Tunneling', definition: 'Technique to exfiltrate data or establish command & control channels through DNS queries.', example: 'Long domain names with encoded data.', category: 'threat' },
  { name: 'Port Scanning Attack', definition: 'Reconnaissance technique to discover open ports and services on a target system.', example: 'Attacker probing ports 1-65535.', category: 'threat' },
  { name: 'DDoS', definition: 'Distributed Denial of Service: Overwhelming a target with traffic from multiple sources.', example: 'Massive packet flood from botnet.', category: 'threat' },
  { name: 'SQL Injection', definition: 'Inserting malicious SQL code into input fields to manipulate databases.', example: '\' OR \'1\'=\'1\' -- in login form', category: 'threat' },
  { name: 'XSS', definition: 'Cross-Site Scripting: Injecting malicious scripts into web pages viewed by other users.', example: '<script>steal_cookies()</script>', category: 'threat' },
  { name: 'Command Injection', definition: 'Executing arbitrary commands on the host operating system.', example: 'Input: file.txt; rm -rf /', category: 'threat' },
];

export default function GlossaryPanel() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { markConceptSeen, trackTerminologySearch } = useStore();
  const { trackTerminologySearch: trackSearch } = useAdaptiveUI();

  const filteredTerms = GLOSSARY.filter(term => {
    const matchesSearch = term.name.toLowerCase().includes(search.toLowerCase()) ||
                         term.definition.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'detection', label: 'Detection Methods', count: GLOSSARY.filter(t => t.category === 'detection').length },
    { id: 'protocol', label: 'Protocols', count: GLOSSARY.filter(t => t.category === 'protocol').length },
    { id: 'metric', label: 'Metrics', count: GLOSSARY.filter(t => t.category === 'metric').length },
    { id: 'threat', label: 'Threats', count: GLOSSARY.filter(t => t.category === 'threat').length },
  ];

  const handleTermClick = (termName: string) => {
    markConceptSeen(termName);
    trackSearch(termName);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    if (value.length >= 3) {
      trackSearch(value);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4">
        <p className="text-sm text-gray-400">
          Search and learn about network security terms, detection methods, protocols, and threats.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search terms..."
            className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
            !selectedCategory
              ? 'bg-blue-500 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          All ({GLOSSARY.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Terms List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredTerms.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No terms found</p>
          </div>
        ) : (
          filteredTerms.map(term => (
            <div
              key={term.name}
              onClick={() => handleTermClick(term.name)}
              className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-blue-500/50 transition-colors cursor-help"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-white text-sm">{term.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  term.category === 'detection' ? 'bg-purple-500/10 text-purple-400' :
                  term.category === 'protocol' ? 'bg-blue-500/10 text-blue-400' :
                  term.category === 'metric' ? 'bg-green-500/10 text-green-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {term.category}
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-2">
                {term.definition}
              </p>
              {term.example && (
                <div className="bg-gray-900/50 border border-gray-700/50 rounded p-2">
                  <p className="text-xs text-gray-400 italic">
                    <span className="font-semibold">Example:</span> {term.example}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-4 border-t border-gray-700 text-center">
        <p className="text-xs text-gray-400">
          {filteredTerms.length} {filteredTerms.length === 1 ? 'term' : 'terms'} • Click terms to mark as learned
        </p>
      </div>
    </div>
  );
}
