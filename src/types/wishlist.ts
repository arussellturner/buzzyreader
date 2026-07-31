export interface WishlistItem {
  id: string; // Generated UUID
  title: string;
  author: string;
  sourceNotes: string; // "How did you hear about this"
  addedAt: string; // ISO date string
}

export interface Wishlist {
  items: WishlistItem[];
}
