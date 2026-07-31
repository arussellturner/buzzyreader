'use client';

import React from 'react';
import type { ReaderPreferences, FontFamily, ThemeMode } from '@/types/preferences';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  updatePreferences: (partial: Partial<ReaderPreferences>) => void;
}

export default function ReaderSettingsOverlay({ isOpen, onClose, preferences, updatePreferences }: Props) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: '50px', // Right above the toolbar
      left: 0,
      right: 0,
      background: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      borderTop: '1px solid var(--border-color)',
      padding: '20px',
      boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
      maxHeight: 'calc(100dvh - 50px)',
      overflowY: 'auto',
      zIndex: 100,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Reading Settings</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '24px' }}>
          &times;
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Theme */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Theme</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['light', 'dark', 'sepia'].map(theme => (
              <button 
                key={theme}
                onClick={() => updatePreferences({ theme: theme as ThemeMode })}
                style={{ 
                  flex: 1, 
                  padding: '8px', 
                  borderRadius: '6px',
                  border: `1px solid ${preferences.theme === theme ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: preferences.theme === theme ? 'var(--bg-elevated)' : 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Font</label>
          <select 
            value={preferences.fontFamily} 
            onChange={e => updatePreferences({ fontFamily: e.target.value as FontFamily })}
            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          >
            <option value="literata">Literata (Serif)</option>
            <option value="georgia">Georgia (Serif)</option>
            <option value="inter">Inter (Sans)</option>
            <option value="system">System Default</option>
            <option value="opendyslexic">OpenDyslexic</option>
          </select>
        </div>

        {/* Text Align */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Alignment</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => updatePreferences({ textAlign: 'left' })}
              style={{ 
                flex: 1, padding: '8px', borderRadius: '6px',
                border: `1px solid ${preferences.textAlign === 'left' || !preferences.textAlign ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: preferences.textAlign === 'left' || !preferences.textAlign ? 'var(--bg-elevated)' : 'transparent',
                color: 'var(--text-primary)', cursor: 'pointer'
              }}
            >
              Left Align
            </button>
            <button 
              onClick={() => updatePreferences({ textAlign: 'justify' })}
              style={{ 
                flex: 1, padding: '8px', borderRadius: '6px',
                border: `1px solid ${preferences.textAlign === 'justify' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: preferences.textAlign === 'justify' ? 'var(--bg-elevated)' : 'transparent',
                color: 'var(--text-primary)', cursor: 'pointer'
              }}
            >
              Justify
            </button>
          </div>
        </div>

        {/* Font Size */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Font Size</label>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{preferences.fontSize}px</span>
          </div>
          <input 
            type="range" 
            min="12" max="32" step="1" 
            value={preferences.fontSize}
            onChange={e => updatePreferences({ fontSize: parseInt(e.target.value, 10) })}
            style={{ width: '100%' }}
          />
        </div>

        {/* Line Spacing */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Line Spacing</label>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{preferences.lineSpacing}x</span>
          </div>
          <input 
            type="range" 
            min="1.0" max="2.5" step="0.1" 
            value={preferences.lineSpacing}
            onChange={e => updatePreferences({ lineSpacing: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

        {/* Paragraph Spacing */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Paragraph Spacing</label>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{preferences.paragraphSpacing}em</span>
          </div>
          <input 
            type="range" 
            min="0.5" max="3.0" step="0.1" 
            value={preferences.paragraphSpacing}
            onChange={e => updatePreferences({ paragraphSpacing: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </div>

      </div>
    </div>
  );
}
