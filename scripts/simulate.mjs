#!/usr/bin/env node
// Simulated traffic for the quiz_start_screen experiment.
//
// Each simulated visitor gets its own identity, asks Flagsmith which start screen it sees
// (recording an exposure, exactly like the real app), and then "starts" and "completes" the
// quiz with a probability that depends on the variant. The rates below are made up for
// testing; they are not real results.
//
// Usage:
//   FLAGSMITH_ENVIRONMENT_ID=<client-side key> node scripts/simulate.mjs [--users 300]
//
// Point it at the Development environment so simulated visitors never mix with real ones.

import { createFlagsmithInstance } from '@flagsmith/flagsmith/isomorphic';

const FLAG = 'quiz_start_screen';
const ENVIRONMENT_ID = process.env.FLAGSMITH_ENVIRONMENT_ID;
const API_URL = process.env.FLAGSMITH_API_URL; // optional, for self-hosted or local testing
const EVENTS_URL = process.env.FLAGSMITH_EVENTS_URL; // optional, as above

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const USERS = Number(args.users ?? 300);
const CONCURRENCY = Number(args.concurrency ?? 10);

// Assumed behaviour per variant (simulation only).
const RATES = {
  control: { start: 0.32, complete: 0.62 },
  sample_question: { start: 0.45, complete: 0.58 },
};

if (!ENVIRONMENT_ID) {
  console.error('Set FLAGSMITH_ENVIRONMENT_ID to a client-side environment key.');
  process.exit(1);
}

const runId = Date.now().toString(36);
const tally = {};

async function visitor(i) {
  const fs = createFlagsmithInstance();
  await fs.init({
    environmentID: ENVIRONMENT_ID,
    identity: `sim_${runId}_${i}`,
    enableEvents: true,
    ...(API_URL ? { api: API_URL } : {}),
    ...(EVENTS_URL ? { eventProcessorConfig: { eventsApiUrl: EVENTS_URL } } : {}),
  });

  const flag = fs.getExperimentFlag(FLAG); // records the exposure
  const variant = flag?.variant === 'sample_question' || flag?.value === 'sample_question' ? 'sample_question' : 'control';
  const t = (tally[variant] ??= { visitors: 0, enrolled: 0, started: 0, completed: 0 });
  t.visitors += 1;
  if (flag?.experiment?.inExperiment) t.enrolled += 1;

  const rate = RATES[variant];
  if (Math.random() < rate.start) {
    fs.trackEvent('quiz_started');
    t.started += 1;
    if (Math.random() < rate.complete) {
      fs.trackEvent('quiz_completed', { value: Math.floor(Math.random() * 9) });
      t.completed += 1;
    }
  }
  await fs.close(10_000); // sends buffered events before this visitor is discarded
}

let next = 0;
async function worker() {
  while (next < USERS) {
    const i = next++;
    try {
      await visitor(i);
    } catch (err) {
      console.error(`visitor ${i} failed:`, err?.message ?? err);
    }
  }
}

console.log(`Simulating ${USERS} visitors (run ${runId})…`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.table(tally);
const enrolled = Object.values(tally).reduce((n, t) => n + t.enrolled, 0);
if (enrolled === 0) {
  console.warn('No visitor was enrolled. Is the experiment running in this environment?');
  process.exitCode = 2;
}
