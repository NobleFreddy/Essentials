// Verbindung fuer die oeffentliche Webseite (GitHub Pages): die Edge Function "essentials-web"
// im Supabase-Projekt. Die Adresse ist oeffentlich gedacht - einen Schluessel braucht die Seite
// nicht, sie liest nur, was die Funktion freigibt (Stand und Karte).
// Laeuft die Seite ueber den lokalen Server (npm run web), wird das hier nicht gebraucht.
window.BE_CONFIG = {
  supabaseUrl: "https://voqmnmuqvysfxqoorbfl.supabase.co",
  webFunction: "essentials-web",
};
