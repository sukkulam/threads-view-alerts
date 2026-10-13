import {publicTarget,publicHtml,profilePosts,postViews} from "./public-threads.mjs";
import {ensureDb} from "./db.mjs";
import {notificationConfig,notifyPost} from "./telegram.mjs";

export async function scanWatch(env, watch, fetcher = fetch) {
  const db = env.DB, now = Date.now(), stamp = new Date(now).toISOString();
  // Up to 48 requests with 15-second deadlines can exceed a three-minute lease.
  const claim = await db.prepare("UPDATE public_watches SET locked_until=? WHERE id=? AND owner=? AND enabled=1 AND locked_until<=?").bind(now+900000,watch.id,watch.owner,now).run();
  if (claim.meta.changes !== 1) return {busy:true,checked:0,errors:[]};
  const good = [], errors = [];
  let requests = 0, exhausted = false;
  const boundedFetch = (...args) => {
    if (requests >= 48) {exhausted=true; throw Object.assign(new Error("다음 확인에서 이어 처리합니다."),{code:"REQUEST_BUDGET"});}
    requests++;
    return fetcher(...args);
  };
  try {
    const target = publicTarget(watch.target_url);
    let posts;
    if (target.code) posts = [{id:target.code,permalink:target.url,text:""}];
    else {
      let latest = [];
      try {latest=profilePosts(await publicHtml(target.url,boundedFetch),target.username,10);} catch(error) {errors.push(error.message);}
      const tracked = await db.prepare("SELECT post_id,url,title FROM public_watch_posts WHERE watch_id=? ORDER BY discovered_at DESC LIMIT 20").bind(watch.id).all();
      const unique = new Map(latest.map(p=>[p.id,p]));
      for (const p of tracked.results || []) if (!unique.has(p.post_id)) unique.set(p.post_id,{id:p.post_id,permalink:p.url,text:p.title});
      posts = [...unique.values()].slice(0,20);
    }
    for (const post of posts) {
      await db.prepare("INSERT OR IGNORE INTO public_watch_posts(watch_id,post_id,url,title,discovered_at) VALUES (?,?,?,?,?)").bind(watch.id,post.id,post.permalink,String(post.text || "Threads 게시물").slice(0,200),stamp).run();
      try {
        const html = await publicHtml(post.permalink,boundedFetch);
        post.views = postViews(html,publicTarget(post.permalink));
        if (!post.text) post.text = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "Threads 게시물").replace(/&quot;/g,'"').replace(/&#039;/g,"'").replace(/&amp;/g,"&");
        post.text = post.text.replace(/\s+/g," ").slice(0,200);
        await db.prepare("UPDATE public_watch_posts SET views=?,title=?,checked_at=?,last_error=NULL WHERE watch_id=? AND post_id=?").bind(post.views,post.text,stamp,watch.id,post.id).run();
        good.push(post);
      } catch(error) {
        const message = String(error.message || "공개 조회수 확인 실패").slice(0,300);
        await db.prepare("UPDATE public_watch_posts SET last_error=? WHERE watch_id=? AND post_id=?").bind(message,watch.id,post.id).run();
        errors.push(message);
      }
    }
    const current = await db.prepare("SELECT * FROM public_watches WHERE id=? AND owner=?").bind(watch.id,watch.owner).first();
    if (current?.enabled && good.length) {
      const config = await notificationConfig(db,watch.owner,env);
      for (const post of good) {
        try {await notifyPost(db,current,post,config,boundedFetch);} catch(error) {errors.push(error.message);}
      }
    }
  } catch {errors.push("확인 작업을 완료하지 못했습니다. 다음 주기에 다시 확인합니다.");}
  finally {
    await db.prepare("UPDATE public_watches SET locked_until=0,next_check_at=?+CASE WHEN ?=1 THEN 60000 ELSE interval_minutes*60000 END,last_scanned_at=?,last_success_at=CASE WHEN ?=1 THEN ? ELSE last_success_at END,last_error=?,updated_at=? WHERE id=? AND owner=?").bind(Date.now(),exhausted?1:0,stamp,good.length?1:0,stamp,[...new Set(errors)].join(" · ").slice(0,600)||null,stamp,watch.id,watch.owner).run();
  }
  return {checked:good.length,errors:[...new Set(errors)]};
}
export async function scanDue(env, fetcher = fetch) {
  if (!env.DB || !env.TOKEN_ENCRYPTION_KEY || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return;
  await ensureDb(env.DB);
  const result = await env.DB.prepare("SELECT * FROM public_watches WHERE enabled=1 AND next_check_at<=? AND locked_until<=? ORDER BY next_check_at LIMIT 1").bind(Date.now(),Date.now()).all();
  for (const watch of result.results || []) await scanWatch(env,watch,fetcher);
}
