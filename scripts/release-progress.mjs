import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),path=resolve(root,'docs/RELEASE_PROGRESS.json'),data=JSON.parse(readFileSync(path,'utf8'));
const gates=data.gates,ids=new Set();if(!Array.isArray(gates)||gates.length!==data.method.denominator)throw Error('Progress denominator changed without a new baseline');
const status=['verified','pending','unverified','partial'];
for(const g of gates){
 if(!g.id||ids.has(g.id)||!status.includes(g.status)||g.credit!==(g.status==='verified'?1:0))throw Error(`Invalid gate/credit: ${g.id}`);ids.add(g.id);
 if(g.status==='verified'&&!g.evidence.length)throw Error(`Missing verification evidence: ${g.id}`);
 for(const id of g.evidence){const e=data.evidenceSources[id];if(!e||!existsSync(resolve(root,e.path)))throw Error(`Missing evidence artifact ${g.id}/${id}`);}
}
for(const path of data.scopeSources)if(!existsSync(resolve(root,path)))throw Error(`Missing scope source: ${path}`);
const count=rows=>({verifiedGates:rows.filter(g=>g.status==='verified').length,totalGates:rows.length,verifiedGatePercent:Number((rows.filter(g=>g.status==='verified').length/rows.length*100).toFixed(2))});
data.overall=count(gates);for(const milestone of Object.keys(data.milestones))data.milestones[milestone]=count(gates.filter(g=>g.milestone===milestone));
writeFileSync(path,JSON.stringify(data,null,2)+'\n');
const out=[`# First-release acceptance progress`,``,`Baseline **${data.baselineId}** (${data.baselineState}) · ${data.auditDate} · desktop only.`,``,`**${data.overall.verifiedGates}/${data.overall.totalGates} verified gates — ${data.overall.verifiedGatePercent}%.** This measures acceptance evidence, not development effort or time remaining.`,``,`Verified baseline: ${data.verifiedPublishedCodeBaseline}. Unpublished map/conflict integration earns no credit. Partial/unverified/pending gates earn zero; source files and test definitions alone are not passed evidence.`,``,'## Milestone counts','',`| Milestone | Verified / total | Verified checks |`,`| --- | ---: | ---: |`,...Object.entries(data.milestones).map(([k,v])=>`| ${k} | ${v.verifiedGates}/${v.totalGates} | ${v.verifiedGatePercent}% |`),``,'## Fixed acceptance checklist',''];
for(const milestone of Object.keys(data.milestones)){
 out.push(`### ${milestone}`,'','| Gate | Status | Acceptance | Evidence / limitation |','| --- | --- | --- | --- |');
 for(const g of gates.filter(g=>g.milestone===milestone))out.push(`| ${g.id} | ${g.status} | ${g.acceptance.replaceAll('|','/')} | ${(g.evidence.join(', ')||'No matching executed evidence')}. ${g.remainingNotes.replaceAll('|','/')} |`);out.push('');
}
out.push('## Scope and counting rules','','Every gate has equal weight. Regressions revoke credit. Changing scope/denominator requires a documented new baseline version. Each batch/push reports batch passed/total separately from this full release checklist. The complete catalogue mapping, evidence scopes, preservation requirements and deferred expansion scope are retained in the JSON ledger; deferred expansions are not counted as delivered.');
writeFileSync(resolve(root,'docs/RELEASE_PROGRESS.md'),out.join('\n')+'\n');console.log(`${data.baselineId}: ${data.overall.verifiedGates}/${data.overall.totalGates} verified (${data.overall.verifiedGatePercent}%).`);
