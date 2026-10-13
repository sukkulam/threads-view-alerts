const USERNAME = /^[a-z0-9._]{1,30}$/i;
const CODE = /^[A-Za-z0-9_-]{5,40}$/;
const MAX_HTML = 6_000_000;
// Public server-rendered pages; no cookies, sessions or Graph API tokens.
const CRAWLER = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

export function publicTarget(input) {
  let value = String(input || "").trim();
  if (USERNAME.test(value.replace(/^@/, ""))) value = `https://www.threads.com/@${value.replace(/^@/, "")}`;
  let url;
  try { url = new URL(value); } catch { throw new Error("Threads 계정명 또는 공개 게시물 주소를 입력하세요."); }
  if (url.protocol !== "https:" || !["threads.com", "www.threads.com", "threads.net", "www.threads.net"].includes(url.hostname) || url.port || url.username || url.password) throw new Error("공개 Threads 주소만 등록할 수 있습니다.");
  const match = decodeURIComponent(url.pathname).match(/^\/@([a-z0-9._]{1,30})(?:\/post\/([A-Za-z0-9_-]{5,40}))?\/?$/i);
  if (!match) throw new Error("계정 프로필 또는 게시물의 전체 Threads 주소를 입력하세요.");
  const username = match[1].toLowerCase(), code = match[2] || "";
  return { username, code, url: `https://www.threads.com/@${username}${code ? `/post/${code}` : ""}` };
}

function scriptData(html) {
  const values = [];
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { values.push(JSON.parse(match[1])); } catch { /* JS scripts are never evaluated. */ }
  }
  return values;
}

function visit(values, callback) {
  const stack = [...values]; let count = 0;
  while (stack.length) {
    const value = stack.pop();
    if (!value || typeof value !== "object") continue;
    if (++count > 150000) throw new Error("공개 페이지 데이터가 너무 큽니다.");
    callback(value);
    for (const child of Object.values(value)) if (child && typeof child === "object") stack.push(child);
  }
}

export function profilePosts(html, username, limit = 10) {
  const found = new Map();
  visit(scriptData(html), value => {
    // Only the original post of a profile thread, excluding its replies,
    // quoted posts, other authors and carousel media items.
    const post = value.thread_items?.[0]?.post;
    if (!post || post.user?.username?.toLowerCase() !== username.toLowerCase() || !CODE.test(post.code || "")) return;
    found.set(post.code, { id: post.code, text: String(post.caption?.text || "Threads 게시물"), timestamp: Number(post.taken_at || 0), permalink: `https://www.threads.com/@${username}/post/${post.code}` });
  });
  const posts = [...found.values()].sort((a,b) => b.timestamp - a.timestamp).slice(0,limit);
  if (!posts.length) throw new Error("공개 게시물 목록을 읽지 못했습니다. 비공개·삭제·접근 제한 여부를 확인하세요.");
  return posts;
}

export function postViews(html, target) {
  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i)?.[1]?.replace(/&#0*64;|&#x0*40;|&commat;/gi, "@").replace(/&amp;/g, "&");
  if (!canonical || publicTarget(canonical).code !== target.code || publicTarget(canonical).username !== target.username) throw new Error("요청한 게시물 페이지를 확인하지 못했습니다.");
  const counts = new Set();
  visit(scriptData(html), value => {
    // This module supplies the current permalink header's exact count.
    // Never read a count belonging to a reply, quote or recommendation.
    if (Array.isArray(value) && value[0] === "BarcelonaLoggedOutExpansionGating") {
      const n = value[2]?.view_counts;
      if (typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000_000) counts.add(n);
    }
  });
  if (counts.size !== 1) throw new Error("정확한 공개 조회수가 제공되지 않았습니다. 이전 조회수는 유지합니다.");
  return [...counts][0];
}

export async function publicHtml(url, fetcher = fetch) {
  const target = publicTarget(url);
  const response = await fetcher(target.url, { headers: { "User-Agent": CRAWLER, "Accept": "text/html", "Accept-Language": "ko-KR,ko;q=0.9" }, redirect: "manual", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`공개 페이지 확인 실패 (HTTP ${response.status}). 다음 주기에 다시 확인합니다.`);
  if (Number(response.headers.get("content-length")) > MAX_HTML) throw new Error("공개 페이지 크기가 너무 큽니다.");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("공개 페이지가 비어 있습니다.");
  const decoder = new TextDecoder(); let size = 0, html = "";
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > MAX_HTML) throw new Error("공개 페이지 크기가 너무 큽니다."); html += decoder.decode(part.value, { stream:true }); } html += decoder.decode(); } finally { await reader.cancel(); }
  return html;
}
