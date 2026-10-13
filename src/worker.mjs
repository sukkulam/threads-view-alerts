import {createAuthenticator,accessIssuer} from "./auth.mjs";
import {ensureDb,status} from "./db.mjs";
import {publicTarget} from "./public-threads.mjs";
import {encryptToken} from "./crypto.mjs";
import {notificationConfig,telegramCall,sendMessage} from "./telegram.mjs";
import {scanWatch,scanDue} from "./scanner.mjs";

const intervals = [10,20,30,60];
const idPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const tokenPattern = /^\d{5,20}:[A-Za-z0-9_-]{20,150}$/;
const chatPattern = /^(?:-?\d{5,20}|@[a-z0-9_]{5,32})$/i;
const secureHeaders = {"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"same-origin","X-Frame-Options":"DENY","Content-Security-Policy":"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
const json = (body, code=200) => Response.json(body,{status:code,headers:secureHeaders});
const fail = (message,code=400) => {throw Object.assign(new Error(message),{status:code});};
const onlyKeys = (input, keys) => {if(Object.keys(input).some(k=>!keys.includes(k))) fail("입력 항목을 확인하세요.");};
function values(input) {
  if (!Number.isSafeInteger(input.threshold) || input.threshold < 1 || input.threshold > 1_000_000_000 || !intervals.includes(input.interval)) fail("조회수와 확인 주기를 확인하세요.");
}
function string(input, field, max=200) {
  if (typeof input[field] !== "string" || input[field].length>max) fail("입력 형식을 확인하세요.");
  return input[field].trim();
}
async function body(request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) fail("JSON 요청만 지원합니다.",415);
  const reader = request.body?.getReader();
  if (!reader) fail("입력 내용을 확인하세요.");
  const chunks=[]; let size=0;
  try {
    while (true) {
      const part = await reader.read(); if(part.done) break;
      size+=part.value.length; if(size>8192) fail("입력 내용이 너무 큽니다.",413);
      chunks.push(part.value);
    }
  } finally {await reader.cancel();}
  const joined = new Uint8Array(size); let offset=0;
  for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.length;}
  try {const value=JSON.parse(new TextDecoder().decode(joined));if(!value || Array.isArray(value) || typeof value!=="object") throw new Error();return value;} catch {fail("입력 내용을 확인하세요.");}
}
async function api(request, env, user, fetcher) {
  if (!env.DB) fail("서버의 데이터베이스 연결이 필요합니다.",503);
  await ensureDb(env.DB);
  if (request.method === "GET") return json(await status(env.DB,user));
  if (request.method !== "POST") return json({error:"지원하지 않는 요청입니다."},405);
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") fail("이 페이지에서 다시 시도하세요.",403);
  const input = await body(request), db=env.DB, owner=user.id, stamp=new Date().toISOString();
  if (input.action === "add") {
    onlyKeys(input,["action","target","threshold","interval"]); values(input);
    let target; try {target=publicTarget(string(input,"target",300));} catch {fail("공개 Threads 계정명 또는 게시물 주소를 입력하세요.");}
    if (await db.prepare("SELECT id FROM public_watches WHERE owner=? AND target_url=?").bind(owner,target.url).first()) fail("이미 등록한 대상입니다.",409);
    const result = await db.prepare("INSERT INTO public_watches(id,owner,username,target_url,threshold,interval_minutes,created_at,updated_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT count(*) FROM public_watches WHERE owner=?)<10 AND (SELECT COALESCE(SUM(1.0/interval_minutes),0) FROM public_watches WHERE enabled=1)+1.0/?<=0.800001").bind(crypto.randomUUID(),owner,target.username,target.url,input.threshold,input.interval,stamp,stamp,owner,input.interval).run();
    if(result.meta.changes!==1) fail("사용자당 최대 10개입니다. 서버 확인량이 가득 찼다면 기존 대상의 주기를 늘리거나 일시정지하세요.");
  } else if (["update","remove","scan"].includes(input.action)) {
    const id=string(input,"id",36);if(!idPattern.test(id)) fail("등록 대상을 확인하세요.");
    const watch=await db.prepare("SELECT * FROM public_watches WHERE id=? AND owner=?").bind(id,owner).first();
    if(!watch) fail("등록 대상을 찾을 수 없습니다.",404);
    if (input.action === "update") {
      onlyKeys(input,["action","id","threshold","interval","enabled"]);values(input);
      if(typeof input.enabled!=="boolean") fail("확인 상태를 확인하세요.");
      const result=await db.prepare("UPDATE public_watches SET threshold=?,interval_minutes=?,enabled=?,next_check_at=0,updated_at=? WHERE id=? AND owner=? AND (?=0 OR (SELECT COALESCE(SUM(1.0/interval_minutes),0) FROM public_watches WHERE enabled=1 AND id<>?)+1.0/?<=0.800001)").bind(input.threshold,input.interval,input.enabled?1:0,stamp,id,owner,input.enabled?1:0,id,input.interval).run();
      if(result.meta.changes!==1) fail("서버 확인량이 가득 찼습니다. 확인 주기를 늘리거나 다른 대상을 일시정지하세요.");
    } else if (input.action === "remove") {
      onlyKeys(input,["action","id"]);
      if(watch.locked_until>Date.now()) fail("확인 중입니다. 완료 후 삭제하세요.",409);
      await db.batch([db.prepare("DELETE FROM public_watch_posts WHERE watch_id IN (SELECT id FROM public_watches WHERE id=? AND owner=?)").bind(id,owner),db.prepare("DELETE FROM public_watches WHERE id=? AND owner=?").bind(id,owner)]);
    } else {
      onlyKeys(input,["action","id"]);
      if(!watch.enabled) fail("일시정지한 대상입니다. 먼저 다시 켜주세요.");
      if(watch.last_scanned_at && Date.now()-Date.parse(watch.last_scanned_at)<60000) fail("확인 후 1분 뒤에 다시 시도하세요.",429);
      if(!user.local && !env.TOKEN_ENCRYPTION_KEY) fail("서버의 알림 보관 설정이 필요합니다.",503);
      const scan=await scanWatch(env,watch,fetcher);return json({...await status(db,user),scan});
    }
  } else if (input.action === "settings") {
    onlyKeys(input,["action","telegramToken","telegramChatId"]);
    const token=string(input,"telegramToken"),chatId=string(input,"telegramChatId",50);
    if((token && !tokenPattern.test(token)) || !chatPattern.test(chatId)) fail("봇 토큰과 대화 ID 형식을 확인하세요.");
    if(!env.TOKEN_ENCRYPTION_KEY) fail("서버에서 secret:init 설치 단계를 완료하세요.",503);
    const old=await notificationConfig(db,owner,env);
    if(!token && !old.token) fail("봇 토큰을 입력하세요.");
    const activeToken=token || old.token;
    const bot=await telegramCall(activeToken,"getMe",{},fetcher);
    if(!bot?.is_bot) fail("텔레그램 봇 토큰을 확인하세요.");
    const encrypted=await encryptToken(activeToken,env.TOKEN_ENCRYPTION_KEY);
    await db.prepare("INSERT INTO public_notification_settings(owner,telegram_token_cipher,telegram_token_iv,telegram_chat_id,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET telegram_token_cipher=excluded.telegram_token_cipher,telegram_token_iv=excluded.telegram_token_iv,telegram_chat_id=excluded.telegram_chat_id,updated_at=excluded.updated_at").bind(owner,encrypted.cipher,encrypted.iv,chatId,stamp).run();
  } else if (input.action === "telegram-chats") {
    onlyKeys(input,["action","telegramToken"]);const token=string(input,"telegramToken");
    if(token && !tokenPattern.test(token)) fail("봇 토큰 형식을 확인하세요.");
    const config=token ? {token} : await notificationConfig(db,owner,env);
    if(!config.token) fail("봇 토큰을 입력하세요.");
    const updates=await telegramCall(config.token,"getUpdates",{limit:100,timeout:0},fetcher);
    const chats=new Map();
    for(const update of Array.isArray(updates)?updates:[]) {
      const chat=update.message?.chat || update.channel_post?.chat;
      if(chat && Number.isSafeInteger(chat.id)) chats.set(String(chat.id),{id:String(chat.id),title:chat.title || [chat.first_name,chat.last_name].filter(Boolean).join(" ") || String(chat.id)});
    }
    return json({chats:[...chats.values()]});
  } else if (input.action === "test") {
    onlyKeys(input,["action"]);
    await sendMessage(await notificationConfig(db,owner,env),"[Threads 조회수 알림]\n텔레그램 연결 테스트에 성공했습니다. 등록한 게시물이 기준 조회수에 도달하면 이 대화로 알려드립니다.",fetcher);
  } else if (input.action === "disconnect") {
    onlyKeys(input,["action"]);
    await db.batch([db.prepare("DELETE FROM public_notification_settings WHERE owner=?").bind(owner),db.prepare("UPDATE public_watches SET enabled=0,updated_at=? WHERE owner=?").bind(stamp,owner)]);
  } else fail("지원하지 않는 요청입니다.");
  return json(await status(db,user));
}

