export const schema = [
  "CREATE TABLE IF NOT EXISTS public_watches (id TEXT PRIMARY KEY, owner TEXT NOT NULL, username TEXT NOT NULL, target_url TEXT NOT NULL, threshold INTEGER NOT NULL, interval_minutes INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, next_check_at INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0, last_scanned_at TEXT, last_success_at TEXT, last_error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(owner,target_url))",
  "CREATE INDEX IF NOT EXISTS idx_watches_due ON public_watches(enabled,next_check_at)",
  "CREATE INDEX IF NOT EXISTS idx_watches_owner ON public_watches(owner)",
  "CREATE TABLE IF NOT EXISTS public_watch_posts (watch_id TEXT NOT NULL REFERENCES public_watches(id) ON DELETE CASCADE, post_id TEXT NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL, views INTEGER, checked_at TEXT, last_error TEXT, discovered_at TEXT NOT NULL, PRIMARY KEY(watch_id,post_id))",
  "CREATE TABLE IF NOT EXISTS public_notification_settings (owner TEXT PRIMARY KEY, telegram_token_cipher TEXT, telegram_token_iv TEXT, telegram_chat_id TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS public_alert_deliveries (key TEXT PRIMARY KEY, owner TEXT NOT NULL, watch_id TEXT NOT NULL, post_id TEXT NOT NULL, threshold INTEGER NOT NULL, destination TEXT NOT NULL, state TEXT NOT NULL, lease_until INTEGER NOT NULL DEFAULT 0, provider_id TEXT, last_error TEXT, delivered_at TEXT, updated_at TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_alerts_owner ON public_alert_deliveries(owner,updated_at)"
];
export async function ensureDb(db) { await db.batch(schema.map(sql => db.prepare(sql))); }
export async function status(db, user) {
  const watches = await db.prepare("SELECT * FROM public_watches WHERE owner=? ORDER BY created_at DESC").bind(user.id).all();
  const posts = await db.prepare("SELECT p.* FROM public_watch_posts p JOIN public_watches w ON w.id=p.watch_id WHERE w.owner=? ORDER BY p.discovered_at DESC LIMIT 200").bind(user.id).all();
  const deliveries = await db.prepare("SELECT watch_id,post_id,threshold,state,last_error,delivered_at FROM public_alert_deliveries WHERE owner=? ORDER BY updated_at DESC LIMIT 100").bind(user.id).all();
  const settings = await db.prepare("SELECT telegram_token_cipher,telegram_chat_id FROM public_notification_settings WHERE owner=?").bind(user.id).first();
  return {user:{email:user.email,local:user.local},watches:watches.results || [],posts:posts.results || [],deliveries:deliveries.results || [],settings:{tokenSaved:Boolean(settings?.telegram_token_cipher),chatId:settings?.telegram_chat_id || "",configured:Boolean(settings?.telegram_token_cipher && settings?.telegram_chat_id)}};
}
