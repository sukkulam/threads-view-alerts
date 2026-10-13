import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
export const root=fileURLToPath(new URL("../",import.meta.url));
export function validateConfig(config) {
  if(!/^threads-view-alerts(?:-[a-z0-9-]{1,32})?$/.test(config.name || "")) throw new Error("서버 이름은 threads-view-alerts 또는 threads-view-alerts-개인명 형식이어야 합니다.");
  if(!/^[a-f0-9]{32}$/i.test(config.account_id || "")) throw new Error("본인 Cloudflare Account ID를 설정하세요.");
  const database=config.d1_databases?.[0];
  if(database?.binding!=="DB" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(database?.database_id || "") || database.database_id==="00000000-0000-0000-0000-000000000000") throw new Error("본인 계정에서 새로 만든 D1 Database ID를 설정하세요.");
  if(config.vars?.LOCAL_DEV || config.main!=="src/worker.mjs" || config.assets?.directory!=="public") throw new Error("운영 설정에 로컬 미리보기 옵션을 넣을 수 없습니다.");
  const team=config.vars?.ACCESS_TEAM_DOMAIN || "",aud=config.vars?.ACCESS_AUD || "";
  if((team && !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/i.test(team)) || (aud && !/^[a-f0-9]{32,128}$/i.test(aud)) || Boolean(team)!==Boolean(aud)) throw new Error("Access 팀 도메인과 AUD를 함께 설정하세요. 최초 배포 단계에서는 둘 다 비워둘 수 있습니다.");
  return config;
}
export async function readConfig(){return validateConfig(JSON.parse(await readFile(join(root,"wrangler.json"),"utf8")));}
export const cli=join(root,"node_modules","wrangler","bin","wrangler.js");
