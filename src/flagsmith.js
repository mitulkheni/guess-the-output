// Everything that talks to Flagsmith lives in this file.
//
// How the experiment works:
//   1. Every visitor gets a random, persistent anonymous ID (stored in localStorage).
//   2. We initialise the SDK with that ID as the identity and `enableEvents: true`.
//   3. getExperimentFlag('quiz_start_screen') returns the variation this visitor is bucketed
//      into AND records an exposure event, so we only call it where the start screen renders.
//   4. trackEvent('quiz_started') and trackEvent('quiz_completed') send the conversion events
//      that the "Quiz Started" and "Quiz Completed" metrics count.
//   5. Events are buffered by the SDK; we flush them right after a conversion and when the
//      tab is hidden, so short visits are not lost.

import flagsmith from '@flagsmith/flagsmith';

export const FLAG = 'quiz_start_screen';
export const VARIANTS = { CONTROL: 'control', SAMPLE: 'sample_question' };

// The client-side environment key is public by design (it ships in every browser bundle),
// but we still keep it out of source control and inject it at build time.
const ENVIRONMENT_ID = import.meta.env.VITE_FLAGSMITH_ENVIRONMENT_ID;
// Optional, only for self-hosted Flagsmith. Leave unset to use Flagsmith Cloud.
const API_URL = import.meta.env.VITE_FLAGSMITH_API_URL;
const EVENTS_URL = import.meta.env.VITE_FLAGSMITH_EVENTS_URL;
const INIT_TIMEOUT_MS = 3000;

let ready = false;

function visitorId() {
  const KEY = 'gto_visitor_id';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = `v_${crypto.randomUUID()}`;
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode etc.): fall back to an ID for this page view only.
    return `v_${crypto.randomUUID()}`;
  }
}

/**
 * Initialise Flagsmith. Resolves to `true` when flags loaded, `false` when we fall back
 * to the control experience (no key, network blocked, or too slow).
 */
export async function initFlagsmith() {
  if (!ENVIRONMENT_ID) {
    console.warn('[flagsmith] VITE_FLAGSMITH_ENVIRONMENT_ID is not set; showing control.');
    return false;
  }
  const init = flagsmith.init({
    environmentID: ENVIRONMENT_ID,
    identity: visitorId(), // exposures and conversions are joined on this identity
    enableEvents: true,
    cacheFlags: false, // exposures are only recorded for flags fetched from the server
    ...(API_URL ? { api: API_URL } : {}),
    ...(EVENTS_URL ? { eventProcessorConfig: { eventsApiUrl: EVENTS_URL } } : {}),
  });
  const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), INIT_TIMEOUT_MS));
  try {
    const result = await Promise.race([init, timeout]);
    ready = result !== 'timeout';
  } catch (err) {
    console.warn('[flagsmith] init failed; showing control.', err);
    ready = false;
  }
  if (ready) {
    // Send anything still buffered when the visitor leaves or switches tabs.
    const flush = () => flagsmith.flushEvents().catch(() => {});
    addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
  return ready;
}

/**
 * Which start screen this visitor sees. Calling this records the exposure, so call it
 * exactly where the start screen is rendered.
 */
export function getStartScreenVariant() {
  if (!ready) return { variant: VARIANTS.CONTROL, inExperiment: false };
  const flag = flagsmith.getExperimentFlag(FLAG);
  // Send the exposure now: visitors who look and leave must still count in the denominator.
  flagsmith.flushEvents().catch(() => {});
  const isSample = flag?.variant === VARIANTS.SAMPLE || flag?.value === VARIANTS.SAMPLE;
  return {
    variant: isSample ? VARIANTS.SAMPLE : VARIANTS.CONTROL,
    inExperiment: Boolean(flag?.experiment?.inExperiment),
  };
}

/** Send a conversion event and flush it straight away. */
export function track(event, value) {
  if (!ready) return;
  flagsmith.trackEvent(event, value === undefined ? undefined : { value });
  flagsmith.flushEvents().catch(() => {});
}

export function debugInfo() {
  return { ready, identity: flagsmith.identity, flag: ready ? flagsmith.getAllFlags()[FLAG] : null };
}
