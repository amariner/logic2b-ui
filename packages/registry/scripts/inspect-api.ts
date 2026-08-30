import { extractApiContracts } from "./extract-api.ts"

const contracts = await extractApiContracts()
const names = process.argv.slice(2)
const selected = names.length > 0
  ? Object.fromEntries(names.map((name) => [name, contracts[name]]))
  : contracts

console.log(JSON.stringify(selected, null, 2))
