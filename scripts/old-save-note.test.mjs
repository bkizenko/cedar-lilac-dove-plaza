import test from 'node:test';import assert from 'node:assert/strict';
const {oldSaveNote}=await import('../src/ui/hearth/oldSaveNote.ts');
test('old saves list what starts fresh; current villages show nothing',()=>{
 assert.equal(oldSaveNote({rulersVersion:2}),null);
 const n=oldSaveNote(undefined);assert.match(n.items[0],/Rulers/);assert.match(n.items.at(-1),/unchanged/);
 assert.ok(oldSaveNote({}));assert.match(oldSaveNote({rulersVersion:1}).items[0],/Neighbouring/);
});
