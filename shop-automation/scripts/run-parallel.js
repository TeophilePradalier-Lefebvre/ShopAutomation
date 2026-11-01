#!/usr/bin/env node
/**
 * Parallel execution without Cypress Cloud.
 *
 * One Cypress process per worker (Cypress is single-process by itself), each with:
 *   - its own server instance on its own PORT -> its own in-memory store, so no test
 *     can see another worker's data (a shared database is what makes parallel suites flaky);
 *   - its own slice of the spec files (round-robin: specs are independent by design);
 *   - its own log file, so a failure story stays readable.
 *
 * Usage:  node scripts/run-parallel.js [--workers 2]
 * Output: reports/parallel/worker-<n>.log + a summary table on stdout.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'reports', 'parallel');
const BASE_PORT = Number(process.env.BASE_PORT || 3100);

const argWorkers = process.argv.indexOf('--workers');
const WORKERS = argWorkers > -1 ? Number(process.argv[argWorkers + 1]) : Number(process.env.WORKERS || 2);

/** Every spec file of the project, labs excluded (they fail on purpose). */
function listSpecs() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.cy.js')) found.push(path.relative(ROOT, full));
    }
  };
  walk(path.join(ROOT, 'tests', 'ui'));
  walk(path.join(ROOT, 'tests', 'api'));
  // Longest specs first: the last worker finishes sooner (classic bin-packing).
  const weight = (file) => fs.statSync(path.join(ROOT, file)).size;
  return found.sort((a, b) => weight(b) - weight(a));
}

function waitForHealth(port, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/api/v1/health', timeout: 1000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else retry();
      });
      req.on('error', retry);
      req.on('timeout', () => req.destroy());
    };
    const retry = () => {
      if (Date.now() > deadline) reject(new Error(`server on port ${port} never became healthy`));
      else setTimeout(attempt, 200);
    };
    attempt();
  });
}

/** `xvfb-run` on the PATH? (Linux CI has no X server by default.) */
function hasXvfbRun() {
  return (process.env.PATH || '')
    .split(path.delimiter)
    .some((dir) => dir && fs.existsSync(path.join(dir, 'xvfb-run')));
}

// Two Cypress processes on the same machine fight over display :99 (and the second one
// dies with "Server is already active for display 99"). xvfb-run -a gives each worker its
// own free display, which is exactly what a CI runner does.
const NEEDS_XVFB = process.platform === 'linux' && !process.env.DISPLAY && hasXvfbRun();

function run(command, args, options, log) {
  return new Promise((resolve) => {
    const child = spawn(command, args, Object.assign({ cwd: ROOT }, options));
    // The Cypress output is what makes a failure readable: keep every line.
    if (log) {
      child.stdout.pipe(log, { end: false });
      child.stderr.pipe(log, { end: false });
    }
    child.on('exit', (code) => resolve(code === 0));
  });
}

async function runWorker(index, specs) {
  const port = BASE_PORT + index;
  const logPath = path.join(OUT_DIR, `worker-${index + 1}.log`);
  const log = fs.createWriteStream(logPath);
  const startedAt = Date.now();

  log.write(`# worker ${index + 1} | port ${port} | specs: ${specs.join(', ')}\n`);

  const server = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: Object.assign({}, process.env, { PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.pipe(log, { end: false });
  server.stderr.pipe(log, { end: false });

  let passed = false;
  try {
    await waitForHealth(port);
    const cypressArgs = [
      path.join(ROOT, 'node_modules', 'cypress', 'bin', 'cypress'),
      'run',
      '--spec',
      specs.join(','),
      '--config',
      `baseUrl=http://127.0.0.1:${port},video=false`
    ];
    passed = await run(
      NEEDS_XVFB ? 'xvfb-run' : process.execPath,
      NEEDS_XVFB ? ['-a', process.execPath, ...cypressArgs] : cypressArgs,
      { stdio: ['ignore', 'pipe', 'pipe'] },
      log
    ).catch(() => false);
  } catch (error) {
    log.write(`\n# worker error: ${error.message}\n`);
  } finally {
    server.kill('SIGTERM');
    log.write(`\n# worker ${index + 1} ${passed ? 'PASSED' : 'FAILED'} in ${Math.round((Date.now() - startedAt) / 1000)}s\n`);
    log.end();
  }

  return { worker: index + 1, port, specs: specs.length, passed, seconds: Math.round((Date.now() - startedAt) / 1000) };
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const specs = listSpecs();
  const shards = Array.from({ length: WORKERS }, () => []);
  specs.forEach((spec, i) => shards[i % WORKERS].push(spec));

  console.log(`\nRunning ${specs.length} specs on ${WORKERS} workers (one server per worker)\n`);
  const startedAt = Date.now();

  const results = await Promise.all(shards.map((shard, i) => runWorker(i, shard)));

  console.log('worker  port   specs  result   seconds');
  results.forEach((r) => {
    console.log(
      `${String(r.worker).padEnd(7)} ${String(r.port).padEnd(6)} ${String(r.specs).padEnd(6)} ${
        r.passed ? 'pass  ' : 'fail  '
      }   ${r.seconds}`
    );
  });
  console.log(`\nTotal wall time: ${Math.round((Date.now() - startedAt) / 1000)}s`);
  console.log(`Logs: ${path.relative(ROOT, OUT_DIR)}/worker-*.log`);

  process.exit(results.every((r) => r.passed) ? 0 : 1);
})();
