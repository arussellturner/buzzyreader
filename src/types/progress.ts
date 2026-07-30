export interface ReadingProgress {
  bookId: string;
  cfi: string; // epub.js CFI location
  percentage: number; // 0.0 to 1.0
  lastRead: string; // ISO date string
  currentPage?: number;
  totalPages?: number;
}
