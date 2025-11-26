import { Keyboard } from 'lucide-react';

interface ShortcutHintProps {
  shortcut: string;
  description: string;
}

export const ShortcutHint = ({ shortcut, description }: ShortcutHintProps) => {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 animate-fade-in-down">
      <div className="flex items-center gap-3 px-4 py-2 bg-panel border border-border rounded-lg shadow-lg">
        <Keyboard className="w-4 h-4 text-info" />
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 text-xs font-semibold bg-base border border-border rounded shadow-sm">
            {shortcut}
          </kbd>
          <span className="text-sm text-text">{description}</span>
        </div>
      </div>
    </div>
  );
};
