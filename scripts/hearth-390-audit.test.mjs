import test from 'node:test';
import assert from 'node:assert/strict';
import {auditUi,auditCss,auditTsx} from './hearth-390-audit.mjs';
test('the 390px audit catches too-wide panels and under-44px buttons',()=>{
 assert.equal(auditCss('x.css','.a{width:420px}.b{max-width:420px;width:min(420px,100%)}').length,1);
 assert.equal(auditTsx('x.tsx','<button className="min-h-8 px-2">x</button><button className="min-h-11">y</button><div className="w-[480px]"/>').length,2);
});
test('every UI panel and button passes the 390x844 audit',()=>{
 const issues=auditUi();assert.deepEqual(issues,[],issues.map(i=>`${i.kind} ${i.px}px ${i.file}:${i.line??''} ${i.where}`).join('\n'));
});
