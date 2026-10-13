import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {createWorker} from "../src/worker.mjs";
import {createAuthenticator} from "../src/auth.mjs";
import {schema,ensureDb} from "../src/db.mjs";
import {scanWatch,scanDue} from "../src/scanner.mjs";
import {decryptToken} from "../src/crypto.mjs";
import {configure} from "../scripts/configure.mjs";
import {validateConfig} from "../scripts/config.mjs";
import {readFile,writeFile,mkdir,mkdtemp,copyFile,rm} from "node:fs/promises";
import {join,dirname,basename,resolve} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";

const issuer="https://unit-tests.cloudflareaccess.com",aud="a".repeat(64);
const encryption=Buffer.alloc(32,23).toString("base64");
const pair=await crypto.subtle.generateKey({name:"RSASSA-PKCS1-v1_5",modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:"SHA-256"},true,["sign","verify"]);
const jwk={...await crypto.subtle.exportKey("jwk",pair.publicKey),kid:"test-key",alg:"RS256",use:"sig"};
const b64=value=>Buffer.from(typeof value==="string"?value:JSON.stringify(value)).toString("base64url");
async function jwt(user="alice",overrides={},header={}) {
  const now=Math.floor(Date.now()/1000),part=`${b64({alg:"RS256",kid:"test-key",...header})}.${b64({sub:user,email:`${user}@example.test`,iss:issuer,aud:[aud],type:"app",iat:now,exp:now+600,...overrides})}`;
  return `${part}.${Buffer.from(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",pair.privateKey,new TextEncoder().encode(part))).toString("base64url")}`;
}
function database() {
  const sqlite=new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  const db={sqlite,prepare(sql){let args=[];return{bind(...values){args=values;return this;},async run(){const result=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(result.changes)}};},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return{results:sqlite.prepare(sql).all(...args)};}};},async batch(statements){sqlite.exec("BEGIN");try{const results=[];for(const stmt of statements)results.push(await stmt.run());sqlite.exec("COMMIT");return results;}catch(error){sqlite.exec("ROLLBACK");throw error;}}};return db;
}
const postUrl="https://www.threads.com/@sample.user/post/PostABC123";
const postHtml=(views=5000,url=postUrl)=>`<link rel="canonical" href="${url}"><title>공개 테스트 게시물</title><script>${JSON.stringify({define:[["BarcelonaLoggedOutExpansionGating",[],{view_counts:views}]]})}</script>`;
async function setup() {
  const DB=database(),sends=[],calls=[];
  const env={DB,ACCESS_TEAM_DOMAIN:issuer,ACCESS_AUD:aud,TOKEN_ENCRYPTION_KEY:encryption,ASSETS:{fetch:async()=>new Response("static",{headers:{"Content-Type":"text/html"}})}};
  let html=postHtml(),telegramFailure=false;
  const fetcher=async(url,init)=>{
    calls.push(String(url));
    if(String(url).endsWith("/certs"))return Response.json({keys:[jwk]});
    if(String(url).includes("api.telegram.org")) {
      if(telegramFailure)throw new Error(`secret provider URL ${url}`);
      if(String(url).endsWith("/getMe"))return Response.json({ok:true,result:{id:12,is_bot:true}});
      if(String(url).endsWith("/getUpdates"))return Response.json({ok:true,result:[{message:{chat:{id:12345678,first_name:"Mock chat"}}}]});
      sends.push(JSON.parse(init.body));return Response.json({ok:true,result:{message_id:sends.length}});
    }
    assert.equal(init.headers.Cookie,undefined);assert.equal(init.headers.Authorization,undefined);
    return new Response(html);
  };
  const worker=createWorker(fetcher),tokens={alice:await jwt("alice"),bob:await jwt("bob")};
  const call=async(user,input,options={})=>{
    const request=new Request(options.url || "https://app.example.test/api/watch",{method:input?"POST":"GET",headers:{"cf-access-jwt-assertion":tokens[user],...(input?{"Content-Type":"application/json",Origin:"https://app.example.test"}:{}),...options.headers},...(input?{body:typeof input==="string"?input:JSON.stringify(input)}:{})});
    const response=await worker.fetch(request,env);return{response,body:await response.json()};
  };
  return {env,worker,call,sends,calls,fetcher,setHtml:value=>{html=value;},setFailure:value=>{telegramFailure=value;}};
}
const targetInput={action:"add",target:postUrl,threshold:5000,interval:20};
const mockToken=user=>`${user==="alice"?"123456789":"987654321"}:${"fake-test-token".repeat(3)}`;
async function connect(s,user="alice") {return s.call(user,{action:"settings",telegramToken:mockToken(user),telegramChatId:user==="alice"?"12345678":"87654321"});}

