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
    <>
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99
        }}
        onClick={onClose}
      />
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Reading Settings</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px' }}>
          &times;
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Theme */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Theme</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['light', 'dark', 'sepia'].map(theme => (
              <button 
                key={theme}
                onClick={() => updatePreferences({ theme: theme as ThemeMode })}
                style={{ 
                  padding: '4px 10px', 
                  borderRadius: '4px',
                  border: `1px solid ${preferences.theme === theme ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  background: preferences.theme === theme ? 'var(--bg-elevated)' : 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontSize: '13px'
                }}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Font Family */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Font</label>
          <select 
            value={preferences.fontFamily} 
            onChange={e => updatePreferences({ fontFamily: e.target.value as FontFamily })}
            style={{ width: '150px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', fontSize: '13px' }}
          >
            <option value="literata">Literata (Serif)</option>
            <option value="georgia">Georgia (Serif)</option>
            <option value="inter">Inter (Sans)</option>
            <option value="system">System Default</option>
            <option value="opendyslexic">OpenDyslexic</option>
          </select>
        </div>

        {/* Text Align */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Alignment</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button 
              onClick={() => updatePreferences({ textAlign: 'left' })}
              title="Left Align"
              style={{ 
                padding: '4px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${preferences.textAlign === 'left' || !preferences.textAlign ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: preferences.textAlign === 'left' || !preferences.textAlign ? 'var(--bg-elevated)' : 'transparent',
                color: 'var(--text-primary)', cursor: 'pointer'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 3h12v1.5H2V3zm0 4h8v1.5H2V7zm0 4h12v1.5H2V11z"/>
              </svg>
            </button>
            <button 
              onClick={() => updatePreferences({ textAlign: 'justify' })}
              title="Justify"
              style={{ 
                padding: '4px 10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1px solid ${preferences.textAlign === 'justify' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                background: preferences.textAlign === 'justify' ? 'var(--bg-elevated)' : 'transparent',
                color: 'var(--text-primary)', cursor: 'pointer'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 3h12v1.5H2V3zm0 4h12v1.5H2V7zm0 4h12v1.5H2V11z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Font Size */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Font Size</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', width: '120px' }}>
            <button 
              onClick={() => updatePreferences({ fontSize: Math.max(12, preferences.fontSize - 1) })}
              style={{ padding: '4px 10px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px' }}
              disabled={preferences.fontSize <= 12}
            >
              &minus;
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{preferences.fontSize}px</span>
            <button 
              onClick={() => updatePreferences({ fontSize: Math.min(32, preferences.fontSize + 1) })}
              style={{ padding: '4px 10px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px' }}
              disabled={preferences.fontSize >= 32}
            >
              +
            </button>
          </div>
        </div>

        {/* Line Spacing */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Line spacing</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', width: '120px' }}>
            <button 
              onClick={() => updatePreferences({ lineSpacing: Math.max(1.0, Number((preferences.lineSpacing - 0.1).toFixed(1))) })}
              style={{ padding: '4px 10px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px' }}
              disabled={preferences.lineSpacing <= 1.0}
            >
              &minus;
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{preferences.lineSpacing.toFixed(1)}x</span>
            <button 
              onClick={() => updatePreferences({ lineSpacing: Math.min(2.5, Number((preferences.lineSpacing + 0.1).toFixed(1))) })}
              style={{ padding: '4px 10px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px' }}
              disabled={preferences.lineSpacing >= 2.5}
            >
              +
            </button>
          </div>
        </div>

        {/* Paragraph Spacing */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Paragraph</label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', width: '120px' }}>
            <button 
              onClick={() => updatePreferences({ paragraphSpacing: Math.max(0.5, Number((preferences.paragraphSpacing - 0.1).toFixed(1))) })}
              style={{ padding: '4px 10px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px' }}
              disabled={preferences.paragraphSpacing <= 0.5}
            >
              &minus;
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{preferences.paragraphSpacing.toFixed(1)}em</span>
            <button 
              onClick={() => updatePreferences({ paragraphSpacing: Math.min(3.0, Number((preferences.paragraphSpacing + 0.1).toFixed(1))) })}
              style={{ padding: '4px 10px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '16px' }}
              disabled={preferences.paragraphSpacing >= 3.0}
            >
              +
            </button>
          </div>
        </div>

      </div>
    </div>
    </>
  );
}
