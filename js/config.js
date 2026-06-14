/* Diamond Flame Home Appliances — backend configuration.
 * The anon key is safe to expose in the browser; access is governed by
 * Row Level Security policies in supabase/schema.sql.
 * To point at a different Supabase project, change these two values. */
window.DF_CONFIG = {
  SUPABASE_URL: "https://rwsfaotpdhznspueakze.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3c2Zhb3RwZGh6bnNwdWVha3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NTcyMTksImV4cCI6MjA5NjUzMzIxOX0.92igfOS3aEhWxItKrpem0NrYd9K3fYwJLkKe9wisuL4",
  CURRENCY: "Rs",
  WHATSAPP: "923030042020", // full intl number (no +) for the WhatsApp button & documents
  // Optional: a server endpoint that proxies an LLM (keeps the API key server-side).
  // It should accept POST {message} and return JSON {reply}. Leave "" to use the
  // built-in assistant only.
  AI_ENDPOINT: "",
  // Optional custom CORS proxy for "Import from URL" (must return the raw page
  // and accept the target URL appended/encoded). Leave "" to use built-in fallbacks.
  IMPORT_PROXY: "",
  // Optional worker endpoint that auto-sends each placed order to the store's
  // WhatsApp (keeps the WhatsApp key server-side). Set to your deployed worker URL
  // + "/notify-order", e.g. "https://diamond-flame-worker.<you>.workers.dev/notify-order".
  // Leave "" to fall back to the one-tap "Send on WhatsApp" button.
  ORDER_WEBHOOK: "",
  // Bank details shown to customers who choose "Bank Transfer" — edit these.
  BANK: {
    bank: "Meezan Bank",
    title: "NADEEM IMPEX",
    account: "09090102610361",
    iban: "PK61MEZN0009090102610361",
    currency: "PKR"
  }
};
