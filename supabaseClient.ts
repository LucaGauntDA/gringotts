import { createClient } from '@supabase/supabase-js';

// Versuche Umgebungsvariablen zu lesen, falls verfügbar (Vite oder Node), sonst Fallback auf Hardcoded Werte.
// Dies verhindert Abstürze in reinen Browser-Umgebungen, wo 'process' nicht definiert ist.
const getEnvVar = (key: string, fallback: string): string => {
  try {
    // Check for Vite
    if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
      return (import.meta as any).env[key];
    }
    // Check for Node/Process
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore errors
  }
  return fallback;
};

const supabaseUrl = getEnvVar('SUPABASE_URL', "https://xyzeaywhfjetvlijfqzo.supabase.co");
const supabaseAnonKey = getEnvVar('SUPABASE_ANON_KEY', "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emVheXdoZmpldHZsaWpmcXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjY1NDAsImV4cCI6MjA3NjkwMjU0MH0.QEvXEIXqgxLUznSMzsdwK9eH1Us59JcUiDH0EHZVQLg");

export const isSupabaseConfigured = supabaseUrl !== "https://example.supabase.co";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
