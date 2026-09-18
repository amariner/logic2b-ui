import { createHash } from "node:crypto"
import { hashVerificationSuite, projectFingerprint, type VerificationReportV1, type VerificationStatus } from "@logic2b/scaffold/verification"

/** A host's claims, deliberately independent of browser execution in the MCP. */
export async function verificationReport(status: VerificationStatus = "pass"): Promise<VerificationReportV1> {
  const suite: VerificationReportV1["suite"] = {
    schemaVersion: 1,
    projectFiles: ["src/Customers.tsx"],
    viewports: [{ id: "desktop", width: 1280, height: 800 }, { id: "mobile", width: 390, height: 844 }],
    scenarios: [{ id: "customers", route: "/customers", steps: [
      { type: "check", id: "heading", assertion: "visible", target: { by: "role", role: "heading", name: "Customers" } },
      { type: "check", id: "overflow", assertion: "overflow" },
      { type: "check", id: "visual", assertion: "screenshot" },
      { type: "check", id: "accessibility", assertion: "axe" },
    ] }],
  }
  const files = [{ path: "src/Customers.tsx", sha256: createHash("sha256").update("// host-selected fixture source\n").digest("hex") }]
  const evidence: VerificationReportV1["evidence"] = []
  const checks: VerificationReportV1["checks"] = []
  for (const viewport of suite.viewports) for (const step of suite.scenarios[0]!.steps) {
    if (step.type !== "check") continue
    const id = `${viewport.id}-${step.id}`
    const proof = status === "pass" || status === "fail"
    const kind = step.assertion === "screenshot" ? "screenshot" : step.assertion === "axe" ? "axe" : "log"
    if (proof) evidence.push({
      id, kind, reference: `evidence/${id}.${kind === "screenshot" ? "png" : "json"}`,
      sha256: createHash("sha256").update(`Host evidence claim: ${id}`).digest("hex"),
      tool: kind === "axe" ? "axe-core" : "playwright",
    })
    checks.push({ scenarioId: "customers", viewportId: viewport.id, checkId: step.id,
      kind: "browser-measured", status, reason: status === "pass" ? "Host measured the expected result." : status === "fail" ? "Host measured an assertion failure." : "The host did not run this check.",
      evidenceIds: proof ? [id] : [],
    })
  }
  return {
    schemaVersion: 1, origin: "http://127.0.0.1:3000", suite, suiteSha256: await hashVerificationSuite(suite),
    project: { scope: "selected-files", fingerprint: await projectFingerprint(files), files, servedSourceBinding: "unverified" },
    tools: [{ name: "playwright", version: "1.58.2" }, { name: "axe-core", version: "4.11.1" }],
    runs: suite.viewports.map(viewport => ({ scenarioId: "customers", viewportId: viewport.id, status, reason: status === "pass" ? "Scenario completed." : "Scenario did not pass." })),
    checks, evidence, notes: ["Synthetic host report used to test the report contract; no browser run is claimed by the MCP."],
  }
}
