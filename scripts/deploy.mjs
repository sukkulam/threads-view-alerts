import {spawn} from "node:child_process";
import {readConfig,root,cli} from "./config.mjs";
try {
  const config=await readConfig();
  console.log(`배포 대상: ${config.name} / 본인 Cloudflare Account ID ${config.account_id}`);
  const child=spawn(process.execPath,[cli,"deploy","--config","wrangler.json","--keep-vars"],{cwd:root,stdio:"inherit"});
  child.on("error",()=>{console.error("npm install을 완료한 뒤 다시 시도하세요.");process.exitCode=1;});
  child.on("exit",code=>{process.exitCode=code ?? 1;});
}catch(error){console.error(error.message);process.exitCode=1;}
