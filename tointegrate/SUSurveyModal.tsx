import React, { useState } from 'react';
import { X, ClipboardCheck } from 'lucide-react';
import { useStore } from '../context/store';
import { SUSResponse } from '../types';

interface SUSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUS_QUESTIONS = [
  { id: 1, text: "I think that I would like to use this system frequently.", positive: true },
  { id: 2, text: "I found the system unnecessarily complex.", positive: false },
  { id: 3, text: "I thought the system was easy to use.", positive: true },
  { id: 4, text: "I think that I would need the support of a technical person to be able to use this system.", positive: false },
  { id: 5, text: "I found the various functions in this system were well integrated.", positive: true },
  { id: 6, text: "I thought there was too much inconsistency in this system.", positive: false },
  { id: 7, text: "I would imagine that most people would learn to use this system very quickly.", positive: true },
  { id: 8, text: "I found the system very cumbersome to use.", positive: false },
  { id: 9, text: "I felt very confident using the system.", positive: true },
  { id: 10, text: "I needed to learn a lot of things before I could get going with this system.", positive: false },
];

const SUSurveyModal: React.FC<SUSurveyModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, updateUserProfile } = useStore();
  
  const [responses, setResponses] = useState<{ [key: number]: number }>({});
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleResponseChange = (questionId: number, value: number) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateSUSScore = (): number => {
    // SUS scoring: odd items contribute (rating - 1), even items contribute (5 - rating)
    let score = 0;
    
    for (let i = 1; i <= 10; i++) {
      const response = responses[i] || 3; // Default to neutral if not answered
      
      if (i % 2 === 1) {
        // Odd questions (positive): subtract 1
        score += (response - 1);
      } else {
        // Even questions (negative): subtract from 5
        score += (5 - response);
      }
    }
    
    // Multiply by 2.5 to get score out of 100
    return score * 2.5;
  };

  const handleSubmit = () => {
    const susScore = calculateSUSScore();
    
    const susResponse: SUSResponse = {
      q1: responses[1] || 3,
      q2: responses[2] || 3,
      q3: responses[3] || 3,
      q4: responses[4] || 3,
      q5: responses[5] || 3,
      q6: responses[6] || 3,
      q7: responses[7] || 3,
      q8: responses[8] || 3,
      q9: responses[9] || 3,
      q10: responses[10] || 3,
      score: susScore,
      timestamp: new Date().toISOString(),
    };

    // Save to user profile
    const updatedMetrics: import('../types').UsabilityMetrics = {
      task_timings: userProfile.usability_metrics?.task_timings || [],
      error_log: userProfile.usability_metrics?.error_log || [],
      confusion_points: userProfile.usability_metrics?.confusion_points || [],
      sus_surveys: [
        ...(userProfile.usability_metrics?.sus_surveys || []),
        susResponse
      ],
    };

    updateUserProfile({
      usability_metrics: updatedMetrics,
    });

    setSubmitted(true);
  };

  const allQuestionsAnswered = Object.keys(responses).length === 10;
  const susScore = submitted ? calculateSUSScore() : null;

  // SUS score interpretation
  const getScoreInterpretation = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: "Excellent", color: "text-green-400" };
    if (score >= 68) return { label: "Good (Above Average)", color: "text-blue-400" };
    if (score >= 50) return { label: "Fair", color: "text-yellow-400" };
    return { label: "Needs Improvement", color: "text-red-400" };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--color-panel)] rounded-lg shadow-2xl border border-[var(--color-border)]">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-panel)] border-b border-[var(--color-border)] px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">System Usability Scale (SUS)</h2>
              <p className="text-sm text-gray-400">Help us improve AINetUI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-base)] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!submitted ? (
            <>
              {/* Instructions */}
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-gray-300">
                  <strong>Instructions:</strong> For each statement below, select your level of agreement
                  from <strong>Strongly Disagree (1)</strong> to <strong>Strongly Agree (5)</strong>.
                  There are no right or wrong answers—we want your honest feedback.
                </p>
              </div>

              {/* Questions */}
              <div className="space-y-6">
                {SUS_QUESTIONS.map((question) => (
                  <div key={question.id} className="space-y-2">
                    <p className="text-white font-medium">
                      {question.id}. {question.text}
                    </p>
                    
                    <div className="flex items-center justify-between gap-2">
                      {/* Scale labels */}
                      <span className="text-xs text-gray-400 w-24">Strongly Disagree</span>
                      
                      {/* Radio buttons */}
                      <div className="flex gap-4">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <label
                            key={value}
                            className="flex flex-col items-center gap-1 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`q${question.id}`}
                              value={value}
                              checked={responses[question.id] === value}
                              onChange={() => handleResponseChange(question.id, value)}
                              className="w-5 h-5 cursor-pointer accent-blue-500"
                            />
                            <span className="text-xs text-gray-400">{value}</span>
                          </label>
                        ))}
                      </div>
                      
                      <span className="text-xs text-gray-400 w-24 text-right">Strongly Agree</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress indicator */}
              <div className="mt-6 p-4 bg-[var(--color-base)] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Progress</span>
                  <span className="text-sm text-white font-medium">
                    {Object.keys(responses).length} / 10 questions answered
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(Object.keys(responses).length / 10) * 100}%` }}
                  />
                </div>
              </div>

              {/* Submit button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={!allQuestionsAnswered}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    allQuestionsAnswered
                      ? 'bg-blue-500 hover:bg-blue-600 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Submit Survey
                </button>
              </div>
            </>
          ) : (
            // Results screen
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <ClipboardCheck className="w-8 h-8 text-green-400" />
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-2">Thank You!</h3>
              <p className="text-gray-400 mb-6">Your feedback has been recorded.</p>

              {susScore !== null && (
                <div className="max-w-md mx-auto space-y-4">
                  {/* SUS Score */}
                  <div className="p-6 bg-[var(--color-base)] rounded-lg border border-[var(--color-border)]">
                    <p className="text-sm text-gray-400 mb-2">Your SUS Score</p>
                    <p className={`text-5xl font-bold ${getScoreInterpretation(susScore).color} mb-2`}>
                      {susScore.toFixed(1)}
                    </p>
                    <p className="text-lg text-gray-300">
                      {getScoreInterpretation(susScore).label}
                    </p>
                  </div>

                  {/* Context */}
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-left">
                    <p className="text-sm text-gray-300">
                      <strong>Context:</strong> The average SUS score is 68. Scores above 80 indicate
                      excellent usability. Your feedback helps us identify areas for improvement.
                    </p>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={onClose}
                    className="w-full px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SUSurveyModal;
