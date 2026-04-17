// apps/worker/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ludufpxtpputzqauhdvc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZHVmcHh0cHB1dHpxYXVoZHZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDgyNzUsImV4cCI6MjA5MTcyNDI3NX0.MVWXhj1NN-T45YklZ2SPk1WhIDqAZwqjXA7fx6fXRLE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
