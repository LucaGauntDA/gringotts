import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xyzeaywhfjetvlijfqzo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5emVheXdoZmpldHZsaWpmcXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjY1NDAsImV4cCI6MjA3NjkwMjU0MH0.QEvXEIXqgxLUznSMzsdwK9eH1Us59JcUiDH0EHZVQLg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
