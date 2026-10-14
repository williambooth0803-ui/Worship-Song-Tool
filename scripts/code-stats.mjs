import {execFileSync} from "node:child_process";
import {lstat,readFile,writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";

const project=fileURLToPath(new URL("../",import.meta.url));
const codeExtensions=new Set([".js",".mjs",".cjs",".ts",".tsx",".jsx",".css",".html",".sql",".sh"]);
const number=value=>value.toLocaleString("en-US");

export async function reportCodeStats() {
  const names=[...new Set(execFileSync("git",["ls-files","--cached","--others","--exclude-standard","-z"],{cwd:project,encoding:"utf8"}).split("\0").filter(name=>codeExtensions.has(path.extname(name))))];
  const groups={source:{files:0,lines:0},checks:{files:0,lines:0},generated:{files:0,lines:0}};
  for(const name of names){
    const file=path.join(project,name);
    let stat;try{stat=await lstat(file);}catch(error){if(error.code==="ENOENT")continue;throw error;}
    if(!stat.isFile())continue;
    const content=await readFile(file,"utf8");
    const lines=content?content.split(/\r\n|\r|\n/).length-Number(/[\r\n]$/.test(content)):0;
    const group=name.startsWith("docs/")?"generated":name.startsWith("test/")||name.startsWith("scripts/")&&/(?:fixture|smoke|regression|disclosure)/.test(path.basename(name))?"checks":"source";
    groups[group].files++;groups[group].lines+=lines;
  }
  const total=groups.source.lines+groups.checks.lines;
  const report=`# Running code total

**${number(total)} lines of source and checks** across ${number(groups.source.files+groups.checks.files)} files.

| Scope | Files | Lines |
| --- | ---: | ---: |
| App, backend and support scripts | ${groups.source.files} | ${number(groups.source.lines)} |
| Tests and browser checks | ${groups.checks.files} | ${number(groups.checks.lines)} |
| **Source and checks total** | **${groups.source.files+groups.checks.files}** | **${number(total)}** |
| Generated website copy (excluded above) | ${groups.generated.files} | ${number(groups.generated.lines)} |
| All code including generated website | ${groups.source.files+groups.checks.files+groups.generated.files} | ${number(total+groups.generated.lines)} |

Run \`npm run code:count\` to refresh this file. Site builds refresh it automatically.
Counts physical lines, including comments and blank lines, in repository code files;
ignores dependencies, Git-ignored files, Markdown, JSON/configuration data and images.
Generated \`docs/\` files are shown separately so the website copy does not double
the main total. Checked-in catalog data inside JavaScript counts as part of its file.

This measures the current working tree. Codex's native top-right interface cannot
be customized from this repository; the count is available here and in progress updates.
`;
  await writeFile(path.join(project,"CODE-STATS.md"),report);
  console.log(`Code total: ${number(total)} lines (source + checks; generated website excluded).`);
  return {total,...groups};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await reportCodeStats();
