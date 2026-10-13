import {readFile,readdir,writeFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {root} from "./config.mjs";

// ZIP store format with UTF-8 names. Only the explicitly allowed source tree is packaged.
const dirs=["src","public","scripts","tests"];
const files=["package.json","README.md","BEGINNER-GUIDE.md","AGENTS.md","AI-INSTALL.md","LICENSE","START-HERE.html","wrangler.example.json","wrangler.local.json",".gitignore",".gitattributes"];
const optional=["package-lock.json"];
async function walk(dir){for(const entry of await readdir(join(root,dir),{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory())await walk(path);else if(entry.isFile() && !entry.name.startsWith("."))files.push(path);}}
for(const dir of dirs)await walk(dir);
for(const name of optional){try{await readFile(join(root,name));files.push(name);}catch{}}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
const records=[],central=[];let offset=0;
for(const file of files.sort()) {
  const data=await readFile(join(root,file)),text=data.toString("utf8");
  if(/sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|\b\d{8,20}:[A-Za-z0-9_-]{30,150}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))throw new Error(`보안 검사 실패: ${file}. 비밀 값은 출력하지 않습니다.`);
  if(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i.test(text))throw new Error(`실제 서버 주소가 포함된 파일: ${file}`);
  const name=Buffer.from(`threads-view-alerts/${file}`),crc=crc32(data),local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(name.length,26);
  records.push(local,name,data);
  const index=Buffer.alloc(46);index.writeUInt32LE(0x02014b50);index.writeUInt16LE(20,4);index.writeUInt16LE(20,6);index.writeUInt16LE(0x800,8);index.writeUInt16LE(33,14);index.writeUInt32LE(crc,16);index.writeUInt32LE(data.length,20);index.writeUInt32LE(data.length,24);index.writeUInt16LE(name.length,28);index.writeUInt32LE(offset,42);central.push(index,name);offset+=local.length+name.length+data.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...records,directory,end]);
const version=JSON.parse(await readFile(join(root,"package.json"),"utf8")).version;
await mkdir(join(root,"releases"),{recursive:true});
const name=`threads-view-alerts-v${version}.zip`;
await writeFile(join(root,"releases",name),zip);
await writeFile(join(root,"releases",`${name}.sha256`),createHash("sha256").update(zip).digest("hex")+`  ${name}\n`);
console.log(`개인 정보 없는 배포판: releases/${name} (${files.length}개 파일, ${zip.length} bytes)`);
