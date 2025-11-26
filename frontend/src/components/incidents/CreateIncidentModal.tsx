import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../context/store';
import { useToast } from '../../context/ToastContext';
import type { IncidentSeverity } from '../../types';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEventIds?: string[];
}

export const CreateIncidentModal = ({ isOpen, onClose, preselectedEventIds = [] }: CreateIncidentModalProps) => {
  const { addIncident, events } = useStore();
  const { showSuccess, showError } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('medium');
  const [tags, setTags] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showError('Validation error', 'Incident title is required');
      return;
    }

    // Validate event IDs exist in the events array
    const validEventIds = preselectedEventIds.filter(id => 
      events.some(e => e.id === id)
    );

    if (preselectedEventIds.length > 0 && validEventIds.length === 0) {
      showError('Invalid events', 'The selected events no longer exist. Please reselect events.');
      return;
    }

    if (preselectedEventIds.length !== validEventIds.length) {
      showError('Warning', `${preselectedEventIds.length - validEventIds.length} selected event(s) no longer exist and will be excluded.`);
    }

    const incident = {
      id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.trim(),
      description: description.trim(),
      status: 'open' as const,
      severity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      event_ids: validEventIds, // Use only valid event IDs
      notes: [],
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      assigned_to: assignedTo.trim() || undefined,
    };

    // addIncident will automatically set selectedIncidentId to the new incident's ID
    addIncident(incident);
    showSuccess('Incident created', `"${title}" has been created successfully`);

    // Reset form
    setTitle('');
    setDescription('');
    setSeverity('medium');
    setTags('');
    setAssignedTo('');
    
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setSeverity('medium');
    setTags('');
    setAssignedTo('');
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl animate-scale-in">
        <form onSubmit={handleSubmit} className="panel shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-text">Create New Incident</h2>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-panel-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Title <span className="text-critical">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the incident"
                className="input w-full"
                required
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed information about the incident..."
                className="input w-full min-h-[100px] resize-y"
                rows={4}
              />
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Severity
              </label>
              <div className="flex gap-2">
                {(['critical', 'high', 'medium', 'low'] as IncidentSeverity[]).map((sev) => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`flex-1 px-4 py-2 rounded text-sm font-medium transition-all ${
                      severity === sev
                        ? sev === 'critical'
                          ? 'bg-critical text-white'
                          : sev === 'high'
                          ? 'bg-warn text-base'
                          : sev === 'medium'
                          ? 'bg-info text-base'
                          : 'bg-ok text-base'
                        : 'bg-panel-hover text-text-dim hover:text-text'
                    }`}
                  >
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="comma, separated, tags"
                className="input w-full"
              />
              <p className="text-xs text-text-dim mt-1">
                Separate tags with commas
              </p>
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Assign To
              </label>
              <input
                type="text"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Analyst name or team"
                className="input w-full"
              />
            </div>

            {preselectedEventIds.length > 0 && (
              <div className="p-3 bg-info/10 border border-info/30 rounded-lg">
                <p className="text-sm text-info">
                  {preselectedEventIds.length} event{preselectedEventIds.length !== 1 ? 's' : ''} will be linked to this incident
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!title.trim()}
            >
              Create Incident
            </button>
          </div>
        </form>
      </div>
    </>
  );
};
