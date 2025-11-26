import { useState } from 'react';
import { HelpCircle, X, Book, Search } from 'lucide-react';
import { useStore } from '../../context/store';

interface Term {
  name: string;
  definition: string;
  example?: string;
  category: 'detection' | 'protocol' | 'metric' | 'threat';
}

const GLOSSARY: Term[] = [
  // Detection Methods
  { name: 'Z-Score', definition: 'Statistical measure of how many standard deviations a value is from the mean. Used to detect outliers.', example: 'Z-Score of 4.5 means the value is 4.5 standard deviations above normal.', category: 'detection' },
  { name: 'IQR', definition: 'Interquartile Range: A robust measure of statistical dispersion, the difference between the 75th and 25th percentiles.', example: 'Values outside 1.5×IQR are considered outliers.', category: 'detection' },
  { name: 'EWMA', definition: 'Exponentially Weighted Moving Average: Gives more weight to recent observations while tracking trends.', example: 'Detects gradual traffic increases better than simple averages.', category: 'detection' },
  { name: 'Rate-Based', definition: 'Detection method that triggers when packet or flow rates exceed configured thresholds.', example: 'Alert when packets/second > 10,000', category: 'detection' },
  { name: 'Behavioral', definition: 'Analyzes patterns like packet sizes and inter-arrival times to detect anomalies.', example: 'Detects DNS tunneling through unusual packet size entropy.', category: 'detection' },
  { name: 'Port Scan', definition: 'Detection of attempts to connect to multiple ports, indicating reconnaissance activity.', example: 'Single source trying 20+ different destination ports.', category: 'detection' },
  
  // Protocols
  { name: 'DNS', definition: 'Domain Name System: Translates domain names to IP addresses.', example: 'Converts google.com → 142.250.185.46', category: 'protocol' },
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
  { name: 'Port Scan', definition: 'Reconnaissance technique to discover open ports and services on a target system.', example: 'Attacker probing ports 1-65535.', category: 'threat' },
  { name: 'DDoS', definition: 'Distributed Denial of Service: Overwhelming a target with traffic from multiple sources.', example: 'Massive packet flood from botnet.', category: 'threat' },
  { name: 'SQL Injection', definition: 'Inserting malicious SQL code into input fields to manipulate databases.', example: '\' OR \'1\'=\'1\' -- in login form', category: 'threat' },
  { name: 'XSS', definition: 'Cross-Site Scripting: Injecting malicious scripts into web pages viewed by other users.', example: '<script>steal_cookies()</script>', category: 'threat' },
  { name: 'Command Injection', definition: 'Executing arbitrary commands on the host operating system.', example: 'Input: file.txt; rm -rf /', category: 'threat' },
];

export default function GlossaryPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { markConceptSeen } = useStore();

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
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-info text-base rounded-full shadow-lg hover:bg-info-bright transition-all hover:scale-110 z-40 group"
        title="Open Glossary"
      >
        <Book className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[600px] bg-panel border border-info/30 rounded-lg shadow-2xl flex flex-col z-40 animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-info" />
          <h3 className="text-lg font-semibold text-text">Glossary</h3>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-base transition-colors"
        >
          <X className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms..."
            className="w-full pl-10 pr-3 py-2 bg-base border border-border rounded-lg text-sm text-text placeholder-muted focus:border-info focus:outline-none"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 p-4 border-b border-border overflow-x-auto">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
            !selectedCategory
              ? 'bg-info text-base'
              : 'bg-base text-muted hover:text-text'
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
                ? 'bg-info text-base'
                : 'bg-base text-muted hover:text-text'
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Terms List */}
      <div className="flex-1 overflow-y-auto scrollbar p-4 space-y-3">
        {filteredTerms.length === 0 ? (
          <div className="text-center py-8 text-muted">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No terms found</p>
          </div>
        ) : (
          filteredTerms.map(term => (
            <div
              key={term.name}
              onClick={() => handleTermClick(term.name)}
              className="bg-base border border-border rounded-lg p-3 hover:border-info/50 transition-colors cursor-help"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-text text-sm">{term.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  term.category === 'detection' ? 'bg-accent/10 text-accent' :
                  term.category === 'protocol' ? 'bg-info/10 text-info' :
                  term.category === 'metric' ? 'bg-success/10 text-success' :
                  'bg-error/10 text-error'
                }`}>
                  {term.category}
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed mb-2">
                {term.definition}
              </p>
              {term.example && (
                <div className="bg-panel/50 border border-border/50 rounded p-2">
                  <p className="text-xs text-muted italic">
                    <span className="font-semibold">Example:</span> {term.example}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-base/50 text-center">
        <p className="text-xs text-muted">
          {filteredTerms.length} {filteredTerms.length === 1 ? 'term' : 'terms'} • Click terms to mark as learned
        </p>
      </div>
    </div>
  );
}
