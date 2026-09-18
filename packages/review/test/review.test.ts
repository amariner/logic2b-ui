import assert from "node:assert/strict"
import { test } from "node:test"
import { readFile, readdir } from "node:fs/promises"
import { reviewUi, REVIEW_LIMITS, ReviewInputError } from "../src/index.ts"
const review = (content: string, complete = false) => reviewUi({ files: [{ path: "App.tsx", content, labelContext: complete ? "complete" : "partial" }], policy: { semanticColors: true } })

test("token policy is explicit and scoped to literal JSX styling, never comments or source strings", () => {
  const content = 'const text = "bg-red-500"; // text-blue-400\nexport const App=()=> <div className="hover:bg-red-500 text-primary" style={{borderColor:"#ff0000"}}>text-red-500</div>'
  assert.equal(reviewUi({ files: [{ path: "App.tsx", content }] }).findings.length, 0)
  const result = review(content)
  assert.equal(result.findings.length, 2)
  assert.ok(result.findings.every(f => f.category === "design-policy" && f.rule === "L2B-TOK-001"))
  assert.ok(result.findings.every(f => f.line === 2 && f.column > 1))
  assert.equal(review('<div className="bg-primary text-muted-foreground" style={{color:"var(--foreground)"}}/>').findings.length, 0)
  assert.equal(review('<div className={cn("text-red-500", dynamic)} />').unknowns.length, 1)
  assert.equal(review('<div style={{color:"banana"}}/>').unknowns.length, 1)
})
test("utility variants, literal expressions and named colors have positive/negative cases", () => {
  for (const content of ['<div className="dark:hover:bg-red-500/50"/>', '<div className="[&:hover]:text-[#ff0000]"/>', '<div className={"bg-[#fff]"}/>', '<div style={{color:"rebeccapurple"}}/>', '<div style={{backgroundColor:"oklch(0.5 0.2 20)"}}/>']) assert.equal(review(content).findings.length, 1, content)
  for (const content of ['<div className="rounded-[2px] ring-primary/50"/>', '<div style={{color:"currentColor", opacity:0.5}}/>', '<div>{"text-red-500"}</div>']) assert.equal(review(content).findings.length, 0, content)
})
test("missing native names are unknown by default and scoped defects only with complete label context", () => {
  for (const [source,rule] of [['<button><svg aria-hidden="true"/></button>', 'L2B-A11Y-003'], ['<input/>', 'L2B-A11Y-002'], ['<dialog open/>', 'L2B-A11Y-001']] as const) {
    assert.equal(review(source).findings.length, 0)
    assert.ok(review(source).unknowns.some(u => u.rule === rule))
    const complete = review(source, true)
    assert.equal(complete.findings.length, 1, source)
    assert.equal(complete.findings[0].rule, rule)
    assert.ok(complete.findings[0].evidence.some(e => e.includes("host explicitly")))
  }
})
test("nested, external, hidden-reference and visible button names avoid false positives", () => {
  const good = [
    '<label>Customer name<input/></label>',
    '<><label htmlFor="email">Email</label><input id="email"/></>',
    '<button><span className="sr-only">Remove</span><svg aria-hidden="true"/></button>',
    '<><label hidden htmlFor="x">Name</label><input id="x"/></>', '<div hidden><button/></div>', '<button title="Close"/>', '<input type="submit"/>', '<input type="hidden"/>',
    '<><h2 id="title" hidden>Edit customer</h2><dialog aria-labelledby="title"/></>',
    '<div role="dialog" aria-label="Edit"/>', '<input aria-label="Name"/>',
  ]
  for (const source of good) {
    const result = review(source, true)
    assert.deepEqual(result.findings, [], source)
    assert.deepEqual(result.unknowns, [], source)
  }
  assert.equal(review('<label><input/></label>', true).findings.length, 1)
  assert.equal(review('<><label htmlFor="d">Edit</label><dialog id="d"/></>', true).findings.length, 1)
})
test("custom wrappers, spreads, dynamic children and unresolved labels stay unknown", () => {
  const cases = [
    '<Label><input/></Label>', '<button><Icon aria-hidden="true"/></button>', '<Button/>', '<Input/>', '<DialogContent/>', '<UI.Button/>',
    '<button {...props}/>', '<button>{label}</button>', '<input aria-label={label}/>',
    '<><span id="x">A</span><span id="x">B</span><input aria-labelledby="x"/></>',
    '<><input id="x"/>{visible && <label htmlFor="x">Name</label>}</>',
    '<><label htmlFor={id}>Name</label><input id={id}/></>', '<><label htmlFor={id}>Name</label><input id="x"/></>', '<button hidden={hidden}/>', '<input aria-labelledby="external"/>', '<button><SvgIcon/></button>',
    'const Unused=()=> <label htmlFor="x">Name</label>; const App=()=> <input id="x"/>',
  ]
  for (const source of cases) { const result = review(source, true); assert.equal(result.findings.length, 0, source); assert.ok(result.unknowns.length > 0, source) }
})
test("suppression is reasoned, rule-specific, auditable and cannot come from a string", () => {
  const suppressed = review('// logic2b-review-disable-next-line L2B-TOK-001 -- third party brand mark\n<div className="text-red-500"/>')
  assert.equal(suppressed.findings.length, 0); assert.equal(suppressed.suppressed.length, 1)
  assert.equal(suppressed.suppressed[0].reason, "third party brand mark")
  for (const separator of ["\r", "\r\n", "\u2028", "\u2029"]) assert.equal(review('// logic2b-review-disable-next-line L2B-TOK-001 -- intentional branding' + separator + '<div className="text-red-500"/>').suppressed.length, 1)
  assert.equal(review('// logic2b-review-disable-next-line L2B-TOK-001\n<div className="text-red-500"/>').findings.length, 1)
  assert.equal(review('const s="logic2b-review-disable-next-line L2B-TOK-001 -- not a comment";\n<div className="text-red-500"/>').findings.length, 1)
})
test("input counts, bytes, paths and unsupported options reject without echoing source", () => {
  for (const raw of [null, {}, { schemaVersion: 2, files: [] }, { files: Array(65).fill({ path: "App.tsx", content: "" }) }, { files: [{ path: "../private.tsx", content: "SECRET" }] }, { files: [{ path: "node_modules/private.tsx", content: "SECRET" }] }, { files: [{ path: "App.tsx", content: "€".repeat(100000) }] }, { files: [{ path: "App.tsx", content: "" }], scope: ["states"] }, { files: [{ path: "App.tsx", content: "" }], policy: { semanticColors: "true" } }]) assert.throws(() => reviewUi(raw), error => error instanceof ReviewInputError && !error.message.includes("SECRET"))
  assert.equal(reviewUi({files:[{path:"app/(dashboard)/[id]/page.tsx",content:"<div/>"}]}).findings.length, 0)
})
test("syntax failures and output limits cannot masquerade as a complete pass; source never executes", () => {
  const bad = review('const PRIVATE_SECRET = <broken')
  assert.deepEqual(bad.evaluatedRules, []); assert.equal(bad.unknowns[0].rule, "parse")
  assert.ok(!JSON.stringify(bad).includes("PRIVATE_SECRET"))
  const result = review('globalThis.REVIEW_CODE_EXECUTED=true; const App = () => <button/>', true)
  assert.equal((globalThis as Record<string, unknown>).REVIEW_CODE_EXECUTED, undefined)
  assert.equal(result.findings.length, 1)
  const many = review('<>'+Array(600).fill('<div className="text-red-500"/>').join('')+'</>')
  assert.equal(many.findings.length, REVIEW_LIMITS.findings); assert.equal(many.truncated, true)
  assert.deepEqual(review('<button aria-label="Close"/>',true), review('<button aria-label="Close"/>',true))
})
test("registry source and all block demos have zero demonstrated errors under honest partial context", async () => {
  const base = new URL("../../../packages/registry/src/", import.meta.url)
  const files: {path:string;content:string}[] = []
  async function walk(url: URL, prefix="") { for (const item of await readdir(url, {withFileTypes:true})) { if (item.isDirectory()) await walk(new URL(item.name+'/',url),prefix+item.name+'/'); else if (item.name.endsWith('.tsx')) files.push({path:prefix+item.name,content:await readFile(new URL(item.name,url),'utf8')}) } }
  await walk(base)
  await walk(new URL("../../../apps/web/src/block-demos/", import.meta.url), "demos/")
  let unknowns=0
  for (const file of files) { const result=reviewUi({files:[file]}); assert.equal(result.findings.length,0,file.path); assert.ok(!result.unknowns.some(u=>u.rule==='parse'),file.path); unknowns+=result.unknowns.length }
  assert.ok(files.length>100); assert.ok(unknowns>0, 'unresolved wrappers must remain visible, not be treated as verified')
})

