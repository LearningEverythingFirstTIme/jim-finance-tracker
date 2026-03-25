'use client';

import { useState, useRef, useEffect } from 'react';
import { Tag, ChevronDown, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TagFilterProps = {
  allTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
};

export function TagFilter({ allTags, selectedTags, onChange }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  if (allTags.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'gap-1.5 h-9',
          selectedTags.length > 0 && 'border-primary/50 bg-primary/5'
        )}
      >
        <Tag className="h-4 w-4" />
        {selectedTags.length > 0 ? (
          <>
            {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''}
          </>
        ) : (
          'Tags'
        )}
        <ChevronDown className={cn('h-4 w-4 ml-1 transition-transform', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {selectedTags.length} selected
            </span>
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-primary hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {allTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className={cn(
                    'w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2',
                    isSelected && 'bg-muted/50'
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center',
                      isSelected ? 'bg-primary border-primary' : 'border-border'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function TagPills({
  tags,
  maxVisible = 3,
  className,
}: {
  tags: string[];
  maxVisible?: number;
  className?: string;
}) {
  if (!tags || tags.length === 0) return null;

  const visible = tags.slice(0, maxVisible);
  const remaining = tags.length - maxVisible;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visible.map((tag) => (
        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
          {tag}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}
