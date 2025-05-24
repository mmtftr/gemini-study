
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ShortcutGuideProps {
  onClose: () => void;
}

export const ShortcutGuide: React.FC<ShortcutGuideProps> = ({ onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const shortcuts = [
    { keys: ['1', '2', '3', '4'], description: 'Select answer option (during question)' },
    { keys: ['H'], description: 'Toggle hint (during question)' },
    { keys: ['D'], description: 'Discuss question with AI (during question or after answer)' },
    { keys: ['→ (Right Arrow)'], description: 'Next question / Show results (after answering)' },
    { keys: ['1', '2', '3', '4'], description: 'Next question / Show results (alternative, after answering)' },
    { keys: ['Esc'], description: 'Close this guide / Any open modal' },
  ];

  return (
    <div 
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose} 
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-guide-title"
    >
      <div 
        className="bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-md relative border border-slate-700 animate-fadeInUp"
        onClick={(e) => e.stopPropagation()} 
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-full transition-colors"
          aria-label="Close shortcut guide"
        >
          <X size={24} />
        </button>
        <h2 id="shortcut-guide-title" className="text-2xl font-semibold text-sky-300 mb-6 text-center">Keyboard Shortcuts</h2>
        <ul className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <li key={index} className="flex justify-between items-center text-sm">
              <span className="text-slate-300">{shortcut.description}</span>
              <div className="flex space-x-1">
                {shortcut.keys.map(key => (
                  <kbd key={key} className="px-2 py-1 bg-slate-700 border border-slate-600 rounded-md text-purple-300 font-mono text-xs">
                    {key}
                  </kbd>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};