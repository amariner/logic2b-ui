import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'
import { spawnSync } from 'node:child_process'
import { reviewUi, validateReviewRequest, REVIEW_RULES, REVIEW_INPUT_SCHEMA, REVIEW_RESULT_SCHEMA, type ReviewRequest } from '../src/index.ts'
const request = (content: string, extra: Partial<ReviewRequest> = {}): ReviewRequest => ({ schemaVersion: 1, files: [{ path: 'src/example.tsx', content }], ...extra })
const review = (content: string, extra: Partial<ReviewRequest> = {}) => reviewUi(request(content, extra))
const errors = (content: string) => review(content).summary.errors

test('native empty dialog, control and button produce stable proof-backed findings', () => {
  const result = review('export const App = () => <><dialog/><input/><button/></>')
  assert.equal(result.summary.errors, 3)
  assert.deepEqual(result.findings.map(item => item.rule), ['L2B-A11Y-001', 'L2B-A11Y-002', 'L2B-A11Y-003'])
  assert.ok(result.findings.every(item => item.category === 'defect' && item.confidence === 'high' && item.evidence.length > 0 && item.line === 1 && item.column > 1))
  assert.ok(result.findings.every(item => item.docs.startsWith('https://ui.logic2b.com/docs/review#')))
  assert.deepEqual(result.evaluatedRules, ['L2B-A11Y-001', 'L2B-A11Y-002', 'L2B-A11Y-003'])
  assert.equal('score' in result, false)
})
const good = [
  '<dialog aria-label="Settings"/>',
  '<div role="dialog" aria-label="Settings"/>',
  '<><h2 id="title">Settings</h2><dialog aria-labelledby="title"/></>',
  '<><label htmlFor="email">Email</label><input id="email"/></>',
  '<label>Email<input/></label>',
  '<label htmlFor={null}>Email<input/></label>', '<label htmlFor={false}>Email<input/></label>',
  '<label><span>Email</span><span><input/></span></label>',
  '<label><span aria-label="Email"><input/></span></label>',
  '<label><span title="Email"/><input/></label>',
  '<input aria-label="Email"/>',
  '<input title="Email"/>',
  '<input type="hidden"/>',
  '<input type="submit"/>',
  '<input type="SUBMIT"/>', '<input type="RESET"/>', '<input type="IMAGE" alt="Save"/>',
  '<input type="reset"/>',
  '<input type="button" value="Save"/>',
  '<input type="image" alt="Save"/>',
  '<output/>', '<meter/>', '<progress/>',
  '<button>Save</button>',
  '<button><span className="sr-only">Save</span><svg aria-hidden="true"/></button>',
  '<button aria-label="Save"><Icon/></button>',
  '<button><img alt="Save"/></button>',
  '<button title="Save"/>',
  '<button><span title="Save"/></button>', '<button><abbr title="Save"/></button>',
  '<label>Save<button/></label>',
  '<><label htmlFor="save">Save</label><button id="save"/></>',
  '<button>{`Save`}</button>',
  '<button>{42}</button>',
  '<button hidden/>',
  '<template><button/></template>',
  '<div aria-hidden="true"><button/></div>',
  '<div style={{ display: "none" }}><input/></div>',
  '<button><span aria-hidden="true"/><span>Save</span></button>',
  '<><span hidden id="label">Email</span><input aria-labelledby="label"/></>',
]
for (const markup of good) test(`valid static naming: ${markup}`, () => assert.equal(errors(`const App=()=>${markup}`), 0))
const unknown = [
  '<Button/>', '<Input/>', '<DialogContent/>', '<button {...props}/>', '<input {...props}/>',
  '<button>{children}</button>', '<button><Icon/></button>', '<input id="external-label"/>',
  '<button id="external-label"/>', '<button aria-labelledby="external"/>', '<button aria-label={label}/>',
  '<button aria-label={false}/>', '<button aria-labelledby={false}/>',
  '<Wrapper><input/></Wrapper>', '<input type={kind}/>', '<div role={role}/>', '<input placeholder="Email"/>',
  '<textarea placeholder="Message"/>', '<input aria-placeholder="Email"/>', '<input type="submit" value=""/>', '<input type="reset" value={value}/>',
  '<button dangerouslySetInnerHTML={{__html:"Save"}}/>', '<button children="Save"/>',
  '<button ref={assignName}/>', '<div ref={assignName}><input/></div>', '<button role="none"/>',
  '<><label htmlFor={1}>Email</label><input id={1}/></>', '<div data-template={<button/>}/>',
  '<label dangerouslySetInnerHTML={{__html:"Email"}}><input/></label>', '<button className="hidden"/>',
  '<><span id="x">Save</span><span id="x"/><button aria-labelledby="x"/></>',
  '<button style={style}/>', '<button hidden={hidden}/>',
  '<label>{condition && <span>Email</span>}<input/></label>',
  '<label>Email{condition && <input/>}</label>',
  '<label><Input/><input/></label>',
  '<><label htmlFor="x"/><input id="x"/></>',
  '<><label htmlFor={id}>Email</label><input/></>',
  '<><span id="x">{label}</span><button aria-labelledby="x"/></>',
  '<><span id="x" aria-labelledby="y"/><span id="y" aria-labelledby="x"/><button aria-labelledby="x"/></>',
]
for (const markup of unknown) test(`unresolved naming stays unknown: ${markup}`, () => {
  const result = review(`const App=()=>${markup}`)
  assert.equal(result.summary.errors, 0)
  assert.ok(result.unknowns.length > 0)
})
const bad = [
  '<button/>', '<button aria-label=" "/>', '<button>{false}{null}</button>',
  '<button><span aria-hidden="true">Save</span></button>',
  '<button><svg aria-hidden="true"/></button>', '<label><input/></label>',
  '<label htmlFor="different">Email<input/></label>', '<dialog><h2>Settings</h2></dialog>',
  '<button><span hidden>Save</span></button>', '<button><span style={{visibility:"hidden"}}>Save</span></button>',
  '<><span id="empty"/><button aria-labelledby="empty" aria-label="Save"/></>',
]
for (const markup of bad) test(`proved missing name: ${markup}`, () => assert.equal(errors(`const App=()=>${markup}`), 1))

