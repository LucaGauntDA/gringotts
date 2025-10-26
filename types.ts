export interface User {
  id: string; // This is now the UUID from Supabase Auth
  name: string;
  house: House;
  balance: number; // Stored in the smallest denomination: Knuts
  is_deleted?: boolean;
}

export interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number; // Stored in the smallest denomination: Knuts
  created_at: string; // Timestamp from Supabase is a string
  note?: string; // Optional note for the transaction
  // For UI rendering, we'll add these properties after fetching
  sender?: { id: string, name: string, house: string };
  receiver?: { id: string, name: string, house: string };
}

export enum House {
  Gryffindor = 'Gryffindor',
  Hufflepuff = 'Hufflepuff',
  Ravenclaw = 'Ravenclaw',
  Slytherin = 'Slytherin',
}