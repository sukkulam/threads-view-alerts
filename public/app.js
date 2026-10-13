const $ = selector => document.querySelector(selector);
let current = null, working = false;
const number = value => Number(value || 0).toLocaleString("ko-KR");
const time = value => value ? new Date(value).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "대기 중";
function element(tag,text,className) {const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function message(text,error=false) {const node=$("#message");node.textContent=text;node.classList.toggle("error",error);node.hidden=false;}
async function api(input) {
  const response=await fetch("/api/watch",input ? {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)} : {cache:"no-store"});
  if(response.redirected || !(response.headers.get("content-type") || "").includes("application/json")) throw new Error("로그인이 만료됐습니다. 페이지를 새로 열어 로그인하세요.");
  const result=await response.json();if(!response.ok)throw new Error(result.error || "처리하지 못했습니다.");return result;
}
async function run(input,success) {
  if(working)return;
  working=true;document.querySelectorAll("button").forEach(b=>b.disabled=true);
  try {const result=await api(input);if(result.watches)render(result);if(success)message(success);return result;}
  catch(error){message(error.message,true);return null;}
  finally {working=false;document.querySelectorAll("button").forEach(b=>b.disabled=false);}
}
function safeLink(url,text) {
  const node=element("a",text);
  try {const value=new URL(url);if(value.protocol==="https:" && value.hostname==="www.threads.com"){node.href=value.href;node.target="_blank";node.rel="noopener noreferrer";}}
  catch{}return node;
}
function label(text,input){const node=element("label",text);node.append(input);return node;}
function render(data) {
  current=data;$("#user-email").textContent=data.user.email;$("#local-banner").hidden=!data.user.local;$("#logout").hidden=data.user.local;
  $("#count-targets").textContent=data.watches.length;$("#count-posts").textContent=data.posts.length;
  const watchMap=new Map(data.watches.map(w=>[w.id,w]));
  $("#count-reached").textContent=data.posts.filter(p=>p.views!==null && p.views>=watchMap.get(p.watch_id)?.threshold).length;
  $("#telegram-summary").textContent=data.settings.configured?"연결 완료":"연결 필요";
  if(document.activeElement!==$("#telegram-chat"))$("#telegram-chat").value=data.settings.chatId;
  $("#telegram-token").placeholder=data.settings.tokenSaved?"저장됨 · 변경할 때만 새 토큰 입력":"BotFather에서 받은 토큰";
  $("#token-hint").textContent=data.settings.tokenSaved?"토큰이 저장돼 있습니다. 빈칸으로 저장하면 기존 토큰을 사용합니다.":"저장한 토큰은 화면에 다시 표시하지 않습니다.";
  const watches=$("#watches");watches.replaceChildren();
  if(!data.watches.length)watches.append(element("p","첫 번째 계정이나 게시물을 위에서 등록하세요.","empty"));
  for(const watch of data.watches) {
    const card=element("article",undefined,"watch"),head=element("div",undefined,"watch-heading");
    head.append(safeLink(watch.target_url,`@${watch.username}`),element("span",watch.enabled?"확인 중":"일시정지",`tag ${watch.enabled?"":"paused"}`));card.append(head);
    if(watch.target_url.includes("/post/"))card.append(element("p","게시물 직접 등록","hint"));
    const form=element("form"),row=element("div",undefined,"form-row"),threshold=element("input"),interval=element("select");
    threshold.type="number";threshold.min="1";threshold.max="1000000000";threshold.required=true;threshold.value=watch.threshold;
    for(const value of [10,20,30,60]){const option=element("option",`${value}분`);option.value=value;interval.append(option);}interval.value=watch.interval_minutes;
    row.append(label("기준 조회수",threshold),label("확인 주기",interval));form.append(row);
    const buttons=element("div",undefined,"button-row"),save=element("button","설정 저장","secondary");save.type="submit";buttons.append(save);
    const scan=element("button","지금 확인","secondary");scan.type="button";scan.addEventListener("click",async()=>{const result=await run({action:"scan",id:watch.id});if(result?.scan)message(result.scan.busy?"이미 확인 중입니다.":`${result.scan.checked}개 게시물 확인${result.scan.errors.length?" · 일부 확인에 실패했습니다. 대상의 오류 내용을 확인하세요.":" 완료"}`,Boolean(result.scan.errors.length));});buttons.append(scan);
    const pause=element("button",watch.enabled?"일시정지":"다시 켜기","ghost");pause.type="button";pause.addEventListener("click",()=>run({action:"update",id:watch.id,threshold:watch.threshold,interval:watch.interval_minutes,enabled:!watch.enabled},watch.enabled?"확인을 일시정지했습니다.":"확인을 다시 시작합니다."));buttons.append(pause);
    const remove=element("button","삭제","ghost danger");remove.type="button";remove.addEventListener("click",()=>{if(confirm(`@${watch.username} 등록과 조회 기록을 삭제할까요?`))run({action:"remove",id:watch.id},"등록 대상을 삭제했습니다.");});buttons.append(remove);form.append(buttons);
    form.addEventListener("submit",event=>{event.preventDefault();run({action:"update",id:watch.id,threshold:Number(threshold.value),interval:Number(interval.value),enabled:Boolean(watch.enabled)},"설정을 저장했습니다.");});card.append(form);
    card.append(element("p",`마지막 확인 ${time(watch.last_scanned_at)} · 다음 확인 ${watch.enabled?time(watch.next_check_at):"일시정지"}`,"watch-time"));
    if(watch.last_error)card.append(element("p",watch.last_error,"watch-error"));watches.append(card);
  }
  const posts=$("#posts");posts.replaceChildren();
  if(!data.posts.length)posts.append(element("p","첫 자동 확인 후 게시물 조회수가 여기에 표시됩니다.","empty"));
  for(const post of data.posts) {
    const watch=watchMap.get(post.watch_id);if(!watch)continue;
    const reached=post.views!==null && post.views>=watch.threshold,card=element("article",undefined,`post ${reached?"reached":""}`),text=element("div"),views=element("div",post.views===null?"확인 대기":`${number(post.views)}회`,"views");
    text.append(safeLink(post.url,post.title || "Threads 게시물"),element("small",`@${watch.username} · ${time(post.checked_at)}`));
    if(post.last_error)text.append(element("span",post.last_error,"post-error"));
    const delivery=data.deliveries.find(d=>d.watch_id===watch.id && d.post_id===post.post_id && d.threshold===watch.threshold);
    if(delivery?.state==="sent")views.append(element("span","텔레그램 발송 완료","sent"));else if(reached)views.append(element("span",delivery?.state==="failed"?"발송 재시도 대기":"기준 도달","sent"));
    card.append(text,views);posts.append(card);
  }
}
$("#add-form").addEventListener("submit",async event=>{event.preventDefault();const form=event.currentTarget,result=await run({action:"add",target:form.elements.target.value,threshold:Number(form.elements.threshold.value),interval:Number(form.elements.interval.value)},"등록했습니다. 자동 확인 시간이 되면 조회수를 확인합니다.");if(result)form.elements.target.value="";});
$("#telegram-form").addEventListener("submit",async event=>{event.preventDefault();const result=await run({action:"settings",telegramToken:$("#telegram-token").value.trim(),telegramChatId:$("#telegram-chat").value.trim()},"텔레그램 연결을 저장했습니다. 테스트 알림으로 수신을 확인하세요.");if(result)$("#telegram-token").value="";});
$("#find-chats").addEventListener("click",async()=>{const result=await run({action:"telegram-chats",telegramToken:$("#telegram-token").value.trim()});if(!result)return;const box=$("#chat-choices");box.replaceChildren();if(!result.chats.length){message("최근 대화가 없습니다. 봇에게 /start를 다시 보내고 찾아보세요.",true);return;}for(const chat of result.chats){const button=element("button",`${chat.title} · ${chat.id}`);button.type="button";button.addEventListener("click",()=>{$("#telegram-chat").value=chat.id;box.replaceChildren();message("대화를 선택했습니다. 연결 저장을 눌러주세요.");});box.append(button);}message("알림 받을 대화를 아래에서 선택하세요.");});
$("#test-telegram").addEventListener("click",()=>run({action:"test"},"테스트 알림을 보냈습니다. 텔레그램을 확인하세요."));
$("#disconnect").addEventListener("click",()=>{if(confirm("텔레그램 연결을 해제하고 내 모든 대상의 확인을 일시정지할까요?"))run({action:"disconnect"},"연결을 해제하고 확인을 일시정지했습니다.");});
$("#refresh").addEventListener("click",()=>run(undefined,"최신 상태로 새로고침했습니다."));
run();
setInterval(()=>{if(!working && !document.hidden && !["INPUT","SELECT"].includes(document.activeElement?.tagName))run();},60000);
