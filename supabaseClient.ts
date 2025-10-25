import { createClient } from '@supabase/supabase-js';

// --- WICHTIG ---
// FÜGE DEINE SUPABASE URL UND DEINEN ANON KEY HIER EIN FÜR DIE LOKALE ENTWICKLUNG.
// Diese Werte werden ignoriert, wenn du auf Netlify veröffentlichst, da dort
// die von dir eingerichteten Umgebungsvariablen verwendet werden.
const supabaseUrl = process.env.SUPABASE_URL || "https://xyzeaywhfjetvlijfqzo.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emVheXdoZmpldHZsaWpmcXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjY1NDAsImV4cCI6MjA3NjkwMjU0MH0.QEvXEIXqgxLUznSMzsdwK9eH1Us59JcUiDH0EHZVQLg";

export const isSupabaseConfigured = supabaseUrl !== "https://example.supabase.co" && supabaseAnonKey !== "example-anon-key";

if (!isSupabaseConfigured) {
  // Wir werfen hier keinen Fehler, damit die App nicht abstürzt.
  // Stattdessen werden Supabase-Fehler in der Konsole angezeigt, wenn API-Aufrufe fehlschlagen.
  // So kannst du die App starten und siehst diese Warnung.
  console.warn("WICHTIG: Du musst deine Supabase-Zugangsdaten in der Datei 'supabaseClient.ts' eintragen. Ersetze die Beispiel-URL und den Beispiel-Key durch deine echten Werte.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);