test('separate JSX render scopes never provide false label proof', () => {
  const result = review('function A(){return <label htmlFor="x">Email</label>} function B(){return <input id="x"/>}')
  assert.equal(result.summary.errors, 0); assert.equal(result.unknowns.length, 1)
  const mapped = review('const A=()=> <>{items.map(x=><label htmlFor="x">Email</label>)}<input id="x"/></>')
  assert.equal(mapped.summary.errors, 0); assert.equal(mapped.unknowns.length, 1)
})
test('cross-file labels remain explicitly unresolved', () => {
  const result = reviewUi({ schemaVersion: 1, files: [{path:'a.tsx',content:'const A=()=> <label htmlFor="x">Email</label>'},{path:'b.tsx',content:'const B=()=> <input id="x"/>'}] })
  assert.equal(result.summary.errors, 0); assert.equal(result.unknowns[0].file, 'b.tsx')
})
test('comments and strings containing markup are not JSX', () => {
  const result = review('/* <button/> */ const text="<input/>"; const regex=/<dialog>/;')
  assert.equal(result.summary.errors, 0); assert.equal(result.unknowns.length, 0)
})
test('source never executes imports, callbacks, globals, filesystem or network code', () => {
  const globalName = '__reviewSourceExecuted'
  const source = `import 'node:fs'; globalThis.${globalName}=true; fetch('https://example.invalid/private'); throw new Error('PRIVATE_SOURCE'); export default <button/>`
  assert.equal(review(source).summary.errors, 1)
  assert.equal((globalThis as Record<string, unknown>)[globalName], undefined)
})
test('syntax errors and excessive parser nesting produce bounded non-echoing unknowns', () => {
  for (const content of ['const PRIVATE_TOKEN = <button', `const x=${'('.repeat(10000)}1${')'.repeat(10000)}`, `const values=[${'0,'.repeat(60000)}]`, `const A=()=>${'<div>'.repeat(300)}<button/>${'</div>'.repeat(300)}`]) {
    const result = review(content)
    assert.equal(result.summary.errors, 0); assert.equal(result.unknowns.length, 3)
    assert.ok(result.unknowns.every(item => item.reason.includes('complexity')))
    assert.ok(!JSON.stringify(result).includes('PRIVATE_TOKEN'))
  }
})
test('long local naming-reference chains stop without recursive exhaustion', () => {
  const labels = Array.from({length:300}, (_,i)=>`<span id="name${i}" aria-labelledby="name${i+1}"/>`).join('')
  const result = review(`const App=()=> <>${labels}<span id="name300">Save</span><button aria-labelledby="name0"/></>`)
  assert.equal(result.summary.errors,0); assert.equal(result.unknowns.length,1)
})
test('branching name graphs and repeated parser attributes have bounded work in a timed child', () => {
  const script = `
    import assert from 'node:assert/strict';
    import {reviewUi} from './src/index.ts';
    for (const duplicate of [true,false]) {
      const count=30;
      const labels=Array.from({length:count},(_,i)=>i>=count-2 ? '<span id="n'+i+'">Name</span>' : '<span id="n'+i+'" aria-labelledby="n'+(i+1)+' n'+(i+(duplicate?1:2))+'"/>').join('');
      const result=reviewUi({schemaVersion:1,files:[{path:'graph.tsx',content:'const App=()=> <><button/><button aria-labelledby="n0"/>'+labels+'</>'}]});
      assert.equal(result.summary.errors,0); assert.equal(result.findings.length,0);
      assert.equal(result.unknowns.length,3); assert.ok(result.unknowns.every(x=>x.reason.includes('work budget')));
      if (duplicate) {
        const files=Array.from({length:64},(_,i)=>({path:'graph'+i+'.tsx',content:'const App=()=> <><button aria-labelledby="n0"/>'+labels+'</>'}));
        const batch=reviewUi({schemaVersion:1,files});
        assert.equal(batch.findings.length,0); assert.equal(batch.unknowns.length,64*3);
        assert.ok(batch.unknowns.every(x=>x.reason.includes('work budget')));
      }
    }
    const result=reviewUi({schemaVersion:1,files:[{path:'attributes.tsx',content:'const App=()=> <div '+'a '.repeat(60000)+'/>'}]});
    assert.equal(result.findings.length,0); assert.equal(result.unknowns.length,3);
    const deep='const App=()=> '+'<a>'.repeat(200)+'<b/>'.repeat(15000)+'</a>'.repeat(200);
    const deepResult=reviewUi({schemaVersion:1,files:Array.from({length:4},(_,i)=>({path:'deep'+i+'.tsx',content:deep}))});
    assert.equal(deepResult.findings.length,0); assert.equal(deepResult.unknowns.length,0);
    const tag='a'.repeat(32000);
    const longTag=reviewUi({schemaVersion:1,files:[{path:'tag.tsx',content:'const App=()=> <'+tag+'>'+'<b/>'.repeat(15000)+'</'+tag+'>'}]});
    assert.equal(longTag.findings.length,0); assert.equal(longTag.unknowns.length,0);
  `
  const child = spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',script],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8',timeout:5000})
  assert.equal(child.error,undefined, String(child.error)); assert.equal(child.status,0,child.stderr)
})
test('JSX uses the JSX parser and TSX uses type syntax without evaluating', () => {
  const result = reviewUi({ schemaVersion: 1, files: [{path:'typed.tsx',content:'const App: React.FC<{x:string}> = () => <button/>'},{path:'plain.jsx',content:'const App = () => <input/>'}] })
  assert.equal(result.summary.errors, 2)
})
test('semantic color policy is opt-in and a warning rather than a universal defect', () => {
  const source = 'const A=()=> <button className="text-red-500 bg-[#123456]" style={{color:"rgb(1 2 3)"}}>Save</button>'
  assert.equal(review(source).findings.length, 0)
  assert.equal(review(source, { policy: {semanticColors:false} }).findings.length, 0)
  const result = review(source, {policy:{semanticColors:true}})
  assert.equal(result.summary.warnings, 1); assert.equal(result.summary.errors, 0)
  assert.equal(result.findings[0].category, 'design-policy')
  assert.equal(result.evaluatedRules.at(-1), 'L2B-TOK-001')
})
for (const attrs of ['className="bg-primary text-muted-foreground"', 'style={{color:"var(--primary)"}}', 'className="text-[length:20px]"']) test(`semantic colors accepted: ${attrs}`, () => {
  assert.equal(review(`const A=()=> <div ${attrs}/>`, {policy:{semanticColors:true}}).findings.length, 0)
})
for (const attrs of ['className={cn("text-red-500")}', 'style={{color:"red",...style}}', 'style={{color:"red",color:"var(--x)"}}', 'className="text-red-500" {...props}', 'style={{[key]:"red"}}', 'style={{background:"url(#fff)"}}']) test(`dynamic color policy stays unknown: ${attrs}`, () => {
  const result = review(`const A=()=> <div ${attrs}/>`, {policy:{semanticColors:true}})
  assert.equal(result.summary.warnings, 0); assert.ok(result.unknowns.some(item=>item.rule==='L2B-TOK-001'))
})
test('reasoned suppressions retain full evidence and exclude findings from summary', () => {
  const result = review('const App=()=> <button/>', {suppressions:[{file:'src/example.tsx',rule:'L2B-A11Y-003',line:1,reason:'Runtime wrapper supplies the accessible name.'}]})
  assert.equal(result.findings.length, 0); assert.equal(result.summary.errors, 0)
  assert.equal(result.suppressed[0].finding.rule, 'L2B-A11Y-003')
  assert.equal(result.suppressed[0].reason, 'Runtime wrapper supplies the accessible name.')
})
test('request rejects unsafe paths, case collisions, invalid types and unknown fields', () => {
  for (const path of ['/etc/passwd.tsx','../a.tsx','a/../b.tsx','a//b.tsx','./a.tsx','a\\b.tsx','C:/a.tsx','a\n.tsx','x.ts','a/'.repeat(129)+'x.tsx']) assert.throws(()=>validateReviewRequest({schemaVersion:1,files:[{path,content:''}]}), /paths/)
  for (const input of [null, [], {}, {...request(''),schemaVersion:2},{...request(''),extra:true},request('',{policy:{semanticColors:'true'} as never}),{schemaVersion:1,files:[]},{schemaVersion:1,files:[{path:'x.tsx',content:3}]},{schemaVersion:1,files:[{path:'x.tsx',content:'',extra:true}]}]) assert.throws(()=>validateReviewRequest(input))
  assert.throws(()=>reviewUi({schemaVersion:1,files:[{path:'A.tsx',content:''},{path:'a.tsx',content:''}]}), /collisions/)
})
test('UTF-8 byte limits, per-file count and output count are enforced independently', () => {
  assert.throws(()=>review('//'+ 'é'.repeat(65536)), /128 KiB/)
  assert.throws(()=>reviewUi({schemaVersion:1,files:Array.from({length:3},(_,i)=>({path:`${i}.tsx`,content:' '.repeat(100000)}))}), /256 KiB/)
  assert.throws(()=>reviewUi({schemaVersion:1,files:Array.from({length:65},(_,i)=>({path:`${i}.tsx`,content:''}))}), /64 files/)
  assert.throws(()=>review(`const A=()=> <>${'<button/>'.repeat(513)}</>`), /512-entry/)
  assert.throws(()=>review(`const A=()=> <>${'<button/>'.repeat(512)}</>`, { suppressions: [{file:'src/example.tsx',rule:'L2B-A11Y-003',line:1,reason:'Intentional runtime exception. '+ 'a'.repeat(480)}] }), /512 KiB response/)
})
test('suppression fields, rule ids, reasons and duplicates are validated', () => {
  const suppression = {file:'src/example.tsx',rule:'L2B-A11Y-003',line:1,reason:'Reviewed intentional product exception.'}
  for (const changes of [{reason:'ignore'},{reason:'aaaaaaaaaaaa'},{reason:'1234 1234 1234'},{file:'missing.tsx'},{rule:'UNKNOWN'},{line:0},{extra:true}]) assert.throws(()=>validateReviewRequest(request('',{suppressions:[{...suppression,...changes}] as never})))
  assert.throws(()=>validateReviewRequest(request('',{suppressions:[suppression,suppression] as never})), /Duplicate/)
})
test('contracts are strict versioned schemas and every rule has guidance', () => {
  assert.equal(REVIEW_INPUT_SCHEMA.additionalProperties, false); assert.equal(REVIEW_RESULT_SCHEMA.additionalProperties, false)
  assert.equal(REVIEW_INPUT_SCHEMA.properties.schemaVersion.const, 1)
  assert.equal(REVIEW_RULES.length, 4)
  assert.ok(REVIEW_RULES.every(rule=>rule.docs && rule.fix && rule.description))
})
async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {withFileTypes:true})
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?sourceFiles(join(directory,entry.name)):entry.name.endsWith('.tsx')?[join(directory,entry.name)]:[]))).flat()
}
test('registry blocks and website demo corpus produce zero claimed defects with honest unknowns', async () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url))
  const blocks = await sourceFiles(join(root,'packages/registry/src/blocks'))
  const components = await sourceFiles(join(root,'apps/web/src/components'))
  const demos = [...components.filter(path=>/demo/i.test(path)), ...await sourceFiles(join(root,'apps/web/src/block-demos')), ...await sourceFiles(join(root,'apps/web/src/demos')), ...await sourceFiles(join(root,'packages/registry/src/charts'))]
  assert.ok(blocks.length >= 30); assert.ok(demos.length > 0)
  let unresolved = 0
  for (const path of [...blocks,...demos]) {
    const result = reviewUi({schemaVersion:1,files:[{path:relative(root,path),content:await readFile(path,'utf8')}]})
    assert.equal(result.summary.errors,0,`${relative(root,path)}: ${JSON.stringify(result.findings)}`)
    unresolved += result.unknowns.length
  }
  assert.ok(unresolved > 0)
  console.info(`Corpus: ${blocks.length} registry blocks, ${demos.length} website demos, ${unresolved} explicit unknowns, zero errors.`)
})
