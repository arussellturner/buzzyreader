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
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Font Size</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px' }}>
            <button 
              onClick={() => updatePreferences({ fontSize: Math.max(12, preferences.fontSize - 1) })}
              style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}
              disabled={preferences.fontSize <= 12}
            >
              &minus;
            </button>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{preferences.fontSize}px</span>
            <button 
              onClick={() => updatePreferences({ fontSize: Math.min(32, preferences.fontSize + 1) })}
              style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}
              disabled={preferences.fontSize >= 32}
            >
              +
            </button>
          </div>
        </div>

        {/* Line Spacing */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Line Spacing</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px' }}>
            <button 
              onClick={() => updatePreferences({ lineSpacing: Math.max(1.0, Number((preferences.lineSpacing - 0.1).toFixed(1))) })}
              style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}
              disabled={preferences.lineSpacing <= 1.0}
            >
              &minus;
            </button>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{preferences.lineSpacing.toFixed(1)}x</span>
            <button 
              onClick={() => updatePreferences({ lineSpacing: Math.min(2.5, Number((preferences.lineSpacing + 0.1).toFixed(1))) })}
              style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}
              disabled={preferences.lineSpacing >= 2.5}
            >
              +
            </button>
          </div>
        </div>

        {/* Paragraph Spacing */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-secondary)' }}>Paragraph Spacing</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px' }}>
            <button 
              onClick={() => updatePreferences({ paragraphSpacing: Math.max(0.5, Number((preferences.paragraphSpacing - 0.1).toFixed(1))) })}
              style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}
              disabled={preferences.paragraphSpacing <= 0.5}
            >
              &minus;
            </button>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{preferences.paragraphSpacing.toFixed(1)}em</span>
            <button 
              onClick={() => updatePreferences({ paragraphSpacing: Math.min(3.0, Number((preferences.paragraphSpacing + 0.1).toFixed(1))) })}
              style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}
              disabled={preferences.paragraphSpacing >= 3.0}
            >
              +
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