export function createWorker(fetcher = fetch) {
  const authenticate = createAuthenticator(fetcher);
  return {
    async fetch(request,env) {
      const url=new URL(request.url);
      try {
        if(["/style.css","/app.js","/icon.svg","/manifest.webmanifest","/help.html"].includes(url.pathname) && ["GET","HEAD"].includes(request.method)) return asset(request,env);
        const user=await authenticate(request,env);
        if(!user) {
          if(url.pathname==="/") return asset(new Request(new URL("/login.html",url.origin)),env,401);
          return json({error:"로그인이 필요합니다. 페이지를 새로 열어 로그인하세요."},401);
        }
        if(url.pathname==="/api/watch") return await api(request,env,user,fetcher);
        if(url.pathname==="/logout") return Response.redirect(`${url.origin}/cdn-cgi/access/logout`,302);
        if(url.pathname==="/" && ["GET","HEAD"].includes(request.method)) return asset(request,env);
        return json({error:"페이지를 찾을 수 없습니다."},404);
      } catch(error) {
        const message=error.message==="ACCESS_SETUP" ? "서버 설치가 아직 완료되지 않았습니다. 설치 설명서의 Access 로그인 설정을 완료하세요." : error.status ? error.message : "처리하지 못했습니다. 서버 설치와 연결 상태를 확인하세요.";
        return json({error:message},error.status || 503);
      }
    },
    async scheduled(controller,env,ctx) {
      try {accessIssuer(env);} catch{return;}
      ctx.waitUntil(scanDue(env,fetcher).catch(()=>console.error("조회수 예약 확인 실패: 데이터베이스와 서버 설정을 확인하세요.")));
    }
  };
}
async function asset(request,env,code) {
  if(!env.ASSETS) return json({error:"페이지 파일 연결이 필요합니다."},503);
  const response=await env.ASSETS.fetch(request);
  return new Response(response.body,{status:code || response.status,headers:{...Object.fromEntries(response.headers),...secureHeaders}});
}
export default createWorker();
