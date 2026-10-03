import assert from "node:assert/strict"
import { test } from "node:test"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { reviewUi, validateReview, RULES, ReviewInputError } from "../src/index.ts"

const complete = (content: string) => reviewUi({ files: [{ path: "App.tsx", content, labelContext: "complete" }], scope: ["a11y"] })

for (const source of [
  '<button ref={assignName}/>', '<div ref={assignName}><input/></div>',
  '<button style={style}/>', '<div style={style}><input/></div>',
  '<button style={{display: visible ? "block" : "none"}}/>',
  '<button style={{display:"none",...style}}/>', '<button style={{display:"none",[key]:"block"}}/>',
  '<button className="hidden"/>', '<div className="md:hidden"><input/></div>',
  '<button style={{visibility:"hidden"}}/>', '<div style={{contentVisibility:"hidden"}}><input/></div>',
  '<div style={{visibility:"hidden"}}><button style={{visibility:"visible"}}/></div>',
  '<button style={{contentVisibility:"collapse"}}/>',
  '<div data-template={<button/>}/>', '<div data-template={<section><input/></section>}/>',
  '<input type="submit" value=""/>', '<input type="reset" value=""/>',
]) test(`unresolved authored rendering remains unknown with complete labels: ${source}`, () => {
  const result = complete(source)
  assert.equal(result.findings.length, 0)
  assert.ok(result.unknowns.some(item => item.rule.startsWith("L2B-A11Y")))
  assert.equal(result.truncated, false)
})

for (const source of [
  '<button style={{display:"none"}}/>', '<div style={{display:"none"}}><button/></div>',
]) test(`literal inline hiding does not create an accessibility defect: ${source}`, () => {
  const result = complete(source)
  assert.deepEqual(result.findings, [])
  assert.deepEqual(result.unknowns, [])
})

test("production request, result, scopes, severity and source size stay compatible", () => {
  const request = validateReview({ files: [{ path: "App.tsx", content: "<button/>" }] })
  assert.equal(request.files[0].labelContext, undefined)
  const partial = reviewUi(request)
  assert.equal(partial.findings.length, 0); assert.ok(partial.unknowns.length)
  assert.equal(complete("<button/>").summary.errors, 1)
  assert.ok("disabledRules" in partial && "assumptions" in partial && "truncated" in partial)
  assert.equal("engineVersion" in partial, false)
  assert.equal("limitations" in partial, false)
  const tokens = reviewUi({ files: [{path:"App.tsx",content:'<div className="text-red-500"/>'}], scope:["tokens"], policy:{semanticColors:true} })
  assert.equal(tokens.findings[0].severity,"error")
  assert.deepEqual(tokens.evaluatedRules,["L2B-TOK-001"])
  assert.equal(tokens.disabledRules.length,3)
  const large = reviewUi({ files:[{path:"large.tsx",content:'const text="'+"a".repeat(200000)+'";'}] })
  assert.equal(large.truncated,false); assert.deepEqual(large.unknowns,[])
  assert.ok(RULES["L2B-A11Y-001"])
  assert.throws(()=>validateReview({files:[]}),ReviewInputError)
})

test("source comment suppressions preserve positions, semantics and bounded overflow", () => {
  for (const newline of ["\n","\r","\r\n","\u2028","\u2029"]) {
    const content='/* logic2b-review-disable-next-line L2B-A11Y-003 -- reviewed external naming'+newline+' */'+newline+'<button/>'
    const result=complete(content)
    assert.equal(result.suppressed.length,1)
    assert.equal(result.suppressed[0].finding.line,3)
    assert.equal(result.summary.errors,0)
  }
  const overflow=complete(Array.from({length:129},()=> '// logic2b-review-disable-next-line L2B-A11Y-003 -- reviewed naming exception\n<button/>;').join('\n'))
  assert.equal(overflow.truncated,true); assert.equal(overflow.suppressed.length,0); assert.equal(overflow.findings.length,129)
})

test("AST depth is bounded without treating incomplete analysis as a pass", () => {
  const result=complete('const App=()=> '+'<div>'.repeat(300)+'<button/>'+'</div>'.repeat(300))
  assert.equal(result.truncated,true)
  assert.deepEqual(result.findings,[]); assert.deepEqual(result.evaluatedRules,[])
  assert.ok(result.unknowns.some(item=>item.rule==='parse' && item.reason.includes('depth budget')))
})

test("shared analysis work, repeated attributes and ancestor scans stay bounded in an isolated process", () => {
  const script=String.raw`
    import assert from 'node:assert/strict';
    import {reviewUi} from './src/index.ts';
    const file=(path,content)=>({path,content,labelContext:'complete'});
    const label='<span id="name">'+'<span>Name</span>'.repeat(200)+'</span>';
    const source='<><button/><div className="text-red-500"/>'+label+'<button aria-labelledby="name"/>'.repeat(800)+'</>';
    const one=reviewUi({files:[file('one.tsx',source)],policy:{semanticColors:true}});
    assert.equal(one.truncated,true); assert.deepEqual(one.findings,[]); assert.deepEqual(one.evaluatedRules,[]);
    assert.ok(one.unknowns.some(x=>x.rule==='parse'&&x.reason.includes('work budget')));
    const small='<>'+label+'<button aria-labelledby="name"/>'.repeat(100)+'</>';
    const batch=reviewUi({files:Array.from({length:8},(_,i)=>file('batch'+i+'.tsx',small))});
    assert.equal(batch.truncated,true); assert.equal(batch.findings.length,0);
    assert.ok(batch.unknowns.some(x=>x.reason.includes('Shared static analysis work budget')));
    const attrs=reviewUi({files:[file('attrs.tsx','const App=()=> <div '+'a '.repeat(60000)+'/>')]});
    assert.equal(attrs.truncated,true); assert.equal(attrs.findings.length,0);
    const deep='const App=()=> '+'<a>'.repeat(200)+'<b/>'.repeat(10000)+'</a>'.repeat(200);
    assert.equal(reviewUi({files:[file('deep.tsx',deep)]}).findings.length,0);
    const tag='a'.repeat(32000);
    assert.equal(reviewUi({files:[file('tag.tsx','const App=()=> <'+tag+'>'+'<b/>'.repeat(15000)+'</'+tag+'>')]}).findings.length,0);
    const suppressions=Array(1500).fill('// logic2b-review-disable-next-line L2B-TOK-001 -- intentional brand exception\n').join('');
    const comments=reviewUi({files:[file('comments.tsx',suppressions+'<div className="text-red-500"/>')],policy:{semanticColors:true}});
    assert.equal(comments.truncated,true); assert.equal(comments.findings.length,1); assert.equal(comments.suppressed.length,0);
  `
  const child=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',script],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',timeout:5000})
  assert.equal(child.error,undefined,String(child.error)); assert.equal(child.status,0,child.stderr)
})
