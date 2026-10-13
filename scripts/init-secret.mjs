import {readFile,writeFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
import {randomBytes} from "node:crypto";
import {execFileSync,spawn} from "node:child_process";
import {readConfig,root,cli} from "./config.mjs";
try {
  const config=await readConfig(),path=join(root,".setup","token-encryption-key.txt");
  const secrets=JSON.parse(execFileSync(process.execPath,[cli,"secret","list","--config","wrangler.json"],{cwd:root,encoding:"utf8",stdio:["ignore","pipe","pipe"]}));
  let key;try{key=(await readFile(path,"utf8")).trim();}catch{}
  if(!key && secrets.some(item=>item.name==="TOKEN_ENCRYPTION_KEY")) throw new Error("서버에 보관 키가 이미 있습니다. 원래 .setup/token-encryption-key.txt를 복원하세요. 새 키로 덮어쓰면 기존 봇 토큰을 읽지 못합니다.");
  if(!key){key=randomBytes(32).toString("base64");await mkdir(join(root,".setup"),{recursive:true});await writeFile(path,key+"\n",{mode:0o600,flag:"wx"});}
  if(!/^[A-Za-z0-9+/]{43}=$/.test(key) || Buffer.from(key,"base64").length!==32) throw new Error("보관 키 백업 파일을 확인하세요.");
  console.log(`알림 보관 키 설정: ${config.name} / ${config.account_id}. 키의 실제 값은 출력하지 않습니다.`);
  const child=spawn(process.execPath,[cli,"secret","put","TOKEN_ENCRYPTION_KEY","--config","wrangler.json"],{cwd:root,stdio:["pipe","inherit","inherit"]});
  child.stdin.end(key+"\n");
  child.stdin.on("error",()=>{console.error("키를 전달하지 못했습니다. 로컬 키 백업을 유지했습니다.");process.exitCode=1;});
  child.on("error",()=>{console.error("키 등록을 완료하지 못했습니다. 로컬 키 백업은 유지했습니다.");process.exitCode=1;});
  child.on("exit",code=>{process.exitCode=code ?? 1;if(code===0)console.log("설정 완료. .setup 폴더는 본인만 보관하고 다른 사람에게 보내지 마세요.");});
}catch(error){console.error(error.message?.includes("Command failed")?"서버를 먼저 배포하고 본인 계정으로 wrangler login을 완료하세요.":error.message);process.exitCode=1;}
