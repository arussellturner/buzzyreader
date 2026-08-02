export type ThemeMode = 'dark' | 'light' | 'sepia' | 'black';
export type FontFamily = 'inter' | 'georgia' | 'literata' | 'opendyslexic' | 'system';

export interface ReaderPreferences {
  theme: ThemeMode;
  fontSize: number; // 12-32
  fontFamily: FontFamily;
  lineSpacing: number; // 1.0-2.5
  paragraphSpacing: number; // 0.5-3.0
  charSpacing: number; // -0.05 to 0.2 (em)
  showProgress: boolean;
  ttsRate: number; // 0.5-2.0
  ttsVoice?: string; // Voice URI
  textAlign?: 'left' | 'justify';
  librarySortOption?: 'title' | 'authorFirst' | 'authorLast' | 'recentRead' | 'recentAdded';
}

export const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: 'dark',
  fontSize: 18,
  fontFamily: 'literata',
  lineSpacing: 1.6,
  paragraphSpacing: 1.2,
  charSpacing: 0,
  showProgress: true,
  ttsRate: 1.0,
  textAlign: 'left',
  librarySortOption: 'recentRead',
};
