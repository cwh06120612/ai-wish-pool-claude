"use client";

import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}

export function StarRating({ value, onChange, size = 18, readOnly = false }: StarRatingProps) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={readOnly ? "cursor-default" : "cursor-pointer transition-transform hover:scale-110"}
          aria-label={`${n} 顆星`}
        >
          <Star
            size={size}
            className={n <= active ? "text-[#FFAE00]" : "text-[#E0E0E0]"}
            fill={n <= active ? "#FFAE00" : "none"}
          />
        </button>
      ))}
    </div>
  );
}
