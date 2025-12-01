import { useState } from 'react';
import { useStore } from '../../context/store';
import { Plus, Edit2, Trash2, Power, Info } from 'lucide-react';
import type { AlertRule, AlertCondition, AlertAction, IncidentSeverity } from '../../types';

const RulesPanel = () => {
  const { rules } = useStore(state => state.alertConfig);
  const addAlertRule = useStore(state => state.addAlertRule);
  const updateAlertRule = useStore(state => state.updateAlertRule);
  const deleteAlertRule = useStore(state => state.deleteAlertRule);
  const toggleAlertRule = useStore(state => state.toggleAlertRule);

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    field: 'anomaly_score' as AlertRule['field'],
    condition: 'greater_than' as AlertCondition,
    value: '',
    actions: ['notify'] as AlertAction[],
    severity: 'medium' as IncidentSeverity,
    description: ''
  });

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.value.trim()) {
      alert('Please fill in name and value fields');
      return;
    }

    const rule: AlertRule = {
      id: editingRule?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      enabled: editingRule?.enabled ?? true,
      field: formData.field,
      condition: formData.condition,
      value: formData.field === 'proto' || formData.field === 'src' || formData.field === 'dst' 
        ? formData.value 
        : parseFloat(formData.value),
      actions: formData.actions,
      severity: formData.severity,
      description: formData.description.trim() || undefined,
      created_at: editingRule?.created_at || new Date().toISOString()
    };

    if (editingRule) {
      updateAlertRule(editingRule.id, rule);
    } else {
      addAlertRule(rule);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      field: 'anomaly_score',
      condition: 'greater_than',
      value: '',
      actions: ['notify'],
      severity: 'medium',
      description: ''
    });
    setEditingRule(null);
    setShowForm(false);
  };

  const handleEdit = (rule: AlertRule) => {
    setFormData({
      name: rule.name,
      field: rule.field,
      condition: rule.condition,
      value: rule.value.toString(),
      actions: rule.actions,
      severity: rule.severity,
      description: rule.description || ''
    });
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      deleteAlertRule(id);
    }
  };

  const toggleAction = (action: AlertAction) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.includes(action)
        ? prev.actions.filter(a => a !== action)
        : [...prev.actions, action]
    }));
  };

  const getConditionLabel = (condition: AlertCondition) => {
    switch (condition) {
      case 'greater_than': return '>';
      case 'less_than': return '<';
      case 'equals': return '=';
      case 'contains': return 'contains';
    }
  };

  const getSeverityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-blue-400 mb-1">Custom Alert Rules</p>
          <p>
            Create custom rules to trigger alerts based on specific conditions. Rules are evaluated
            in addition to the global sensitivity and threshold settings.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-gray-200">Alert Rules ({rules.length})</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'New Rule'}
        </button>
      </div>

      {/* Rule Form */}
      {showForm && (
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-sm font-medium text-white mb-4">
            {editingRule ? 'Edit Rule' : 'Create New Rule'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Rule Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., High Anomaly Score Alert"
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Field</label>
                <select
                  value={formData.field}
                  onChange={(e) => setFormData({ ...formData, field: e.target.value as AlertRule['field'] })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="anomaly_score">Anomaly Score</option>
                  <option value="flows">Flows</option>
                  <option value="proto">Protocol</option>
                  <option value="src">Source IP</option>
                  <option value="dst">Destination IP</option>
                  <option value="src_port">Source Port</option>
                  <option value="dst_port">Dest Port</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Condition</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as AlertCondition })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Value</label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="e.g., 0.9"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-2 block">Actions</label>
              <div className="flex flex-wrap gap-2">
                {(['notify', 'create_incident', 'log', 'sound'] as AlertAction[]).map(action => (
                  <button
                    key={action}
                    onClick={() => toggleAction(action)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      formData.actions.includes(action)
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-gray-900 border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {action.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as IncidentSeverity })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional context about this rule"
                rows={2}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div>
        {rules.length === 0 ? (
          <div className="p-8 text-center text-gray-400 bg-gray-800/50 rounded-lg border border-gray-700">
            <p>No alert rules configured</p>
            <p className="text-sm mt-1">Create rules to trigger alerts on specific conditions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`p-4 rounded-lg border transition-colors ${
                  rule.enabled
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-gray-800/50 border-gray-700/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className={`font-medium ${rule.enabled ? 'text-white' : 'text-gray-500'}`}>
                        {rule.name}
                      </h4>
                      <span className={`px-2 py-0.5 text-xs rounded border ${getSeverityColor(rule.severity)} bg-${rule.severity === 'critical' ? 'red' : rule.severity === 'high' ? 'orange' : rule.severity === 'medium' ? 'yellow' : 'blue'}-500/20 border-${rule.severity === 'critical' ? 'red' : rule.severity === 'high' ? 'orange' : rule.severity === 'medium' ? 'yellow' : 'blue'}-500/30`}>
                        {rule.severity}
                      </span>
                      {!rule.enabled && (
                        <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded border border-gray-600">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className={`text-sm font-mono mb-2 ${rule.enabled ? 'text-gray-300' : 'text-gray-500'}`}>
                      {rule.field} {getConditionLabel(rule.condition)} {rule.value}
                    </div>
                    {rule.description && (
                      <p className={`text-sm mb-2 ${rule.enabled ? 'text-gray-400' : 'text-gray-500'}`}>
                        {rule.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {rule.actions.map(action => (
                        <span
                          key={action}
                          className={`px-2 py-0.5 text-xs rounded border ${
                            rule.enabled
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-gray-700/50 text-gray-500 border-gray-600/50'
                          }`}
                        >
                          {action.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => toggleAlertRule(rule.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.enabled
                          ? 'text-green-400 hover:bg-gray-700'
                          : 'text-gray-500 hover:bg-gray-700'
                      }`}
                      aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(rule)}
                      className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                      aria-label="Edit rule"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      aria-label="Delete rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RulesPanel;
