
import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables
const getEnv = (key: string): string | undefined => {
  try {
    return typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
  } catch {
    return undefined;
  }
};

const supabaseUrl = getEnv('SUPABASE_URL') || "https://xyzeaywhfjetvlijfqzo.supabase.co";
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emVheXdoZmpldHZsaWpmcXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjY1NDAsImV4cCI6MjA3NjkwMjU0MH0.QEvXEIXqgxLUznSMzsdwK9eH1Us59JcUiDH0EHZVQLg";

export const isSupabaseConfigured = supabaseUrl !== "https://example.supabase.co" && supabaseAnonKey !== "example-anon-key";

if (!isSupabaseConfigured) {
  console.warn("WICHTIG: Du musst deine Supabase-Zugangsdaten in der Datei 'supabaseClient.ts' eintragen. Ersetze die Beispiel-URL und den Beispiel-Key durch deine echten Werte.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
