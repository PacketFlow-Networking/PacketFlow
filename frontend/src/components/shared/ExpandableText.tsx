import { useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  showExpandButton?: boolean;
  onShowMore?: () => void; // Callback to open modal with full details
}

const ExpandableText = ({ 
  text, 
  maxLength = 200, 
  className = '',
  showExpandButton = true,
  onShowMore 
}: ExpandableTextProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const shouldTruncate = text.length > maxLength;
  const displayText = shouldTruncate 
    ? text.slice(0, maxLength) + '...'
    : text;

  if (!shouldTruncate) {
    return <p className={className}>{text}</p>;
  }

  return (
    <div className="relative">
      {/* Text with hover expansion */}
      <div 
        className="relative transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <p className={`${className} ${!isHovered ? 'line-clamp-3' : ''} transition-all duration-300`}>
          {isHovered ? text : displayText}
        </p>
      </div>

      {/* Show More Button (opens modal if callback provided) */}
      {showExpandButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onShowMore) {
              onShowMore(); // Open modal with full details
            }
          }}
          className="mt-2 flex items-center gap-1.5 text-xs font-medium text-info hover:text-info-bright transition-colors group"
        >
          {onShowMore ? (
            <>
              <ExternalLink className="w-3 h-3 group-hover:scale-110 transition-transform" />
              <span>Show Full Details</span>
              <span className="text-muted">({text.length - maxLength} more chars + related events)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Hover to expand</span>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ExpandableText;
