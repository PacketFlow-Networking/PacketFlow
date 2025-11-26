import { useState, useMemo } from 'react';
import { AlertTriangle, Info, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useStore } from '../../context/store';
import { EventDetailsModal } from '../modals/EventDetailsModal';
import FilterBar from './FilterBar';
import ExportMenu from './ExportMenu';
import type { NetworkEvent } from '../../types';

dayjs.extend(relativeTime);

const EventStream = () => {
  const { events, aiMessages, selectEvent, filters } = useStore();
  const [selectedEvent, setSelectedEvent] = useState<NetworkEvent | null>(null);

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.src?.toLowerCase().includes(query) ||
        event.dst?.toLowerCase().includes(query) ||
        event.proto?.toLowerCase().includes(query) ||
        event.summary?.toLowerCase().includes(query) ||
        event.src_port?.toString().includes(query) ||
        event.dst_port?.toString().includes(query)
      );
    }

    // Severity filter
    if (filters.severities.length > 0) {
      filtered = filtered.filter(event =>
        event.severity && filters.severities.includes(event.severity as any)
      );
    }

    // Protocol filter
    if (filters.protocols.length > 0) {
      filtered = filtered.filter(event =>
        filters.protocols.includes(event.proto)
      );
    }

    // Anomalies only filter
    if (filters.onlyAnomalies) {
      filtered = filtered.filter(event => event.anomaly_score > 0.3);
    }

    // Time range filter
    if (filters.timeRange !== 'all') {
      const now = Date.now();
      const timeRanges = {
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
      };
      const range = timeRanges[filters.timeRange];
      if (range) {
        filtered = filtered.filter(event =>
          now - new Date(event.timestamp).getTime() < range
        );
      }
    }

    return filtered;
  }, [events, filters]);

  const getSeverityBadge = (score: number, severity?: string) => {
    // Use backend severity if available
    if (severity) {
      const severityMap: Record<string, { label: string; class: string }> = {
        'critical': { label: 'Critical', class: 'badge-critical' },
        'high': { label: 'High', class: 'badge-warn' },
        'medium': { label: 'Medium', class: 'badge-info' },
        'low': { label: 'Low', class: 'badge-ok' },
        'normal': { label: 'Normal', class: 'badge-info' },
        'info': { label: 'Info', class: 'badge-info' },
        'warn': { label: 'Warning', class: 'badge-warn' },
        'ok': { label: 'Ok', class: 'badge-ok' },
      };
      return severityMap[severity] || { label: 'Info', class: 'badge-info' };
    }

    // Fallback to score-based severity
    if (score >= 0.8) return { label: 'Critical', class: 'badge-critical' };
    if (score >= 0.5) return { label: 'Warning', class: 'badge-warn' };
    return { label: 'Info', class: 'badge-info' };
  };

  const getAISummaryForEvent = (eventId: string): string | undefined => {
    const relatedMessage = aiMessages.find(msg => 
      msg.event_ids.includes(eventId)
    );
    return relatedMessage?.content;
  };

  const handleEventClick = (event: NetworkEvent) => {
    setSelectedEvent(event);
    selectEvent(event.id);
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    selectEvent(null);
  };

  // Find related events (same source or destination, within 5 minutes)
  const getRelatedEvents = (event: NetworkEvent): NetworkEvent[] => {
    if (!event) return [];
    const eventTime = new Date(event.timestamp).getTime();
    const fiveMinutes = 5 * 60 * 1000;
    
    return events.filter(e => 
      e.id !== event.id && 
      Math.abs(new Date(e.timestamp).getTime() - eventTime) < fiveMinutes &&
      (e.src === event.src || e.dst === event.dst || e.src === event.dst || e.dst === event.src)
    ).slice(0, 10);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-info" />
              <h2 className="text-lg font-semibold text-text">Event Stream</h2>
            </div>
            <ExportMenu events={filteredEvents} filteredCount={filteredEvents.length} />
          </div>
          <p className="text-sm text-text-dim">
            {filteredEvents.length} {filteredEvents.length === events.length ? '' : `of ${events.length}`} events
          </p>
        </div>

        {/* Filter Bar */}
        <FilterBar />

        {/* Event List */}
        <div className="flex-1 overflow-y-auto scrollbar">
          {filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Info className="w-12 h-12 text-text-dim mb-3" />
              <p className="text-text-dim">
                {events.length === 0 ? 'No events yet' : 'No events match your filters'}
              </p>
              <p className="text-sm text-text-dim mt-1">
                {events.length === 0 
                  ? 'Waiting for network activity...' 
                  : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredEvents.map((event) => {
                const severity = getSeverityBadge(event.anomaly_score, event.severity);
                const hasAnomalyScore = event.anomaly_score > 0.3;

                return (
                  <div
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className={`panel p-4 cursor-pointer panel-hover transition-all ${
                      hasAnomalyScore && event.anomaly_score >= 0.8 
                        ? 'border-critical animate-pulse-critical' 
                        : ''
                    }`}
                    role="button"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleEventClick(event);
                      }
                    }}
                    aria-label={`Event: ${event.summary}`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {hasAnomalyScore && (
                          <AlertTriangle 
                            className={`w-4 h-4 flex-shrink-0 ${
                              event.anomaly_score >= 0.8 ? 'text-critical' :
                              event.anomaly_score >= 0.5 ? 'text-warn' : 'text-info'
                            }`}
                          />
                        )}
                        <span className={`badge ${severity.class} flex-shrink-0`}>
                          {severity.label}
                        </span>
                        <span className="text-xs text-text-dim truncate">
                          {dayjs(event.timestamp).fromNow()}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-text-dim flex-shrink-0 ml-2">
                        {event.proto}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-text mb-2 line-clamp-2">
                      {event.summary}
                    </p>

                    {/* Connection Info */}
                    <div className="flex items-center gap-2 text-xs font-mono text-text-dim">
                      <span className="truncate max-w-[45%]">{event.src}</span>
                      <span></span>
                      <span className="truncate max-w-[45%]">{event.dst}</span>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-dim">
                      <span>{event.flows} flows</span>
                      {event.anomaly_score > 0 && (
                        <span className={`font-semibold ${
                          event.anomaly_score >= 0.8 ? 'text-critical' :
                          event.anomaly_score >= 0.5 ? 'text-warn' : 'text-info'
                        }`}>
                          Score: {(event.anomaly_score * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={handleCloseModal}
        relatedEvents={selectedEvent ? getRelatedEvents(selectedEvent) : []}
      />
    </>
  );
};

export default EventStream;
