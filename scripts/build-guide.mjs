import {readFile,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {root} from "./config.mjs";
const escape=value=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
function inline(value){return escape(value).replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/`([^`]+)`/g,"<code>$1</code>");}
const markdown=await readFile(join(root,"README.md"),"utf8");
let html="",code=false,list="",paragraph=[];
function closeParagraph(){if(paragraph.length){html+=`<p>${inline(paragraph.join(" "))}</p>\n`;paragraph=[];}}
function closeList(){if(list){html+=`</${list}>\n`;list="";}}
for(const line of markdown.split(/\r?\n/)) {
  if(line.startsWith("```")){closeParagraph();closeList();html+=code?"</code></pre>\n":"<pre><code>";code=!code;continue;}
  if(code){html+=escape(line)+"\n";continue;}
  if(!line.trim()){closeParagraph();closeList();continue;}
  const heading=line.match(/^(#{1,3}) (.*)/),item=line.match(/^(?:- |(\d+)\. )(.*)/);
  if(heading){closeParagraph();closeList();html+=`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>\n`;}
  else if(item){closeParagraph();const type=item[1]?"ol":"ul";if(list!==type){closeList();list=type;html+=`<${type}${item[1]?` start="${Number(item[1])}"`:""}>\n`;}html+=`<li>${inline(item[2])}</li>\n`;}
  else {closeList();paragraph.push(line);}
}
closeParagraph();closeList();
const document=css=>`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>개인 서버 설치 설명서 · Threads 조회수 알림</title><link rel="stylesheet" href="${css}"></head><body><main class="guide"><section class="panel">${html}</section></main></body></html>\n`;
await writeFile(join(root,"START-HERE.html"),document("public/style.css"));
await writeFile(join(root,"public","help.html"),document("/style.css"));
console.log("읽기 쉬운 설치 설명서 2개를 갱신했습니다.");
