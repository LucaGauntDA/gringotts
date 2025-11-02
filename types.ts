export interface User {
  id: string; // This is now the UUID from Supabase Auth
  name: string;
  house: House;
  balance: number; // Stored in the smallest denomination: Knuts
  is_deleted?: boolean;
  email?: string;
}

export interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number; // Stored in the smallest denomination: Knuts
  created_at: string; // Timestamp from Supabase is a string
  note?: string; // Optional note for the transaction
  // For UI rendering, we'll add these properties after fetching
  sender?: { id: string, name: string, house: string, email?: string };
  receiver?: { id: string, name: string, house: string, email?: string };
}

export enum House {
  Gryffindor = 'Gryffindor',
  Hufflepuff = 'Hufflepuff',
  Ravenclaw = 'Ravenclaw',
  Slytherin = 'Slytherin',
}

export interface Currency {
  galleons: number;
  sickles: number;
  knuts: number;
}

export enum MoneyRequestStatus {
  Pending = 'pending',
  Accepted = 'accepted',
  Rejected = 'rejected',
}

export interface MoneyRequest {
  id: string;
  requester_id: string;

  requestee_id: string;
  amount: number; // in Knuts
  note?: string;
  status: MoneyRequestStatus;
  created_at: string;
  amount_breakdown?: { g: number; s: number; k: number };
  // For UI rendering
  requester?: { id: string, name: string, house: string, email?: string };
  requestee?: { id: string, name: string, house: string, email?: string };
}
