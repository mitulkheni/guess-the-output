# Guess the Output

A tiny JavaScript quiz that A/B tests its own start screen with **Flagsmith Experimentation**.

Built for **Toggle Wars: The Flagsmith Experimentation Hackathon** (WeMakeDevs, Nov 26–29, 2026), **Track 01: Test Something Real**.

**Live app:** https://mitulkheni.github.io/guess-the-output/ · **Demo video:** _add link here_

---

## The question

Does a quiz get more people to start if it skips the intro and shows the first question straight away?

| | Start screen | What counts as "started" |
|---|---|---|
| **Control** (`control`) | A plain intro: title, one line about the quiz, and a **Start the quiz** button | Clicking **Start the quiz** |
| **Variation** (`sample_question`) | No intro: question 1 is the first thing you see, with its four answers | Answering question 1 |

**Hypothesis:** Showing a sample question on the start screen, instead of a plain intro, will increase quiz starts by at least 15% within 4 days.

Starting the quiz happens in the first few seconds of a visit, so the metric fires early. That matters when the experiment can only run for four days.

## How the experiment is set up in Flagsmith

| Piece | Setting |
|---|---|
| Multivariate flag | `quiz_start_screen`, enabled. Control value `control`; one variation with value and key `sample_question` |
| Primary metric | **Quiz Started**: occurrence of the event `quiz_started`, higher is better |
| Second metric | **Quiz Completed**: occurrence of the event `quiz_completed`, higher is better. Used to check that the variant doesn't trade starts for finishes |
| Rollout | 100% of identities, split 50/50 |
| Warehouse | Flagsmith managed warehouse |
| Environments | **Production** runs the real experiment on real visitors. **Development** runs the same experiment on simulated visitors, to test the pipeline without polluting real data |

## How the code uses Flagsmith

All Flagsmith code is in [`src/flagsmith.js`](src/flagsmith.js), about 100 lines with comments.

1. **Identity.** Every visitor gets a random anonymous ID that is kept in `localStorage`. The SDK is initialised with that ID as the identity, so the same person always sees the same variation and their exposure and conversions join up.
2. **Init with events on.** `flagsmith.init({ environmentID, identity, enableEvents: true, cacheFlags: false })`. The `cacheFlags: false` setting matters because exposures are only recorded for flags fetched from the server.
3. **Exposure.** `flagsmith.getExperimentFlag('quiz_start_screen')` is called once, right where the start screen is rendered. It returns the variation and records the exposure. The exposure is flushed immediately, so visitors who look and leave are still counted.
4. **Conversions.** `flagsmith.trackEvent('quiz_started')` fires on the first click into the quiz. `flagsmith.trackEvent('quiz_completed', { value: score })` fires on the score screen. Both are flushed straight away, and anything left is flushed when the tab is hidden.
5. **Safe fallback.** If Flagsmith can't load within 3 seconds (an ad blocker or a bad network), the visitor sees the control screen and nothing is tracked. A visitor who never received a variation is never counted.

[`src/main.js`](src/main.js) is the quiz itself. It asks `flagsmith.js` which start screen to show, then calls `track()` at the two conversion points.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then paste your Development client-side key
npm run dev
```

The client-side environment key is under **Environment Settings → SDK Keys** in Flagsmith.

Useful URL options:

- `?debug` shows the identity, the variation and whether you are enrolled.
- `?preview=control` or `?preview=sample_question` shows one start screen with Flagsmith switched off, so nothing is tracked. This is for screenshots and demo videos.

## Deploy (GitHub Pages)

1. In the repo, open **Settings → Secrets and variables → Actions → Variables** and add:
   - `FLAGSMITH_ENVIRONMENT_ID`: the **Production** client-side key (used by the live site)
   - `FLAGSMITH_DEV_ENVIRONMENT_ID`: the **Development** client-side key (used only by the simulator)
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main`. The [deploy workflow](.github/workflows/deploy.yml) builds the app and publishes it.

## Simulated traffic

[`scripts/simulate.mjs`](scripts/simulate.mjs) creates simulated visitors. Each one gets its own identity, asks Flagsmith for its variation (recording an exposure exactly like the real app), then starts and finishes the quiz with a made-up probability per variant.

```bash
FLAGSMITH_ENVIRONMENT_ID=<development client-side key> npm run simulate -- --users 300
```

You can also run it from GitHub: **Actions → Simulate traffic (Development) → Run workflow**. It only ever uses the Development key, so simulated visitors never mix with the real experiment in Production.

## Results

**Pipeline check (simulated, Development environment, Nov 24):** 300 simulated visitors were all enrolled (141 control, 159 sample_question), and Flagsmith's results page matched the simulator's own tally exactly. This only proves the instrumentation works; the made-up rates in the simulator are not results.

**Real experiment (Production):**

_To be filled in at the end of the hackathon from the experiment's results page in Flagsmith: visitors enrolled per variation, start rate, lift, chance to be best, and what we rolled out._

## Built with

- [Flagsmith](https://github.com/Flagsmith/flagsmith) feature flags and Experimentation, using `@flagsmith/flagsmith` 12.6
- Vanilla JavaScript and [Vite](https://vite.dev)
- GitHub Pages and GitHub Actions

## License

MIT
