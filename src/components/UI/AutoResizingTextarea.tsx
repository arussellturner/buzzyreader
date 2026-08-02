'use client';

import React, { useEffect, useRef } from 'react';

interface AutoResizingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

export default function AutoResizingTextarea({ value, onChange, className, style, ...props }: AutoResizingTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    if (ref.current) {
      ref.current.style.height = '0px';
      const computed = window.getComputedStyle(ref.current);
      const borderTop = parseFloat(computed.borderTopWidth) || 0;
      const borderBottom = parseFloat(computed.borderBottomWidth) || 0;
      ref.current.style.height = `${ref.current.scrollHeight + borderTop + borderBottom}px`;
    }
  };

  // Adjust on value change
  useEffect(() => {
    resize();
  }, [value]);

  // Adjust on window resize (e.g., orientation change)
  useEffect(() => {
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={handleInput}
      rows={1}
      className={className}
      style={{
        resize: 'none',
        overflow: 'hidden',
        ...style
      }}
      {...props}
    />
  );
}
