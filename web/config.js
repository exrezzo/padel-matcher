// The anon key is safe to expose in the browser; it maps to the 'anon' role.
// You can find it in Supabase: Project Settings -> API -> Project API keys -> anon public.

window.__APP_CONFIG = {
  // Required for production GitHub Pages calls to Edge Functions.
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwYnhrY29wZm9keGRzZXRlcWxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzODY0OTgsImV4cCI6MjA3Mzk2MjQ5OH0.JNifi9ckldkZi7eKJkCnPBtOPM1y5eLZTKJ19THY-YI"
  // Optionally, you could also add supabaseFunctionsUrl to override BASE if needed.
  // supabaseFunctionsUrl: "https://YOUR-REF.functions.supabase.co"
};

