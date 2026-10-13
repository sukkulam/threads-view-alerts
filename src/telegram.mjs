import { decryptToken, sha256 } from "./crypto.mjs";

export async function notificationConfig(db, owner, env) {
  const row = await db.prepare("SELECT * FROM public_notification_settings WHERE owner=?").bind(owner).first();
  return {token:row?.telegram_token_cipher ? await decryptToken(row.telegram_token_cipher,row.telegram_token_iv,env.TOKEN_ENCRYPTION_KEY) : "",chatId:row?.telegram_chat_id || ""};
}
export async function telegramCall(token, method, body, fetcher = fetch) {
  // Provider error messages and URLs may contain a bot token. Do not propagate them.
  try {
    const response = await fetcher(`https://api.telegram.org/bot${token}/${method}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(15000),redirect:"error"});
    const value = await response.json();
    if (!response.ok || value.ok !== true) throw new Error("TELEGRAM");
    return value.result;
  } catch(error) {
    if (error?.code === "REQUEST_BUDGET") throw error;
    throw Object.assign(new Error("텔레그램 연결을 확인하고 봇에게 /start를 보내세요. 대화 ID 자동 찾기가 안 되면 직접 입력하세요."),{status:400});
  }
}
export async function sendMessage(config, text, fetcher = fetch) {
  if (!config.token || !config.chatId) throw Object.assign(new Error("텔레그램 봇과 대화 ID를 먼저 저장하세요."),{status:400});
  const result = await telegramCall(config.token,"sendMessage",{chat_id:config.chatId,text,link_preview_options:{is_disabled:true}},fetcher);
  if (!result?.message_id) throw new Error("텔레그램 발송을 확인하지 못했습니다.");
  return String(result.message_id);
}
export async function notifyPost(db, watch, post, config, fetcher = fetch) {
  if (post.views < watch.threshold) return;
  const key = await sha256(JSON.stringify([watch.owner,watch.username,post.id,watch.threshold,config.chatId]));
  const now = Date.now(), stamp = new Date(now).toISOString();
  const claimed = await db.prepare("INSERT OR IGNORE INTO public_alert_deliveries(key,owner,watch_id,post_id,threshold,destination,state,lease_until,updated_at) VALUES (?,?,?,?,?,?,'sending',?,?)").bind(key,watch.owner,watch.id,post.id,watch.threshold,config.chatId,now+120000,stamp).run();
  if (claimed.meta.changes !== 1) {
    const retry = await db.prepare("UPDATE public_alert_deliveries SET state='sending',lease_until=?,updated_at=? WHERE key=? AND state<>'sent' AND lease_until<=?").bind(now+120000,stamp,key,now).run();
    if (retry.meta.changes !== 1) return;
  }
  try {
    const text = `[Threads 조회수 알림]\n@${watch.username}\n현재 ${post.views.toLocaleString("ko-KR")}회 · 기준 ${watch.threshold.toLocaleString("ko-KR")}회\n${post.permalink}`;
    const provider = await sendMessage(config,text,fetcher);
    await db.prepare("UPDATE public_alert_deliveries SET state='sent',provider_id=?,last_error=NULL,delivered_at=?,updated_at=? WHERE key=?").bind(provider,stamp,stamp,key).run();
  } catch(error) {
    const message = error?.code === "REQUEST_BUDGET" ? "알림이 많아 다음 확인에서 이어 보냅니다." : "텔레그램 발송 실패: 봇 연결과 대화 ID를 확인하세요.";
    await db.prepare("UPDATE public_alert_deliveries SET state='failed',lease_until=?,last_error=?,updated_at=? WHERE key=?").bind(now+60000,message,stamp,key).run();
    throw new Error(message);
  }
}
