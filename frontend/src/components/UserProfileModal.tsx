import { useState } from 'react';
import { X, User, Settings, Brain, TrendingUp, Eye, Target, RotateCcw } from 'lucide-react';
import { useStore } from '../context/store';
import { useToast } from '../context/ToastContext';
import type { PreferredView, ExpertiseLevel } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserProfileModal = ({ isOpen, onClose }: UserProfileModalProps) => {
  const { 
    userProfile, 
    updateUserProfile, 
    setPreferredDefaultView,
  } = useStore();
  const { showSuccess } = useToast();
  
  const [localPreferredView, setLocalPreferredView] = useState<PreferredView>(
    userProfile.preferred_default_view
  );
  const [localExpertiseLevel, setLocalExpertiseLevel] = useState<ExpertiseLevel>(
    userProfile.expertise_level
  );

  if (!isOpen) return null;

  const handleSave = () => {
    setPreferredDefaultView(localPreferredView);
    updateUserProfile({ expertise_level: localExpertiseLevel });
    showSuccess('Profile Updated', 'Your preferences have been saved');
    onClose();
  };

  const handleReset = () => {
    if (confirm('Reset all learning data? This will clear your cognitive style and interaction history.')) {
      updateUserProfile({
        cognitive_style: 'unknown',
        interaction_count: 0,
        interaction_history: {
          view_switches: [],
          event_clicks: 0,
          detail_expansions: 0,
          filter_applications: 0,
          topology_views: 0,
          list_views: 0,
          avg_click_depth: 0,
          session_start: new Date().toISOString(),
        },
      });
      showSuccess('Profile Reset', 'Learning data has been cleared');
    }
  };

  // H6-02: Calculate cognitive style metrics
  const topologyRatio = userProfile.interaction_history.view_switches.length > 0
    ? (userProfile.interaction_history.topology_views / 
       (userProfile.interaction_history.topology_views + userProfile.interaction_history.list_views)) * 100
    : 0;
  
  const detailRatio = userProfile.interaction_history.event_clicks > 0
    ? (userProfile.interaction_history.detail_expansions / userProfile.interaction_history.event_clicks) * 100
    : 0;

  const getCognitiveStyleColor = (style: string) => {
    if (style === 'wholist') return 'text-info bg-info/10 border-info/30';
    if (style === 'analyst') return 'text-ok bg-ok/10 border-ok/30';
    return 'text-text-dim bg-panel-hover border-border';
  };

  const getCognitiveStyleIcon = (style: string) => {
    if (style === 'wholist') return <Eye className="w-5 h-5" />;
    if (style === 'analyst') return <Target className="w-5 h-5" />;
    return <Brain className="w-5 h-5" />;
  };

  const getCognitiveStyleDescription = (style: string) => {
    if (style === 'wholist') {
      return 'You prefer big-picture views and spatial visualizations. The system prioritizes topology and overview displays for you.';
    }
    if (style === 'analyst') {
      return 'You prefer detailed lists and drill-down analysis. The system prioritizes event streams and detailed data for you.';
    }
    return 'The system is still learning your preferences. Keep using AINetUI to improve personalization.';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scale-in">
        <div className="panel shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-info/20 rounded-full">
                <User className="w-6 h-6 text-info" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text">User Profile</h2>
                <p className="text-sm text-text-dim mt-1">Manage your preferences and view learning insights</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-panel-hover transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar p-6 space-y-6">
            {/* H3-01: Preferred Default View Setting */}
            <section className="panel p-5">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-5 h-5 text-info" />
                <h3 className="text-lg font-semibold text-text">Display Preferences</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text mb-2 block">
                    Preferred Default View
                  </label>
                  <p className="text-xs text-text-dim mb-3">
                    Choose how AINetUI opens by default, or let it adapt automatically based on your cognitive style.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setLocalPreferredView('auto')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        localPreferredView === 'auto'
                          ? 'border-info bg-info/10 text-info'
                          : 'border-border hover:border-info/50 text-text-dim'
                      }`}
                    >
                      <Brain className="w-6 h-6 mx-auto mb-2" />
                      <p className="font-semibold text-sm">Auto</p>
                      <p className="text-xs mt-1 opacity-80">Adapts to your style</p>
                    </button>
                    <button
                      onClick={() => setLocalPreferredView('events')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        localPreferredView === 'events'
                          ? 'border-info bg-info/10 text-info'
                          : 'border-border hover:border-info/50 text-text-dim'
                      }`}
                    >
                      <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                      <p className="font-semibold text-sm">Events</p>
                      <p className="text-xs mt-1 opacity-80">Detailed list view</p>
                    </button>
                    <button
                      onClick={() => setLocalPreferredView('topology')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        localPreferredView === 'topology'
                          ? 'border-info bg-info/10 text-info'
                          : 'border-border hover:border-info/50 text-text-dim'
                      }`}
                    >
                      <Eye className="w-6 h-6 mx-auto mb-2" />
                      <p className="font-semibold text-sm">Topology</p>
                      <p className="text-xs mt-1 opacity-80">Network visualization</p>
                    </button>
                    <button
                      onClick={() => setLocalPreferredView('stats')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        localPreferredView === 'stats'
                          ? 'border-info bg-info/10 text-info'
                          : 'border-border hover:border-info/50 text-text-dim'
                      }`}
                    >
                      <Target className="w-6 h-6 mx-auto mb-2" />
                      <p className="font-semibold text-sm">Statistics</p>
                      <p className="text-xs mt-1 opacity-80">Metrics dashboard</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-text mb-2 block">
                    Expertise Level
                  </label>
                  <div className="flex gap-2">
                    {(['novice', 'intermediate', 'expert'] as ExpertiseLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setLocalExpertiseLevel(level)}
                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          localExpertiseLevel === level
                            ? 'bg-info text-white'
                            : 'bg-panel-hover text-text-dim hover:text-text'
                        }`}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* H6-02: Cognitive Style Inference Summary */}
            <section className="panel p-5">
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-5 h-5 text-info" />
                <h3 className="text-lg font-semibold text-text">Cognitive Style Insights</h3>
              </div>

              <div className={`p-4 rounded-lg border mb-4 ${getCognitiveStyleColor(userProfile.cognitive_style)}`}>
                <div className="flex items-center gap-3 mb-2">
                  {getCognitiveStyleIcon(userProfile.cognitive_style)}
                  <div>
                    <p className="font-semibold">
                      {userProfile.cognitive_style === 'wholist' && 'Wholist (Big-Picture Thinker)'}
                      {userProfile.cognitive_style === 'analyst' && 'Analyst (Detail-Oriented)'}
                      {userProfile.cognitive_style === 'unknown' && 'Learning Your Style...'}
                    </p>
                    <p className="text-sm opacity-90 mt-1">
                      {getCognitiveStyleDescription(userProfile.cognitive_style)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Workflow Pattern Metrics */}
              {userProfile.interaction_count >= 10 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-text mb-3">Your Workflow Pattern:</p>
                  
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-dim">Topology Views</span>
                        <span className="text-text font-medium">{topologyRatio.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-panel-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-info transition-all"
                          style={{ width: `${topologyRatio}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-dim">Detail Exploration</span>
                        <span className="text-text font-medium">{detailRatio.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-panel-hover rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ok transition-all"
                          style={{ width: `${detailRatio}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-base rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-info">{userProfile.interaction_count}</p>
                      <p className="text-xs text-text-dim mt-1">Interactions</p>
                    </div>
                    <div className="bg-base rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-ok">{userProfile.interaction_history.event_clicks}</p>
                      <p className="text-xs text-text-dim mt-1">Event Clicks</p>
                    </div>
                    <div className="bg-base rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-warn">{userProfile.interaction_history.filter_applications}</p>
                      <p className="text-xs text-text-dim mt-1">Filters Used</p>
                    </div>
                  </div>
                </div>
              )}

              {userProfile.interaction_count < 10 && (
                <p className="text-sm text-text-dim text-center py-4">
                  Keep using AINetUI to generate insights about your workflow preferences.
                  <br />
                  <span className="text-xs">({10 - userProfile.interaction_count} more interactions needed)</span>
                </p>
              )}
            </section>

            {/* Alert Accuracy */}
            {userProfile.alert_history.true_positives + userProfile.alert_history.false_positives > 0 && (
              <section className="panel p-5">
                <h3 className="text-lg font-semibold text-text mb-4">Alert Feedback Accuracy</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-ok">{userProfile.alert_history.accuracy_rate.toFixed(1)}%</p>
                    <p className="text-sm text-text-dim mt-1">Detection Accuracy</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <p className="text-ok font-medium">{userProfile.alert_history.true_positives}</p>
                      <p className="text-text-dim">True Positives</p>
                    </div>
                    <div>
                      <p className="text-critical font-medium">{userProfile.alert_history.false_positives}</p>
                      <p className="text-text-dim">False Positives</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Reset Learning Data */}
            <section className="panel p-5 border-2 border-warn/30">
              <div className="flex items-start gap-3">
                <RotateCcw className="w-5 h-5 text-warn flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text mb-2">Reset Learning Data</h3>
                  <p className="text-sm text-text-dim mb-4">
                    Clear your interaction history and cognitive style inference. 
                    The system will start learning your preferences from scratch.
                  </p>
                  <button
                    onClick={handleReset}
                    className="btn btn-secondary text-warn border-warn hover:bg-warn/10"
                  >
                    Reset All Data
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserProfileModal;
