'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingInputProps {
  value: number;
  readOnly: boolean;
  onSelect?: (rating: number) => void;
  className?: string;
}

/**
 * Componente interactivo para calificar con estrellas.
 * Soporta estados de hover y modo solo lectura.
 */
export function StarRatingInput({ value, readOnly, onSelect, className }: StarRatingInputProps) {
  const [hoveredRating, setHoveredRating] = useState(0);

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={cn(
            "transition-transform focus:outline-none",
            !readOnly && "hover:scale-125 cursor-pointer",
            readOnly && "cursor-default"
          )}
          onMouseEnter={() => !readOnly && setHoveredRating(star)}
          onMouseLeave={() => !readOnly && setHoveredRating(0)}
          onClick={() => !readOnly && onSelect?.(star)}
          aria-label={`Calificar con ${star} estrellas`}
        >
          <Star
            className={cn(
              "h-7 w-7 transition-colors",
              (hoveredRating || value) >= star
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-200"
            )}
          />
        </button>
      ))}
    </div>
  );
}
