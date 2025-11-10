import { useState, useMemo } from 'react';
import { AlertTriangle, Plus, Search, Clock, User, MessageSquare } from 'lucide-react';
import { useStore } from '../context/store';
import { CreateIncidentModal } from './incidents/CreateIncidentModal';
import { IncidentDetailsModal } from './incidents/IncidentDetailsModal';
import type { IncidentStatus } from '../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const IncidentPanel = () => {
  const { incidents, selectedIncidentId, selectIncident } = useStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all');

  // Get the selected incident object
  const selectedIncident = useMemo(() => 
    selectedIncidentId ? incidents.find(inc => inc.id === selectedIncidentId) || null : null,
    [selectedIncidentId, incidents]
  );

  // Filter incidents
  const filteredIncidents = useMemo(() => {
    let filtered = [...incidents];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inc =>
        inc.title.toLowerCase().includes(query) ||
        inc.description.toLowerCase().includes(query) ||
        inc.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inc => inc.status === statusFilter);
    }

    // Sort by updated_at (newest first)
    filtered.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return filtered;
  }, [incidents, searchQuery, statusFilter]);

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      all: incidents.length,
      open: incidents.filter(i => i.status === 'open').length,
      investigating: incidents.filter(i => i.status === 'investigating').length,
      resolved: incidents.filter(i => i.status === 'resolved').length,
      false_positive: incidents.filter(i => i.status === 'false_positive').length,
    };
  }, [incidents]);

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'text-critical bg-critical/10 border-critical/30',
      high: 'text-warn bg-warn/10 border-warn/30',
      medium: 'text-info bg-info/10 border-info/30',
      low: 'text-ok bg-ok/10 border-ok/30',
    };
    return colors[severity as keyof typeof colors] || colors.medium;
  };

  const getStatusColor = (status: IncidentStatus) => {
    const colors = {
      open: 'text-critical bg-critical/10 border-critical/30',
      investigating: 'text-warn bg-warn/10 border-warn/30',
      resolved: 'text-ok bg-ok/10 border-ok/30',
      false_positive: 'text-text-dim bg-panel-hover border-border',
    };
    return colors[status];
  };

  const getStatusLabel = (status: IncidentStatus) => {
    const labels = {
      open: 'Open',
      investigating: 'Investigating',
      resolved: 'Resolved',
      false_positive: 'False Positive',
    };
    return labels[status];
  };

  return (
    <>
      <div className="h-full flex flex-col bg-base">
        {/* Header */}
        <div className="p-4 border-b border-border bg-panel">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warn" />
              <h2 className="text-lg font-semibold text-text">Incident Management</h2>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Incident
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-dim" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 bg-panel-hover rounded-lg p-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-panel text-text'
                    : 'text-text-dim hover:text-text'
                }`}
              >
                All ({statusCounts.all})
              </button>
              <button
                onClick={() => setStatusFilter('open')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  statusFilter === 'open'
                    ? 'bg-panel text-text'
                    : 'text-text-dim hover:text-text'
                }`}
              >
                Open ({statusCounts.open})
              </button>
              <button
                onClick={() => setStatusFilter('investigating')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  statusFilter === 'investigating'
                    ? 'bg-panel text-text'
                    : 'text-text-dim hover:text-text'
                }`}
              >
                Investigating ({statusCounts.investigating})
              </button>
              <button
                onClick={() => setStatusFilter('resolved')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  statusFilter === 'resolved'
                    ? 'bg-panel text-text'
                    : 'text-text-dim hover:text-text'
                }`}
              >
                Resolved ({statusCounts.resolved})
              </button>
            </div>
          </div>
        </div>

        {/* Incident List */}
        <div className="flex-1 overflow-y-auto scrollbar p-4">
          {filteredIncidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <AlertTriangle className="w-12 h-12 text-text-dim mb-3" />
              <p className="text-text-dim">
                {incidents.length === 0 ? 'No incidents yet' : 'No incidents match your filters'}
              </p>
              <p className="text-sm text-text-dim mt-1">
                {incidents.length === 0 
                  ? 'Create an incident to track security events' 
                  : 'Try adjusting your search or filters'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => selectIncident(incident.id)}
                  className="panel p-4 cursor-pointer hover:bg-panel-hover transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text font-medium truncate">{incident.title}</h3>
                      <p className="text-sm text-text-dim line-clamp-2 mt-1">
                        {incident.description}
                      </p>
                    </div>
                    <span className={`ml-3 px-2 py-1 text-xs font-medium rounded border flex-shrink-0 ${getSeverityColor(incident.severity)}`}>
                      {incident.severity.toUpperCase()}
                    </span>
                  </div>

                  {/* Status and Meta */}
                  <div className="flex items-center gap-4 mt-3 text-xs">
                    <span className={`px-2 py-1 rounded border font-medium ${getStatusColor(incident.status)}`}>
                      {getStatusLabel(incident.status)}
                    </span>
                    
                    <div className="flex items-center gap-1 text-text-dim">
                      <Clock className="w-3 h-3" />
                      {dayjs(incident.updated_at).fromNow()}
                    </div>

                    {incident.event_ids.length > 0 && (
                      <div className="flex items-center gap-1 text-text-dim">
                        <AlertTriangle className="w-3 h-3" />
                        {incident.event_ids.length} event{incident.event_ids.length !== 1 ? 's' : ''}
                      </div>
                    )}

                    {incident.notes.length > 0 && (
                      <div className="flex items-center gap-1 text-text-dim">
                        <MessageSquare className="w-3 h-3" />
                        {incident.notes.length} note{incident.notes.length !== 1 ? 's' : ''}
                      </div>
                    )}

                    {incident.assigned_to && (
                      <div className="flex items-center gap-1 text-text-dim">
                        <User className="w-3 h-3" />
                        {incident.assigned_to}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {incident.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {incident.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 text-xs bg-panel-hover text-text-dim rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateIncidentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <IncidentDetailsModal
        incident={selectedIncident}
        isOpen={!!selectedIncident}
        onClose={() => selectIncident(null)}
      />
    </>
  );
};

export default IncidentPanel;
