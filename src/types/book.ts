export interface Book {
  id: string; // Generated UUID
  driveFileId: string; // Google Drive file ID (copied app data file)
  originalFileId?: string; // Original Google Drive file ID (for tracking duplicates)
  title: string;
  author: string;
  coverUrl?: string; // Base64 data URL of cover image
  addedAt: string; // ISO date string
  lastReadAt?: string; // ISO date string
  totalLocations?: number;
  notes?: string; // User notes
  isRead?: boolean; // User marked as read
  finishedAt?: string; // ISO date string when marked as read
}

export interface Library {
  books: Book[];
  lastSynced: string;
}
