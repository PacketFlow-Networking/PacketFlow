import { useState } from 'react';
import { X, Clock, User, MessageSquare, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { useStore } from '../../context/store';
import { useToast } from '../../context/ToastContext';
import type { Incident, IncidentStatus, IncidentNote } from '../../types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface IncidentDetailsModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
}

export const IncidentDetailsModal = ({ incident, isOpen, onClose }: IncidentDetailsModalProps) => {
  const { updateIncident, deleteIncident, addIncidentNote, updateIncidentStatus, events } = useStore();
  const { showSuccess, showWarning } = useToast();

  const [newNote, setNewNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  if (!isOpen || !incident) return null;

  const handleStatusChange = (newStatus: IncidentStatus) => {
    updateIncidentStatus(incident.id, newStatus);
    showSuccess('Status updated', `Incident marked as ${newStatus}`);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    const note: IncidentNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      author: 'Current User', // In real app, get from auth
      content: newNote.trim(),
    };

    addIncidentNote(incident.id, note);
    setNewNote('');
    showSuccess('Note added', 'Note has been added to the incident');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this incident?')) {
      deleteIncident(incident.id);
      showWarning('Incident deleted', `"${incident.title}" has been deleted`);
      onClose();
    }
  };

  const handleSaveEdit = () => {
    updateIncident(incident.id, {
      title: editTitle,
      description: editDescription,
    });
    setIsEditing(false);
    showSuccess('Incident updated', 'Changes have been saved');
  };

  const startEditing = () => {
    setEditTitle(incident.title);
    setEditDescription(incident.description);
    setIsEditing(true);
  };

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
      open: 'bg-critical text-white',
      investigating: 'bg-warn text-base',
      resolved: 'bg-ok text-white',
      false_positive: 'bg-text-dim text-base',
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

  // Get linked events
  const linkedEvents = events.filter(e => incident.event_ids.includes(e.id));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in">
        <div className="panel shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-sm font-medium rounded border ${getSeverityColor(incident.severity)}`}>
                {incident.severity.toUpperCase()}
              </span>
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="input w-96"
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-text">{incident.title}</h2>
                )}
                <p className="text-sm text-text-dim mt-1">
                  Created {dayjs(incident.created_at).fromNow()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <button
                  onClick={handleSaveEdit}
                  className="p-2 rounded-lg hover:bg-panel-hover transition-colors text-ok"
                  title="Save changes"
                >
                  <Check className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={startEditing}
                  className="p-2 rounded-lg hover:bg-panel-hover transition-colors"
                  title="Edit incident"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg hover:bg-panel-hover transition-colors text-critical"
                title="Delete incident"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-panel-hover transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar p-6 space-y-6">
            {/* Description */}
            <section>
              <h3 className="text-sm font-semibold text-text mb-2">Description</h3>
              {isEditing ? (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="input w-full min-h-[100px]"
                  rows={4}
                />
              ) : (
                <p className="text-text-dim bg-panel-hover p-4 rounded-lg border border-border">
                  {incident.description || 'No description provided'}
                </p>
              )}
            </section>

            {/* Status Management */}
            <section>
              <h3 className="text-sm font-semibold text-text mb-2">Status</h3>
              <div className="flex gap-2">
                {(['open', 'investigating', 'resolved', 'false_positive'] as IncidentStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                      incident.status === status
                        ? getStatusColor(status)
                        : 'bg-panel-hover text-text-dim hover:text-text'
                    }`}
                  >
                    {getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </section>

            {/* Metadata */}
            <section className="grid grid-cols-2 gap-4">
              <div className="panel p-4">
                <p className="text-xs text-text-dim mb-1">Created</p>
                <p className="text-text text-sm">{dayjs(incident.created_at).format('MMM D, YYYY h:mm A')}</p>
              </div>
              <div className="panel p-4">
                <p className="text-xs text-text-dim mb-1">Last Updated</p>
                <p className="text-text text-sm">{dayjs(incident.updated_at).format('MMM D, YYYY h:mm A')}</p>
              </div>
              {incident.resolved_at && (
                <div className="panel p-4">
                  <p className="text-xs text-text-dim mb-1">Resolved</p>
                  <p className="text-text text-sm">{dayjs(incident.resolved_at).format('MMM D, YYYY h:mm A')}</p>
                </div>
              )}
              {incident.assigned_to && (
                <div className="panel p-4">
                  <p className="text-xs text-text-dim mb-1">Assigned To</p>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-info" />
                    <p className="text-text text-sm">{incident.assigned_to}</p>
                  </div>
                </div>
              )}
            </section>

            {/* Linked Events */}
            {linkedEvents.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-text mb-2">
                  Linked Events ({linkedEvents.length})
                </h3>
                <div className="space-y-2">
                  {linkedEvents.map((event) => (
                    <div key={event.id} className="panel p-3 text-sm">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-text font-medium">{event.summary}</p>
                          <p className="text-text-dim text-xs mt-1">
                            {event.src}  {event.dst} ({event.proto})
                          </p>
                        </div>
                        <span className="text-xs text-text-dim">
                          {dayjs(event.timestamp).fromNow()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tags */}
            {incident.tags.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-text mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {incident.tags.map((tag, idx) => (
                    <span key={idx} className="badge badge-info text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Notes */}
            <section>
              <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Notes ({incident.notes.length})
              </h3>

              {/* Add Note */}
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder="Add a note..."
                  className="input flex-1"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!newNote.trim()}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {incident.notes.length === 0 ? (
                  <p className="text-text-dim text-sm text-center py-4">
                    No notes yet. Add one above to start tracking progress.
                  </p>
                ) : (
                  incident.notes.map((note) => (
                    <div key={note.id} className="panel p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-info" />
                          <span className="text-sm font-medium text-text">{note.author}</span>
                        </div>
                        <span className="text-xs text-text-dim">
                          {dayjs(note.timestamp).fromNow()}
                        </span>
                      </div>
                      <p className="text-sm text-text-dim">{note.content}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button onClick={onClose} className="btn btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
