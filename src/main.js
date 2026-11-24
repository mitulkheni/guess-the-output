import './style.css';
import { QUESTIONS } from './questions.js';
import { initFlagsmith, getStartScreenVariant, track, debugInfo, VARIANTS } from './flagsmith.js';

const app = document.getElementById('app');
const params = new URLSearchParams(location.search);

// ?preview=control or ?preview=sample_question shows one start screen without Flagsmith,
// so nothing is tracked. Handy for recording the demo video.
const preview = Object.values(VARIANTS).includes(params.get('preview')) ? params.get('preview') : null;
const debug = params.has('debug');

const state = { variant: VARIANTS.CONTROL, index: 0, score: 0, answered: false, started: false };

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function markStarted() {
  if (state.started) return;
  state.started = true;
  track('quiz_started');
}

function header(extra = '') {
  return `<header class="top">
    <span class="logo">Guess the Output</span>
    ${extra}
  </header>`;
}

function progress() {
  const pct = (state.index / QUESTIONS.length) * 100;
  return `<div class="progress" aria-hidden="true"><span style="width:${pct}%"></span></div>`;
}

// ---- Start screens: the two versions under test -----------------------------------------

function renderControlStart() {
  app.innerHTML = `
    ${header()}
    <main class="start">
      <p class="kicker">A JavaScript quiz</p>
      <h1>Guess the Output</h1>
      <p class="lede">Eight tiny JavaScript snippets. Read each one and predict what it prints.
        Most developers get four or five right.</p>
      <p class="meta">8 questions · about 2 minutes · no sign-up</p>
      <button class="primary" id="start">Start the quiz</button>
    </main>`;
  document.getElementById('start').addEventListener('click', () => {
    markStarted();
    renderQuestion();
  });
}

function renderSampleStart() {
  // The variant skips the intro: the first question *is* the start screen.
  renderQuestion({ intro: true });
}

// ---- Quiz -------------------------------------------------------------------------------

function renderQuestion({ intro = false } = {}) {
  const q = QUESTIONS[state.index];
  state.answered = false;
  app.innerHTML = `
    ${header(`<span class="count">${state.index + 1} / ${QUESTIONS.length}</span>`)}
    ${progress()}
    <main class="question">
      ${intro ? '<p class="kicker">8 quick questions · no sign-up</p>' : ''}
      <h1 class="ask">What does this print?</h1>
      <pre class="code"><code>${esc(q.code)}</code></pre>
      <div class="options" role="group" aria-label="Answers">
        ${q.options.map((o, i) => `<button class="option" data-i="${i}"><code>${esc(o)}</code></button>`).join('')}
      </div>
      <div class="feedback" id="feedback" aria-live="polite"></div>
    </main>`;
  app.querySelectorAll('.option').forEach((btn) =>
    btn.addEventListener('click', () => answer(Number(btn.dataset.i))),
  );
}

function answer(choice) {
  if (state.answered) return;
  state.answered = true;
  markStarted(); // in the sample-question variant, answering Q1 is what "starting" means

  const q = QUESTIONS[state.index];
  const correct = choice === q.answer;
  if (correct) state.score += 1;

  app.querySelectorAll('.option').forEach((btn) => {
    const i = Number(btn.dataset.i);
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('right');
    else if (i === choice) btn.classList.add('wrong');
  });

  const last = state.index === QUESTIONS.length - 1;
  const fb = document.getElementById('feedback');
  fb.innerHTML = `
    <p class="verdict ${correct ? 'ok' : 'no'}">${correct ? 'Correct.' : 'Not quite.'}</p>
    <p>${esc(q.why)}</p>
    <button class="primary" id="next">${last ? 'See my score' : 'Next question'}</button>`;
  const next = document.getElementById('next');
  next.focus();
  next.addEventListener('click', () => {
    if (last) return finish();
    state.index += 1;
    renderQuestion();
  });
}

function finish() {
  track('quiz_completed', state.score);
  const n = QUESTIONS.length;
  const line =
    state.score === n ? 'Perfect score. You think like the engine.'
    : state.score >= 6 ? 'Sharp. Only a couple of traps got you.'
    : state.score >= 4 ? 'About average. JavaScript is weird.'
    : 'JavaScript won this round.';
  const shareText = `I got ${state.score}/${n} on Guess the Output. Can you beat it?`;
  const url = location.origin + location.pathname;

  state.index = n;
  app.innerHTML = `
    ${header()}
    ${progress()}
    <main class="done">
      <p class="kicker">Your score</p>
      <p class="score">${state.score}<span>/${n}</span></p>
      <p class="lede">${line}</p>
      <div class="row">
        <button class="primary" id="share">Copy a challenge link</button>
        <button class="ghost" id="again">Play again</button>
      </div>
      <p class="small" id="copied" aria-live="polite"></p>
    </main>`;
  document.getElementById('share').addEventListener('click', async () => {
    const msg = document.getElementById('copied');
    try {
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      msg.textContent = 'Copied. Paste it wherever your developer friends hang out.';
    } catch {
      msg.textContent = `${shareText} ${url}`;
    }
  });
  document.getElementById('again').addEventListener('click', () => {
    Object.assign(state, { index: 0, score: 0, answered: false });
    renderQuestion();
  });
}

// ---- Boot -------------------------------------------------------------------------------

function renderDebug(extra) {
  if (!debug && !preview) return;
  const bar = document.createElement('div');
  bar.className = 'debug';
  bar.textContent = preview
    ? `Preview of "${preview}" — Flagsmith is off and nothing is tracked.`
    : `debug · ${JSON.stringify(extra)}`;
  document.body.appendChild(bar);
}

async function boot() {
  if (preview) {
    state.variant = preview;
    renderDebug();
  } else {
    await initFlagsmith();
    const { variant, inExperiment } = getStartScreenVariant(); // records the exposure
    state.variant = variant;
    renderDebug({ variant, inExperiment, ...debugInfo() });
  }
  if (state.variant === VARIANTS.SAMPLE) renderSampleStart();
  else renderControlStart();
}

boot();
