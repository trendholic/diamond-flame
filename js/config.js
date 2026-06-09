/* Diamond Flame Home Appliances — backend configuration.
 * The anon key is safe to expose in the browser; access is governed by
 * Row Level Security policies in supabase/schema.sql.
 * To point at a different Supabase project, change these two values. */
window.DF_CONFIG = {
  SUPABASE_URL: "https://rwsfaotpdhznspueakze.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3c2Zhb3RwZGh6bnNwdWVha3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTcyMTksImV4cCI6MjA5NjUzMzIxOX0.92igfOS3aEhWxItKrpem0NrYd9K3fYwJLkKe9wisuL4",
  CURRENCY: "Rs",
  WHATSAPP: "" // optional: full intl number e.g. 923001234567 for order pings
};
