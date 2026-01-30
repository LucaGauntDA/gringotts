
export interface User {
  id: string; 
  name: string;
  house: House;
  balance: number; 
  is_deleted?: boolean;
  email?: string;
}

export interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  created_at: string;
  note?: string;
  sender?: { id: string, name: string, house: string, email?: string };
  receiver?: { id: string, name: string, house: string, email?: string };
}

export enum House {
  Gryffindor = 'Gryffindor',
  Hufflepuff = 'Hufflepuff',
  Ravenclaw = 'Ravenclaw',
  Slytherin = 'Slytherin'
}

export interface Currency {
  galleons: number;
  sickles: number;
  knuts: number;
}

export interface AppNotification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export enum BettingEventStatus {
  OPEN = 'OPEN',
  LOCKED = 'LOCKED',
  RESOLVED = 'RESOLVED',
}

export interface BettingEvent {
  id: string;
  title: string;
  option_a: string;
  option_b: string;
  status: BettingEventStatus;
  winner?: 'A' | 'B' | null;
  created_at: string;
  created_by?: string;
}

export interface Bet {
  id: string;
  event_id: string;
  user_id: string;
  amount: number;
  choice: 'A' | 'B';
  created_at: string;
  user?: { id: string, name: string, house: string };
}
