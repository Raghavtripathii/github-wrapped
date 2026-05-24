# GitHub Wrapped

**[→ Live Demo](https://github-wrapped-lake.vercel.app)**

![Demo](./demo.gif)

Enter any GitHub username and get a breakdown of their coding year — what languages they actually use, when they tend to commit, how their streaks look, and a personality type computed from their push history.

I built this because a GitHub profile shows *what* someone built. I wanted something that shows *how* they build — the habits, the patterns, the hours they keep.

---

## What it shows

- Developer personality type — computed from real commit timestamps, not self-reported
- Language split — weighted by repo size, not repo count (explained below)
- 52-week contribution heatmap — built in raw SVG
- Commit streak stats — current and longest, from push event history
- Top 4 repos by stars + forks
- Quick stats — public repos, total stars, forks, followers

No login needed. Works on any public GitHub profile.

---

## The parts worth explaining

### How personality type works

GitHub's stats API throws away time-of-day information. It gives you aggregated counts but not *when* things happened. So I pull raw `PushEvent` objects from the events endpoint instead, and bucket each one by hour and by day of the week:

```js
events.forEach((event) => {
  if (event.type !== 'PushEvent') return
  hourCounts[new Date(event.created_at).getHours()]++
  dayCounts[new Date(event.created_at).getDay()]++
  totalPushEvents++
})
```

Five personality types — Night Owl, Weekend Warrior, Early Bird, Afternoon Architect, Steady Builder — are checked in that specific order against the ratios. The order matters because someone can satisfy multiple conditions. Late-night commits (10pm–2am) get checked before weekend patterns because if someone codes at 1am on a Saturday, the midnight behavior is the more interesting signal.

### Why language percentages are weighted by repo size

Counting repos per language is the obvious approach and it's wrong in an annoying way. If someone has 20 small JavaScript files and one 500KB Python codebase, you'd get "80% JavaScript" which is completely misleading.

Instead I sum `repo.size` — GitHub's KB measure — per language:

```js
languageSizes[repo.language] = (languageSizes[repo.language] || 0) + (repo.size || 1)
```

The `|| 1` is there because some repos have size 0 in GitHub's API (empty repos, or repos where size hasn't been computed yet). Without it they'd be silently dropped from the calculation. With it they get counted minimally. Top 6 languages returned by percentage of total KB.

### The heatmap has no library

Every heatmap package I looked at adds a lot of weight for what is just a grid of colored squares. The coordinate math is:

```
x = weekIndex × 13
y = dayIndex × 13
```

That's 364 `<rect>` elements, each 11×11px. Color comes from a 5-stop ramp — fully transparent at zero commits, then `#1e3a2f` → `#166534` → `#16a34a` → `#22d3a0` as `count / maxCount` goes up. I picked those specific stops so 1–2 commit days stay visible rather than being almost invisible. Hover tooltips are SVG `<title>` elements — no JavaScript listeners, works in every browser by default.

### Fetching without wasting requests

GitHub rate-limits unauthenticated requests to 60/hour. Each search fires three calls at the same time using `Promise.all`:

```js
const [userInfo, repos, events] = await Promise.all([
  fetchFromGithub(`/users/${username}`),
  fetchAllPages(`/users/${username}/repos`),
  fetchAllPages(`/users/${username}/events`, 3),
])
```

Pagination stops early as soon as a page returns under 100 items instead of always hitting the max — cuts 3–4 unnecessary requests per search. Events are capped at 3 pages because GitHub only holds ~90 days of event history anyway, so paging further is pointless.

`403` and `429` responses throw named strings (`'RATE_LIMIT'`, `'NOT_FOUND'`) rather than raw HTTP errors so the UI can show a readable message instead of crashing.

---

## Stack

React + Vite, Framer Motion for animations, GitHub REST API (no auth). The heatmap and language bar are custom — no charting library.

---

## Run it locally

```bash
git clone https://github.com/Raghavtripathii/github-wrapped
cd github-wrapped
npm install
npm run dev
```

`http://localhost:5173` — no `.env`, no API keys, nothing else to set up.

---

## Code structure

```
src/
├── github.js            # fetching, pagination, error handling
├── dataProcessors.js    # pure functions — personality, languages, streaks, heatmap
├── App.jsx              # three screens: search / loading / results
└── components/
    └── Cards.jsx        # StatCard, Heatmap, LanguageBar, PersonalityCard, Skeleton
```

`github.js` and `dataProcessors.js` have no React in them. Kept them separate so I could verify the data pipeline was correct before building any UI.

---

## Limitations

- GitHub's `/events` endpoint only keeps ~90 days of history regardless of how many pages you fetch. Personality and streak data reflects that window, not a full year.
- 60 unauthenticated requests/hour per IP. The app handles hitting the limit gracefully but you will need to wait a minute before retrying if you search a lot.
- Private repos aren't included — this only reads public data.

---

© 2026 Raghavendra Tripathi. All rights reserved.  
This repository is for portfolio demonstration only. The code may not be copied, reused, or redistributed without explicit written permission from the author.