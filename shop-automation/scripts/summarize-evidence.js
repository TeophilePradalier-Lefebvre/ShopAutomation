// Reads evidence/api-evidence-<pid>.jsonl and proves concurrency: shows, per Cypress process,
// its first/last request timestamp and whether the time windows overlap.
const fs = require("fs");
const dir = "reports/evidence";
if (!fs.existsSync(dir)) { console.log("No evidence folder: run the tests first."); process.exit(0); }

const workers = fs.readdirSync(dir).filter((f) => f.startsWith("api-evidence-") && f.endsWith(".jsonl")).map((f) => {
  const rows = fs.readFileSync(`${dir}/${f}`, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const times = rows.map((r) => Date.parse(r.startedAt));
  return { pid: rows[0] && rows[0].pid, requests: rows.length, specs: [...new Set(rows.map((r) => r.spec))].length, from: Math.min(...times), to: Math.max(...times) };
});

workers.sort((a, b) => a.from - b.from);
workers.forEach((w) => console.log(`pid ${w.pid}: ${w.requests} requests, ${w.specs} spec(s), ${new Date(w.from).toISOString()} -> ${new Date(w.to).toISOString()}`));
const overlap = workers.some((a, i) => workers.slice(i + 1).some((b) => b.from <= a.to && a.from <= b.to));
console.log(workers.length > 1 ? (overlap ? "Overlapping time windows: tests ran concurrently." : "No overlap detected.") : "Single process (sequential run).");