test("Access verifies signatures and audience; forged email headers are never an identity",async()=>{
  const auth=createAuthenticator(async()=>Response.json({keys:[jwk]})),env={ACCESS_TEAM_DOMAIN:issuer,ACCESS_AUD:aud};
  const request=token=>new Request("https://app.example.test/",{headers:token?{"cf-access-jwt-assertion":token,"cf-access-authenticated-user-email":"forged@example.test"}:{"cf-access-authenticated-user-email":"forged@example.test"}});
  assert.equal(await auth(request(),env),null);
  assert.deepEqual(await auth(request(await jwt()),env),{id:"access:alice",email:"alice@example.test",local:false});
  const signed=await jwt(),parts=signed.split(".");parts[1]=b64({...JSON.parse(Buffer.from(parts[1],"base64url")),sub:"bob"});
  assert.equal(await auth(request(parts.join(".")),env),null);
  for(const overrides of [{iss:"https://wrong.cloudflareaccess.com"},{aud:["b".repeat(64)]},{exp:0},{nbf:Math.floor(Date.now()/1000)+200},{type:"org"},{email:""}]) assert.equal(await auth(request(await jwt("alice",overrides)),env),null);
  assert.equal(await auth(request(await jwt("alice",{},{alg:"none"})),env),null);
});
test("Missing Access configuration fails closed; preview login cannot run on public HTTPS",async()=>{
  const auth=createAuthenticator();
  await assert.rejects(()=>auth(new Request("https://public.example.test"),{LOCAL_DEV:"true"}),/ACCESS_SETUP/);
  assert.equal((await auth(new Request("http://127.0.0.1:8791"),{LOCAL_DEV:"true"})).local,true);
  await assert.rejects(()=>auth(new Request("http://other.example.test"),{LOCAL_DEV:"true"}),/ACCESS_SETUP/);
});
test("Two users have isolated watches, posts and Telegram settings; tokens are encrypted and never returned",async()=>{
  const s=await setup();
  const a=await s.call("alice",targetInput),b=await s.call("bob",targetInput);
  assert.equal(a.response.status,200);assert.equal(b.body.watches.length,1);assert.notEqual(a.body.watches[0].id,b.body.watches[0].id);
  assert.equal((await connect(s)).response.status,200);await connect(s,"bob");
  const row=await s.env.DB.prepare("SELECT * FROM public_notification_settings WHERE owner=?").bind("access:alice").first();
  assert.notEqual(row.telegram_token_cipher,mockToken("alice"));assert.equal(await decryptToken(row.telegram_token_cipher,row.telegram_token_iv,encryption),mockToken("alice"));
  const result=await s.call("alice");assert.equal(result.body.watches.length,1);assert.equal(result.body.settings.chatId,"12345678");assert.ok(!JSON.stringify(result.body).includes(mockToken("alice")));assert.ok(!JSON.stringify(result.body).includes("cipher"));
  for(const action of ["scan","remove","update"]) {
    const result=await s.call("bob",{action,id:a.body.watches[0].id,...(action==="update"?{threshold:1,interval:10,enabled:false}:{})});assert.equal(result.response.status,404);
  }
  assert.equal((await s.call("alice")).body.watches.length,1);
});
test("CSRF, oversized bodies and strict interval/type validation are rejected",async()=>{
  const s=await setup();
  assert.equal((await s.call("alice",targetInput,{headers:{Origin:"https://attacker.example.test"}})).response.status,403);
  assert.equal((await s.call("alice",targetInput,{headers:{Origin:""}})).response.status,403);
  assert.equal((await s.call("alice",targetInput,{headers:{"Content-Type":"text/plain"}})).response.status,415);
  assert.equal((await s.call("alice",JSON.stringify({action:"add",target:"x".repeat(9000)}))).response.status,413);
  for(const interval of [19,"20",0])assert.equal((await s.call("alice",{...targetInput,interval})).response.status,400);
  for(const target of ["https://127.0.0.1/admin","https://threads.com.attacker.test/@sample.user","http://threads.com/@sample.user"])assert.equal((await s.call("alice",{...targetInput,target})).response.status,400);
  assert.equal((await s.call("alice",{...targetInput,owner:"bob"})).response.status,400);
});
test("10/20/30/60 minute updates persist; duplicate registrations are rejected",async()=>{
  const s=await setup(),added=await s.call("alice",targetInput),id=added.body.watches[0].id;
  assert.equal((await s.call("alice",targetInput)).response.status,409);
  for(const interval of [10,20,30,60]){
    const result=await s.call("alice",{action:"update",id,threshold:6000,interval,enabled:true});assert.equal(result.body.watches[0].interval_minutes,interval);
  }
});
test("Scanning stores exact views, sends threshold equality once and schedules the configured interval",async()=>{
  const s=await setup(),added=await s.call("alice",targetInput),id=added.body.watches[0].id;await connect(s);
  const started=Date.now(),result=await s.call("alice",{action:"scan",id});
  assert.equal(result.body.posts[0].views,5000);assert.equal(s.sends.length,1);assert.equal(s.sends[0].chat_id,"12345678");assert.ok(result.body.watches[0].next_check_at>=started+20*60000);
  assert.equal(result.body.deliveries[0].state,"sent");assert.equal((await s.call("alice",{action:"scan",id})).response.status,429);
  await s.env.DB.prepare("UPDATE public_watches SET last_scanned_at=NULL WHERE id=?").bind(id).run();
  await s.call("alice",{action:"scan",id});assert.equal(s.sends.length,1);
  await s.call("alice",{action:"update",id,threshold:8000,interval:20,enabled:true});s.setHtml(postHtml(9000));
  await s.env.DB.prepare("UPDATE public_watches SET last_scanned_at=NULL WHERE id=?").bind(id).run();await s.call("alice",{action:"scan",id});assert.equal(s.sends.length,2);
});
test("Invalid public data retains the last good count and private provider errors never expose tokens",async()=>{
  const s=await setup(),added=await s.call("alice",targetInput),id=added.body.watches[0].id;await connect(s);await s.call("alice",{action:"scan",id});
  s.setHtml(postHtml(123,"https://www.threads.com/@other.user/post/PostABC123"));await s.env.DB.prepare("UPDATE public_watches SET last_scanned_at=NULL WHERE id=?").bind(id).run();
  const failed=await s.call("alice",{action:"scan",id});assert.equal(failed.body.posts[0].views,5000);assert.ok(failed.body.posts[0].last_error);
  s.setFailure(true);const result=await s.call("alice",{action:"test"});assert.equal(result.response.status,400);assert.ok(!JSON.stringify(result.body).includes(mockToken("alice")));assert.ok(!JSON.stringify(result.body).includes("api.telegram.org"));
});
test("Recent chats discovery and test send use only the signed-in user's saved bot",async()=>{
  const s=await setup();await connect(s,"bob");
  assert.equal((await s.call("alice",{action:"test"})).response.status,400);
  const chats=await s.call("bob",{action:"telegram-chats",telegramToken:""});assert.equal(chats.body.chats[0].id,"12345678");
  await s.call("bob",{action:"test"});assert.equal(s.sends[0].chat_id,"87654321");
  await s.call("bob",{...targetInput,interval:30});await s.call("bob",{action:"disconnect"});
  const status=(await s.call("bob")).body;assert.equal(status.settings.configured,false);assert.equal(status.watches[0].enabled,0);
});
test("Server capacity is checked atomically and disabling a target frees its schedule",async()=>{
  const s=await setup();let first;
  for(let i=0;i<8;i++){const result=await s.call("alice",{action:"add",target:`sample.user${i}`,threshold:5000,interval:10});assert.equal(result.response.status,200);first ||= result.body.watches[0];}
  assert.equal((await s.call("bob",{...targetInput,interval:10})).response.status,400);
  await s.call("alice",{action:"update",id:first.id,threshold:5000,interval:10,enabled:false});
  assert.equal((await s.call("bob",{...targetInput,interval:10})).response.status,200);
});
test("Cron scans one due target, pausing suppresses notifications, and removal keeps other users intact",async()=>{
  const s=await setup();await connect(s);const a=(await s.call("alice",targetInput)).body.watches[0];const b=(await s.call("bob",targetInput)).body.watches[0];
  await scanDue(s.env,s.fetcher);assert.equal((await s.env.DB.prepare("SELECT count(*) AS n FROM public_watches WHERE last_scanned_at IS NOT NULL").first()).n,1);
  await s.call("alice",{action:"update",id:a.id,threshold:5000,interval:20,enabled:false});assert.equal((await s.call("alice",{action:"scan",id:a.id})).response.status,400);
  assert.equal((await s.call("alice",{action:"remove",id:a.id})).response.status,200);assert.equal((await s.call("bob")).body.watches[0].id,b.id);
});
test("Concurrent scans acquire only one lease; schemas bootstrap without resetting data",async()=>{
  const s=await setup(),a=(await s.call("alice",targetInput)).body.watches[0];await connect(s);
  const results=await Promise.all([scanWatch(s.env,a,s.fetcher),scanWatch(s.env,a,s.fetcher)]);assert.equal(results.filter(r=>r.busy).length,1);assert.equal(s.sends.length,1);
  await ensureDb(s.env.DB);assert.equal((await s.call("alice")).body.watches.length,1);
  assert.ok(schema.every(sql=>sql.startsWith("CREATE ")));
});
test("Slow request leases cover bounded scan deadlines, and interval edits during a scan control the next check",async()=>{
  const s=await setup(),a=(await s.call("alice",targetInput)).body.watches[0];await connect(s);let checked=false;
  const start=Date.now();
  await scanWatch(s.env,a,async(url,init)=>{
    if(String(url).startsWith("https://www.threads.com")){
      const row=await s.env.DB.prepare("SELECT locked_until FROM public_watches WHERE id=?").bind(a.id).first();assert.ok(row.locked_until>=start+14*60000);checked=true;
      await s.env.DB.prepare("UPDATE public_watches SET interval_minutes=10 WHERE id=?").bind(a.id).run();
    }
    return s.fetcher(url,init);
  });
  assert.equal(checked,true);const row=await s.env.DB.prepare("SELECT next_check_at FROM public_watches WHERE id=?").bind(a.id).first();assert.ok(row.next_check_at>=start+10*60000 && row.next_check_at<start+11*60000);
});
test("Personal deployment settings require an explicit account/database and never permit local auth",async()=>{
  const input={name:"threads-view-alerts",accountId:"1".repeat(32),databaseName:"my-alerts",databaseId:"11111111-1111-1111-1111-111111111111",teamDomain:issuer,aud};
  const config=await configure(input);assert.equal(config.account_id,input.accountId);assert.equal(config.preview_urls,false);
  assert.throws(()=>validateConfig({...config,vars:{...config.vars,LOCAL_DEV:"true"}}));
  assert.throws(()=>validateConfig({...config,account_id:""}));assert.throws(()=>validateConfig({...config,name:"unrelated-app"}));
  const frontend=await readFile(new URL("../public/app.js",import.meta.url),"utf8");assert.ok(!frontend.includes("innerHTML"));assert.ok(!frontend.includes("localStorage"));
});
test("Installation helper uploads a fresh encryption key, reuses its backup, and refuses to overwrite an existing key without backup",async()=>{
  const temp=await mkdtemp(join(tmpdir(),"threads-alerts-installer-"));
  try {
    await mkdir(join(temp,"scripts"));await mkdir(join(temp,"node_modules","wrangler","bin"),{recursive:true});
    for(const file of ["config.mjs","init-secret.mjs"])await copyFile(new URL(`../scripts/${file}`,import.meta.url),join(temp,"scripts",file));
    const config=await configure({name:"threads-view-alerts",accountId:"1".repeat(32),databaseName:"test-db",databaseId:"11111111-1111-1111-1111-111111111111",teamDomain:issuer,aud});
    await writeFile(join(temp,"wrangler.json"),JSON.stringify(config));
    await writeFile(join(temp,"package.json"),'{"type":"module"}');
    const fakeCli=`import {existsSync,readFileSync,writeFileSync} from 'node:fs';
const keyFile='.mock-server-key';
if(process.argv[3]==='list') process.stdout.write(JSON.stringify(existsSync(keyFile)?[{name:'TOKEN_ENCRYPTION_KEY'}]:[]));
else {let value='';for await(const chunk of process.stdin)value+=chunk;writeFileSync(keyFile,value.trim());process.stdout.write('registered\\n');}`;
    await writeFile(join(temp,"node_modules","wrangler","bin","wrangler.js"),fakeCli);
    const run=()=>spawnSync(process.execPath,[join(temp,"scripts","init-secret.mjs")],{cwd:temp,encoding:"utf8"});
    const first=run();assert.equal(first.status,0,first.stderr);
    const backup=(await readFile(join(temp,".setup","token-encryption-key.txt"),"utf8")).trim();assert.equal(Buffer.from(backup,"base64").length,32);assert.ok(!first.stdout.includes(backup));
    assert.equal(await readFile(join(temp,".mock-server-key"),"utf8"),backup);
    assert.equal(run().status,0);assert.equal(await readFile(join(temp,".mock-server-key"),"utf8"),backup);
    await rm(join(temp,".setup","token-encryption-key.txt"));const blocked=run();assert.equal(blocked.status,1);assert.ok(blocked.stderr.includes("새 키로 덮어쓰면"));assert.equal(await readFile(join(temp,".mock-server-key"),"utf8"),backup);
  } finally {
    // Check the resolved temporary target before any recursive removal on Windows.
    assert.equal(dirname(resolve(temp)),resolve(tmpdir()));assert.ok(basename(temp).startsWith("threads-alerts-installer-"));await rm(temp,{recursive:true,force:true});
  }
});
