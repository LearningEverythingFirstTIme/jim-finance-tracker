'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  existingTags: string[];
  placeholder?: string;
  disabled?: boolean;
};

export function TagInput({
  value,
  onChange,
  existingTags,
  placeholder = 'Add tags...',
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredTags = useMemo(() => {
    const query = inputValue.toLowerCase().trim();
    if (!query) return existingTags.filter((t) => !value.includes(t)).slice(0, 8);
    return existingTags
      .filter((t) => t.toLowerCase().includes(query) && !value.includes(t))
      .slice(0, 8);
  }, [existingTags, inputValue, value]);

  const canCreate = inputValue.trim() && !existingTags.includes(inputValue.trim()) && !value.includes(inputValue.trim());

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const MAX_TAG_LENGTH = 30;

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase().slice(0, MAX_TAG_LENGTH);
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          'flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-card min-h-10',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              disabled={disabled}
              className="ml-0.5 hover:bg-muted rounded-sm p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          maxLength={MAX_TAG_LENGTH}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && inputValue.trim()) {
              e.preventDefault();
              addTag(inputValue);
            } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
              removeTag(value[value.length - 1]);
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : undefined}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
        />
      </div>

      {isOpen && !disabled && (filteredTags.length > 0 || canCreate) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {filteredTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
              onClick={() => addTag(tag)}
            >
              <Tag className="h-3 w-3 text-muted-foreground" />
              {tag}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 border-t border-border"
              onClick={() => addTag(inputValue)}
            >
              <Plus className="h-3 w-3 text-muted-foreground" />
              Create &quot;{inputValue.trim()}&quot;
            </button>
          )}
        </div>
      )}
    </div>
  );
}
