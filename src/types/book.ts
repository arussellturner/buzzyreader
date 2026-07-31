export interface Book {
  id: string; // Generated UUID
  driveFileId: string; // Google Drive file ID
  title: string;
  author: string;
  coverUrl?: string; // Base64 data URL of cover image
  addedAt: string; // ISO date string
  lastReadAt?: string; // ISO date string
  totalLocations?: number;
  notes?: string; // User notes
}

export interface Library {
  books: Book[];
  lastSynced: string;
}
