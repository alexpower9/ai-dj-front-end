import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { ArrowRightIcon, Loader2 } from 'lucide-react';

interface PromptBoxProps {
  onSubmit: (prompt: string) => void;
  loading?: boolean;
  disabled?: boolean;
  /** Optional extra button/content rendered next to the submit arrow (absolute-positioned; does not affect layout) */
  rightAccessory?: React.ReactNode;
}

export default function PromptBox({ onSubmit, loading = false, disabled = false, rightAccessory }: PromptBoxProps) {
  const [prompt, setPrompt] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !loading && !disabled) {
      onSubmit(prompt);
      setPrompt('');
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-end bg-dark-surface border border-primary-600/30 rounded-xl focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all shadow-neon-purple">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Connecting..." : "e.g. Play 'Levels' By Avicii!"}
          rows={1}
          disabled={loading || disabled}
          className="flex-1 pl-5 pr-24 py-4 bg-transparent text-white placeholder-gray-500 resize-none focus:outline-none rounded-xl min-h-[60px] max-h-[200px] overflow-y-auto text-base disabled:opacity-50"
          style={{
            height: 'auto',
            minHeight: '60px'
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = target.scrollHeight + 'px';
          }}
        />
        {rightAccessory ? (
          <div className="absolute right-14 bottom-3">
            {rightAccessory}
          </div>
        ) : null}
        <Button 
          type="submit" 
          size="icon" 
          className="absolute right-3 bottom-3 bg-gradient-purple-blue hover:shadow-neon-purple transition-all disabled:opacity-50"
          disabled={!prompt.trim() || loading || disabled}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowRightIcon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  );
}