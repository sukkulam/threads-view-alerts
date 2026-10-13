import {readFile,writeFile} from "node:fs/promises";
import {join,resolve} from "node:path";
import {createInterface} from "node:readline/promises";
import {fileURLToPath} from "node:url";
import {root,validateConfig} from "./config.mjs";
export async function configure(input) {
  const config=JSON.parse(await readFile(join(root,"wrangler.example.json"),"utf8"));
  config.name=input.name;config.account_id=input.accountId;
  config.d1_databases[0].database_name=input.databaseName;
  config.d1_databases[0].database_id=input.databaseId;
  config.vars.ACCESS_TEAM_DOMAIN=(input.teamDomain || "").trim().replace(/\/$/,"");
  config.vars.ACCESS_AUD=(input.aud || "").trim();
  if(!/^[a-zA-Z0-9_-]{1,64}$/.test(input.databaseName || "")) throw new Error("D1 이름을 확인하세요.");
  return validateConfig(config);
}
async function main() {
  let input;
  const argument=process.argv.indexOf("--input");
  if(argument>=0){input=JSON.parse(await readFile(resolve(process.argv[argument+1]),"utf8"));}
  else {
    let old={};try{old=JSON.parse(await readFile(join(root,"wrangler.json"),"utf8"));}catch{}
    const rl=createInterface({input:process.stdin,output:process.stdout});
    const ask=async(label,previous="")=>{const value=(await rl.question(`${label}${previous?` [${previous}]`:""}: `)).trim();return value || previous;};
    console.log("받는 사람 본인의 Cloudflare 계정에 설치합니다. 봇 토큰은 여기 입력하지 않습니다.");
    try {
      input={name:await ask("서버 이름",old.name || "threads-view-alerts"),accountId:await ask("본인 Cloudflare Account ID",old.account_id || ""),databaseName:await ask("새 D1 데이터베이스 이름",old.d1_databases?.[0]?.database_name || "threads-view-alerts-db"),databaseId:await ask("새 D1 Database ID",old.d1_databases?.[0]?.database_id || ""),teamDomain:await ask("Access 팀 도메인 (최초 배포 전이면 Enter)",old.vars?.ACCESS_TEAM_DOMAIN || ""),aud:await ask("Access Application Audience AUD (최초 배포 전이면 Enter)",old.vars?.ACCESS_AUD || "")};
    } finally {rl.close();}
  }
  const config=await configure(input);
  await writeFile(join(root,"wrangler.json"),JSON.stringify(config,null,2)+"\n");
  console.log("개인 설치 설정을 wrangler.json에 저장했습니다. 이 파일은 배포 ZIP에 포함하지 않습니다.");
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
