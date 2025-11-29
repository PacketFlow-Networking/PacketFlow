import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Brain, Eye, Settings } from 'lucide-react';
import { useStore } from '../context/store';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OnboardingModal = ({ isOpen, onClose }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const completeOnboarding = useStore(state => state.completeOnboarding);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'AINetUI Learns Your Workflow',
      icon: <Brain className="w-16 h-16 text-info" />,
      description: 'As you interact with the interface, AINetUI observes your navigation patterns, preferred views, and analysis style.',
      details: [
        'Tracks which views you use most (Events, Topology, Statistics)',
        'Monitors how you explore network data (big-picture vs. detailed)',
        'Learns your investigation preferences over time',
      ]
    },
    {
      title: 'It Adapts Your View Automatically',
      icon: <Eye className="w-16 h-16 text-info" />,
      description: 'Based on your behavior, AINetUI intelligently adjusts your default view to match your cognitive style.',
      details: [
        'Big-picture thinkers get Topology view by default',
        'Detail-oriented analysts get Events list by default',
        'Adapts proactive suggestions to your expertise level',
      ]
    },
    {
      title: 'You Can Override Preferences Anytime',
      icon: <Settings className="w-16 h-16 text-info" />,
      description: 'Don\'t like the adaptive behavior? You have full control to set your preferences manually.',
      details: [
        'Change default view in User Profile settings',
        'Toggle between Auto and manual modes',
        'Reset learning data if needed',
      ]
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    completeOnboarding();
    onClose();
  };

  const handleSkip = () => {
    completeOnboarding();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-panel rounded-xl shadow-2xl border border-border animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-text">Welcome to AINetUI</h2>
            <p className="text-sm text-text-dim mt-1">Intelligent Adaptive Interface</p>
          </div>
          <button
            onClick={handleSkip}
            className="p-2 text-text-dim hover:text-text hover:bg-panel-hover rounded-lg transition-colors"
            aria-label="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-info'
                    : index < currentStep
                    ? 'w-2 bg-info/50'
                    : 'w-2 bg-border'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            {currentStepData.icon}
          </div>

          {/* Title */}
          <h3 className="text-2xl font-bold text-text text-center mb-4">
            {currentStepData.title}
          </h3>

          {/* Description */}
          <p className="text-text-dim text-center mb-6 max-w-xl mx-auto">
            {currentStepData.description}
          </p>

          {/* Details */}
          <div className="bg-base rounded-lg p-6 border border-border max-w-xl mx-auto">
            <ul className="space-y-3">
              {currentStepData.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-ok flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text">{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-panel-hover">
          <button
            onClick={handleSkip}
            className="text-sm text-text-dim hover:text-text transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text hover:bg-panel rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-info hover:bg-info/90 text-white rounded-lg transition-colors"
            >
              {currentStep < steps.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Get Started
                  <Check className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
