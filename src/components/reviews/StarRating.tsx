import React, { useId, useState } from 'react';
import { Star } from 'lucide-react';

const sizes = { sm: 14, md: 18, lg: 24, xl: 32 } as const;

interface StarDisplayProps {
  /** 0–5; fractions are shown as a partly filled star (e.g. an average of 4.6). */
  rating: number;
  size?: keyof typeof sizes;
  /** Accessible text, e.g. "4.6 out of 5 stars". */
  label: string;
  className?: string;
}

/** Read-only stars. The filled layer starts at the inline start, so it reads correctly in both LTR and RTL. */
export const StarDisplay: React.FC<StarDisplayProps> = ({ rating, size = 'md', label, className = '' }) => {
  const pixels = sizes[size];
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <span role="img" aria-label={label} className={`relative inline-flex shrink-0 ${className}`}>
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <Star key={index} size={pixels} className="text-beige-300" strokeWidth={1.5} />)}
      </span>
      <span className="absolute inset-y-0 start-0 flex gap-0.5 overflow-hidden" style={{ width: `${(clamped / 5) * 100}%` }} aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => <Star key={index} size={pixels} className="shrink-0 fill-gold-500 text-gold-500" strokeWidth={1.5} />)}
      </span>
    </span>
  );
};

interface StarRatingInputProps {
  value: number;
  onChange(value: number): void;
  /** The group's visible label. */
  legend: string;
  /** Accessible name for each star, given its number (1–5). */
  starLabel(count: number): string;
  /** Words describing each rating, index 0 = 1 star. */
  descriptions?: readonly string[];
  /** Marks the legend as required; the form checks the value itself so it can show its own message. */
  required?: boolean;
  invalid?: boolean;
}

/** A 1–5 star picker built on native radio buttons: arrow keys, screen readers and form validation work as usual. */
export const StarRatingInput: React.FC<StarRatingInputProps> = ({ value, onChange, legend, starLabel, descriptions, required, invalid }) => {
  const name = useId();
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;
  return (
    <fieldset aria-invalid={invalid || undefined}>
      <legend className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-navy-600">{legend}{required && ' *'}</legend>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((count) => (
            <label key={count} className="cursor-pointer rounded-sm p-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-400" onMouseEnter={() => setHovered(count)}>
              <input
                type="radio"
                name={name}
                value={count}
                checked={value === count}
                onChange={() => onChange(count)}
                className="sr-only"
              />
              <span className="sr-only">{starLabel(count)}</span>
              <Star
                size={32}
                strokeWidth={1.5}
                aria-hidden="true"
                className={`transition-transform duration-150 ${count <= shown ? 'fill-gold-500 text-gold-500' : 'text-beige-300'} ${count === hovered ? 'scale-110' : ''}`}
              />
            </label>
          ))}
        </div>
        {descriptions && shown > 0 && <span className="text-sm font-medium text-gold-700" aria-live="polite">{descriptions[shown - 1]}</span>}
      </div>
    </fieldset>
  );
};
