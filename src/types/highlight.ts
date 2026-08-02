export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface Highlight {
  id: string;
  bookId: string;
  cfiRange: string; // epub.js CFI range
  text: string; // The highlighted text content
  color: HighlightColor;
  note?: string;
  createdAt: string;
  chapter?: string; // Chapter title where highlight is
}

export interface BookHighlights {
  bookId: string;
  bookTitle?: string;
  bookAuthor?: string;
  highlights: Highlight[];
}
