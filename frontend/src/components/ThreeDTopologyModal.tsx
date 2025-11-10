import { Suspense, lazy, useEffect, useState } from 'react';
import { X, Maximize2 } from 'lucide-react';

// Lazy load the 3D view component to avoid loading Three.js until needed
const ThreeDTopologyContent = lazy(() => import('../pages/ThreeDTopologyView'));

interface ThreeDTopologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThreeDTopologyModal({ isOpen, onClose }: ThreeDTopologyModalProps) {
  const [isFullyMounted, setIsFullyMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Small delay to ensure smooth transition
      setTimeout(() => setIsFullyMounted(true), 50);
    } else {
      document.body.style.overflow = '';
      setIsFullyMounted(false);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard shortcut to close (Escape)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 transition-opacity duration-300 ${
        isFullyMounted ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        // Close if clicking the backdrop (not the content)
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Modal Container - Full screen with small margin */}
      <div
        className={`relative w-[98vw] h-[98vh] bg-base border-2 border-border rounded-lg shadow-2xl overflow-hidden transition-transform duration-300 ${
          isFullyMounted ? 'scale-100' : 'scale-95'
        }`}
      >
        {/* Close Button - Always visible */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[60] p-2 bg-panel/90 backdrop-blur-sm hover:bg-panel-hover border border-border rounded-lg shadow-lg transition-all group"
          aria-label="Close 3D topology view"
          title="Close (Esc)"
        >
          <X className="w-6 h-6 text-text group-hover:text-red-400 transition-colors" />
        </button>

        {/* Full Screen Icon Indicator */}
        <div className="absolute top-4 right-16 z-[60] px-3 py-2 bg-panel/90 backdrop-blur-sm border border-border rounded-lg shadow-lg pointer-events-none">
          <div className="flex items-center gap-2 text-xs text-text-dim">
            <Maximize2 className="w-4 h-4" />
            <span>Full Screen View</span>
          </div>
        </div>

        {/* Loading State */}
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-base">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-info mx-auto mb-4" />
                <p className="text-text text-lg">Loading 3D Network Topology...</p>
                <p className="text-text-dim text-sm mt-2">Initializing WebGL renderer</p>
              </div>
            </div>
          }
        >
          {/* Lazy loaded 3D content - only loads when modal opens */}
          {isFullyMounted && <ThreeDTopologyContent />}
        </Suspense>

        {/* Keyboard hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[60] px-3 py-2 bg-panel/90 backdrop-blur-sm border border-border rounded-lg shadow-lg pointer-events-none">
          <div className="text-xs text-text-dim">
            Press <kbd className="px-2 py-1 bg-base border border-border rounded text-text mx-1">Esc</kbd> or click outside to close
          </div>
        </div>
      </div>
    </div>
  );
}