test("each shipped rule has an independent authored bad/good fixture", async () => {
  const [bad, good, unknown] = await Promise.all(["bad/proven", "good/resolved", "unknown/composition"].map(name => readFile(new URL(`fixtures/${name}.tsx`, import.meta.url), "utf8")))
  assert.deepEqual(review(bad, true).findings.map(finding => finding.rule).sort(), ["L2B-A11Y-001", "L2B-A11Y-002", "L2B-A11Y-003", "L2B-TOK-001"])
  assert.deepEqual(review(good, true).findings, [])
  assert.deepEqual(review(good, true).unknowns, [])
  assert.deepEqual(review(unknown, true).findings, [])
  assert.ok(review(unknown, true).unknowns.length >= 6)
})
test("name fallbacks, reference visibility and JSX children follow the bounded HTML-AAM subset", () => {
  // https://www.w3.org/TR/html-aam-1.0/#accname-computation
  // https://www.w3.org/TR/accname-1.2/#computation-steps
  for (const source of [
    '<input aria-labelledby="  " aria-label="Name"/>',
    '<button aria-labelledby="  ">Save</button>',
    '<><span id="empty"/><button aria-labelledby="empty" aria-label="Save"/></>',
    '<button children="Save"/>', '<button><span title="Save"/></button>',
    '<input type="button" value="Save"/>', '<input type="reset"/>',
    '<><label htmlFor="x" hidden><span hidden>Name</span></label><input id="x"/></>',
    '<template><button/></template>', '<div inert><button/></div>', '<button inert/>', '<button hidden={false} inert/>',
  ]) { const result = review(source, true); assert.deepEqual(result.findings, [], source); assert.deepEqual(result.unknowns, [], source) }
  assert.equal(review('<><label htmlFor="x"><span hidden>Name</span></label><input id="x"/></>', true).findings.length, 1)
  assert.equal(review('<input type="button" value=""/>', true).findings.length, 1)
})
test("unknown composition, overriding attributes and platform labels never prove a missing name", () => {
  for (const source of [
    '<><CustomLabel htmlFor="x">Name</CustomLabel><input id="x"/></>',
    '<><label {...props}/><input id="x"/></>',
    '<>{labels}<input id="x"/></>', '<>{getLabels()}<input id="x"/></>',
    '<button aria-hidden={hidden}/>', '<div hidden={hidden}><button/></div>', '<div {...props}><button/></div>',
    '<button><span hidden={hidden}>Name</span></button>',
    '<button hidden {...props}/>', '<button aria-label="" aria-label="Save"/>', '<input type="button" value={label}/>', '<input type="button" defaultValue="Save"/>',
    '<input type="image" alt=""/>', '<input aria-placeholder="Name"/>',
    '<button children={label}/>', '<button dangerouslySetInnerHTML={{__html: "Save"}}/>',
    '<custom-label><input/></custom-label>',
  ]) { const result = review(source, true); assert.equal(result.findings.length, 0, source); assert.ok(result.unknowns.length > 0, source) }
})
test("semantic variable colors, URL fragments and overridden styling avoid policy false positives", () => {
  for (const source of [
    '<div className="bg-[url(#abc)]"/>', '<div className="bg-[url(\'https://example.test/#ffffff\')]"/>',
    '<div className="text-[hsl(var(--foreground))]"/>', '<div className="text-[#fffff]"/>',
    '<div style={{color:"hsl(var(--foreground))",backgroundColor:"rgb(var(--brand) / 0.5)"}}/>',
    '<div style={{color:"var(--foreground) /* #fff */"}}/>', '<div style={{fill:"url(#abc)"}}/>',
    '<div className="text-red-500" {...props}/>', '<div className="text-red-500" className="text-primary"/>',
    '<div style={{color:"red",color:"var(--foreground)"}}/>', '<div style={{color:"red",...props}}/>',
    '<div style={{color:"red",[key]:"var(--foreground)"}}/>',
  ]) assert.deepEqual(review(source).findings, [], source)
  for (const source of [
    '<div className="border-t-[#abcd] shadow-[0_1px_2px_#fff]"/>',
    '<div style={{background:"linear-gradient(#fff, #000)"}}/>',
    '<div style={{color:"rgb(255 0 0 / .5)"}}/>',
    '<div style={{color:"var(--foreground, #fff)"}}/>',
  ]) assert.ok(review(source).findings.length > 0, source)
})
test("node and suppression budgets report incomplete work without executing source", () => {
  const tooManyNodes = review("const values = [" + "0,".repeat(REVIEW_LIMITS.nodes) + "]; export const App=()=> <button/>;")
  assert.ok(tooManyNodes.truncated)
  assert.deepEqual(tooManyNodes.evaluatedRules, [])
  assert.ok(tooManyNodes.unknowns.some(item => item.reason.includes("AST node budget")))
  const suppressions = Array(REVIEW_LIMITS.suppressions + 1).fill('// logic2b-review-disable-next-line L2B-TOK-001 -- deliberate fixture policy override\n<div className="text-red-500"/>;').join('\n')
  const result = review(suppressions)
  assert.ok(result.truncated); assert.equal(result.suppressed.length, 0)
  assert.equal(result.findings.length, REVIEW_LIMITS.suppressions + 1)
  const malicious = review('import "https://example.invalid/private"; require("node:fs").writeFileSync("/tmp/should-not-exist", "PRIVATE_SECRET"); throw new Error("PRIVATE_SECRET"); export const App=()=> <input/>', true)
  assert.equal(malicious.findings.length, 1)
  assert.ok(!JSON.stringify(malicious).includes("PRIVATE_SECRET"))
})
