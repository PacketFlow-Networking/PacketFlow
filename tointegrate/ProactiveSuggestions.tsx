import { useEffect } from 'react';
import { 
  Lightbulb, 
  Search, 
  Filter, 
  AlertTriangle, 
  BookOpen,
  X,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../context/store';
import type { SuggestionType } from '../types';

const ProactiveSuggestions = () => {
  const { 
    suggestions, 
    dismissSuggestion, 
    clearExpiredSuggestions,
    events,
    addSuggestion,
    dismissedSuggestions
  } = useStore();

  // Auto-generate suggestions based on events
  useEffect(() => {
    const interval = setInterval(() => {
      clearExpiredSuggestions();
      generateSmartSuggestions();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [events, clearExpiredSuggestions]);

  const generateSmartSuggestions = () => {
    const recentEvents = events.slice(0, 20);
    const anomalies = recentEvents.filter(e => e.anomaly_score > 0.7);
    
    // Suggestion 1: Multiple anomalies from same source
    const sourceGroups = anomalies.reduce((acc, e) => {
      acc[e.src] = (acc[e.src] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(sourceGroups).forEach(([src, count]) => {
      if (count >= 3) {
        const suggestionId = `multi-source-${src}`;
        if (!dismissedSuggestions.includes(suggestionId) && 
            !suggestions.find(s => s.id === suggestionId)) {
          addSuggestion({
            id: suggestionId,
            type: 'investigation',
            priority: 'high',
            title: `${count} anomalies from ${src}`,
            description: 'Multiple suspicious events detected from same source. Consider investigating this host.',
            action: {
              label: 'Filter by IP',
              handler: () => {
                // This would be connected to actual filter action
                console.log('Filter by', src);
              }
            },
            dismissible: true,
            timestamp: new Date().toISOString(),
            expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 min expiry
          });
        }
      }
    });

    // Suggestion 2: High anomaly score spike
    const criticalAnomalies = anomalies.filter(e => e.anomaly_score >= 0.9);
    if (criticalAnomalies.length >= 2) {
      const suggestionId = 'critical-spike';
      if (!dismissedSuggestions.includes(suggestionId) && 
          !suggestions.find(s => s.id === suggestionId)) {
        addSuggestion({
          id: suggestionId,
          type: 'action',
          priority: 'high',
          title: `${criticalAnomalies.length} critical anomalies detected`,
          description: 'Unusual spike in critical-severity events. Immediate investigation recommended.',
          action: {
            label: 'Create Incident',
            handler: () => {
              console.log('Create incident from', criticalAnomalies.length, 'events');
            }
          },
          dismissible: true,
          timestamp: new Date().toISOString(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        });
      }
    }

    // Suggestion 3: DNS traffic pattern
    const dnsEvents = recentEvents.filter(e => e.proto === 'DNS');
    if (dnsEvents.length > 10) {
      const suggestionId = 'dns-pattern';
      if (!dismissedSuggestions.includes(suggestionId) && 
          !suggestions.find(s => s.id === suggestionId)) {
        addSuggestion({
          id: suggestionId,
          type: 'insight',
          priority: 'medium',
          title: 'High DNS activity detected',
          description: `${dnsEvents.length} DNS events in last minute. May indicate DNS tunneling or data exfiltration.`,
          action: {
            label: 'View DNS Events',
            handler: () => {
              console.log('Filter DNS events');
            }
          },
          dismissible: true,
          timestamp: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3 * 60 * 1000).toISOString()
        });
      }
    }
  };

  const getIcon = (type: SuggestionType) => {
    switch (type) {
      case 'investigation':
        return <Search className="w-4 h-4" />;
      case 'action':
        return <AlertTriangle className="w-4 h-4" />;
      case 'filter':
        return <Filter className="w-4 h-4" />;
      case 'learning':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'border-critical bg-critical/10';
      case 'medium':
        return 'border-warn bg-warn/10';
      case 'low':
        return 'border-info bg-info/10';
    }
  };

  const getPriorityTextColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-critical';
      case 'medium':
        return 'text-warn';
      case 'low':
        return 'text-info';
    }
  };

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className={`border rounded-lg p-3 transition-all ${getPriorityColor(suggestion.priority)}`}
        >
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 ${getPriorityTextColor(suggestion.priority)}`}>
              {getIcon(suggestion.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="text-sm font-semibold text-text">{suggestion.title}</h4>
                {suggestion.dismissible && (
                  <button
                    onClick={() => dismissSuggestion(suggestion.id)}
                    className="flex-shrink-0 text-text-dim hover:text-text transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <p className="text-xs text-text-dim mb-2">
                {suggestion.description}
              </p>
              
              {suggestion.action && (
                <button
                  onClick={() => {
                    suggestion.action!.handler();
                    if (suggestion.dismissible) {
                      dismissSuggestion(suggestion.id);
                    }
                  }}
                  className={`flex items-center gap-1 text-xs font-medium ${getPriorityTextColor(suggestion.priority)} hover:opacity-80 transition-opacity`}
                >
                  {suggestion.action.label}
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProactiveSuggestions;
