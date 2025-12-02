import { ChevronDown, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useStore } from '../../context/store';
import type { EventGroup } from '../../utils/EventGrouping';
import { formatTimeSpan, getGroupMetrics } from '../../utils/EventGrouping';

dayjs.extend(relativeTime);

interface CollapsedEventGroupProps {
  group: EventGroup;
  isExpanded: boolean;
  onToggle: (groupId: string) => void;
  onSelectEvent: (eventId: string) => void;
}

const severityColors = {
  critical: 'border-red-500 bg-red-50 dark:bg-red-950/30',
  high: 'border-orange-500 bg-orange-50 dark:bg-orange-950/30',
  medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
  low: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30',
};

const severityBadge = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-gray-900',
  low: 'bg-blue-500 text-white',
};

const severityBorderIcon = {
  critical: 'text-red-600 dark:text-red-400',
  high: 'text-orange-600 dark:text-orange-400',
  medium: 'text-yellow-600 dark:text-yellow-400',
  low: 'text-blue-600 dark:text-blue-400',
};

export const CollapsedEventGroup: React.FC<CollapsedEventGroupProps> = ({
  group,
  isExpanded,
  onToggle,
  onSelectEvent,
}) => {
  const metrics = getGroupMetrics(group);
  const topEvent = group.events[0]; // Most recent event in group

  return (
    <div
      className={`border-l-4 rounded-lg transition-all duration-200 ${severityColors[metrics.severity]}`}
    >
      {/* Group Header - Clickable to Expand */}
      <button
        onClick={() => onToggle(group.id)}
        className={`w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10 dark:active:bg-white/10 transition-colors cursor-pointer ${
          isExpanded ? 'border-b border-gray-200 dark:border-gray-700' : ''
        }`}
      >
        <div className="flex items-center gap-3 flex-1">
          {/* Expand icon */}
          <div
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          >
            <ChevronDown
              className={`h-5 w-5 ${severityBorderIcon[metrics.severity]}`}
            />
          </div>

          {/* Threat Icon */}
          <AlertTriangle className={`h-4 w-4 ${severityBorderIcon[metrics.severity]}`} />

          {/* Group Info */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2">
              {/* Threat Type Badge */}
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${severityBadge[metrics.severity]}`}
              >
                {group.primaryThreatIndicator || 'UNKNOWN'}
              </span>

              {/* Source → Destination */}
              <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                {group.src} → {group.dst}
              </span>

              {/* Protocol */}
              <span className="px-2 py-0.5 rounded-full bg-gray-300 dark:bg-gray-600 text-xs font-mono text-gray-900 dark:text-gray-100">
                {group.proto}
              </span>
            </div>

            {/* Subtext */}
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-600 dark:text-gray-400">
              <span>
                <strong>{group.count} events</strong> in {formatTimeSpan(group.timeSpanSeconds)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {dayjs(group.lastTimestamp).fromNow()}
              </span>
            </div>
          </div>
        </div>

        {/* Score Pills */}
        <div className="flex items-center gap-2 ml-4">
          <div className="text-right">
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {group.maxAnomalyScore.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {group.count > 1 && `avg: ${group.avgAnomalyScore.toFixed(2)}`}
            </div>
          </div>

          {/* Trend indicator */}
          {metrics.eventDensity > 2 && (
            <TrendingUp className={`h-4 w-4 ${severityBorderIcon[metrics.severity]}`} />
          )}
        </div>
      </button>

      {/* Expanded Events List */}
      {isExpanded && (
        <div className="p-3 space-y-2 border-t border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-black/20">
          {group.events.map((event) => (
            <button
              key={event.id}
              onClick={() => onSelectEvent(event.id)}
              className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate">
                        {event.src}:{event.src_port} → {event.dst}:{event.dst_port}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                        {event.summary}
                      </div>
                    </div>
                    <div className="ml-3 text-right flex-shrink-0">
                      <div className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100">
                        {event.anomaly_score.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {dayjs(event.timestamp).format('HH:mm:ss')}
                      </div>
                    </div>
                  </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
