import { createServer } from "node:http";
import sirv from "sirv";

const port = Number(process.argv[2] ?? 4173);
const handler = sirv("dist/client", { dev: false, extensions: ["html"] });

createServer((req, res) => handler(req, res)).listen(port, () => {
  console.log(`serving dist/client on http://127.0.0.1:${port}`);
});
