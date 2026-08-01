export interface WishlistItem {
  id: string; // Generated UUID
  title: string;
  author: string;
  sourceNotes: string; // "How did you hear about this"
  coverUrl?: string; // Optional book cover URL
  addedAt: string; // ISO date string
}

export interface Wishlist {
  items: WishlistItem[];
}
