'use client';

import React, { useState } from 'react';
import type { HighlightColor } from '@/types/highlight';

interface Props {
  show: boolean;
  onSelectColor: (color: HighlightColor, note?: string) => void;
  onCancel: () => void;
}

export default function HighlightMenu({ show, onSelectColor, onCancel }: Props) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [note, setNote] = useState('');

  if (!show) {
    if (isAddingNote) setIsAddingNote(false);
    return null;
  }

  const handleColorClick = (color: HighlightColor) => {
    onSelectColor(color, note.trim() || undefined);
    setIsAddingNote(false);
    setNote('');
  };

  const handleCancel = () => {
    setIsAddingNote(false);
    setNote('');
    onCancel();
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: '50px', // Just above the toolbar
      left: 0,
      right: 0,
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-color)',
      padding: '12px 16px',
      boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
      zIndex: 50,
      animation: 'slideUp 0.2s ease-out'
    }}>
      {isAddingNote ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Type your note here..."
            autoFocus
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              resize: 'none',
              height: '60px',
              fontFamily: 'inherit',
              fontSize: '14px'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button 
              onClick={() => setIsAddingNote(false)}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              onClick={() => setIsAddingNote(false)}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => handleColorClick('yellow')}
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fbbf24', border: 'none', cursor: 'pointer' }}
              aria-label="Yellow"
            />
            <button
              onClick={() => handleColorClick('green')}
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#34d399', border: 'none', cursor: 'pointer' }}
              aria-label="Green"
            />
            <button
              onClick={() => handleColorClick('blue')}
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#60a5fa', border: 'none', cursor: 'pointer' }}
              aria-label="Blue"
            />
            <button
              onClick={() => handleColorClick('pink')}
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#f472b6', border: 'none', cursor: 'pointer' }}
              aria-label="Pink"
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsAddingNote(true)}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
            >
              Add note
            </button>
            <button
              onClick={handleCancel}
              style={{ padding: '6px 12px', borderRadius: '6px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
