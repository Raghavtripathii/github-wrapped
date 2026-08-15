const CONTRIBUTION_EVENT_TYPES = new Set([
  'PushEvent',
  'PullRequestEvent',
  'PullRequestReviewEvent',
  'PullRequestReviewCommentEvent',
  'IssuesEvent',
  'IssueCommentEvent',
  'CommitCommentEvent',
])

function isContributionEvent(event) {
  return CONTRIBUTION_EVENT_TYPES.has(event.type)
}

// Shared streak math — works the same whether the active days came from the
function computeStreakStats(activeDays) {
  const sortedDays = [...activeDays].sort()

  if (sortedDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 }
  }

  let longestStreak = 1
  let tempStreak = 1

  for (let i = 1; i < sortedDays.length; i++) {
    const yesterday = new Date(sortedDays[i - 1])
    const today = new Date(sortedDays[i])
    const diffInDays = (today - yesterday) / (1000 * 60 * 60 * 24)

    if (diffInDays === 1) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 1
    }
  }

  // Compare calendar dates, not raw timestamps — otherwise time-of-day can
  // wrongly break a streak that's actually still alive.
  const todayKey = new Date().toISOString().split('T')[0]
  const lastActiveKey = sortedDays[sortedDays.length - 1]
  const daysSinceLastActive =
    (new Date(todayKey) - new Date(lastActiveKey)) / (1000 * 60 * 60 * 24)
  const currentStreak = daysSinceLastActive <= 1 ? tempStreak : 0

  return {
    currentStreak,
    longestStreak,
    totalActiveDays: activeDays.size,
  }
}

// 1. Language Breakdown
export function getLanguageBreakdown(repos) {
  const languageSizes = {}

  repos.forEach((repo) => {
    if (!repo.language) return

    const currentSize = languageSizes[repo.language] || 0
    languageSizes[repo.language] = currentSize + (repo.size || 1)
  })

  const totalSize = Object.values(languageSizes).reduce(
    (sum, size) => sum + size,
    0
  )

  if (totalSize === 0) return []

  return Object.entries(languageSizes)
    .map(([name, size]) => ({
      name,
      percent: Math.round((size / totalSize) * 100),
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 6)
}

// 2. Top Repositories
function isProfileReadmeRepo(repo, login) {
  return Boolean(login) && repo.name.toLowerCase() === login.toLowerCase()
}

function scoreRepo({ stars, forks, commits, hasDescription }) {
  const engagement = Math.log2(stars + 1) * 3 + Math.log2(forks + 1) * 2
  const effort = Math.log2((commits ?? 0) + 1) * 2.5
  const bonus = hasDescription ? 1 : 0
  return engagement + effort + bonus
}

function rankTop4(pool, toScoreInput) {
  return [...pool]
    .sort((a, b) => {
      const diff = scoreRepo(toScoreInput(b)) - scoreRepo(toScoreInput(a))
      if (diff !== 0) return diff
      return new Date(b.pushed_at) - new Date(a.pushed_at)
    })
    .slice(0, 4)
}


export function getTopRepos(repoStats, login) {
  const eligible = repoStats.filter((r) => !r.fork && !r.archived && !isProfileReadmeRepo(r, login))
  const pool = eligible.length > 0 ? eligible : repoStats.filter((r) => !isProfileReadmeRepo(r, login))

  return rankTop4(pool, (r) => ({
    stars: r.stars,
    forks: r.forks,
    commits: r.commitCount,
    hasDescription: Boolean(r.description),
  })).map((r) => ({
    name: r.name,
    description: r.description || '',
    stars: r.stars,
    forks: r.forks,
    language: r.language,
    url: r.url,
  }))
}

export function getTopReposEstimate(repos, login) {
  const eligible = repos.filter((r) => !r.fork && !r.archived && !isProfileReadmeRepo(r, login))
  const pool = eligible.length > 0 ? eligible : repos.filter((r) => !isProfileReadmeRepo(r, login))

  return rankTop4(pool, (r) => ({
    stars: r.stargazers_count,
    forks: r.forks_count,
    commits: null,
    hasDescription: Boolean(r.description),
  })).map((r) => ({
    name: r.name,
    description: r.description || '',
    stars: r.stargazers_count,
    forks: r.forks_count,
    language: r.language,
    url: r.html_url,
  }))
}

// 3. Commit Streaks — best-effort, from the public events feed.
export function getCommitStreaks(events) {
  const activeDays = new Set()

  events.forEach((event) => {
    if (!isContributionEvent(event)) return
    activeDays.add(new Date(event.created_at).toISOString().split('T')[0])
  })

  return computeStreakStats(activeDays)
}

// 3b. Commit Streaks — exact, from the authenticated contribution calendar.
export function getCommitStreaksFromCalendar(contributionCalendar) {
  const activeDays = new Set()

  contributionCalendar.weeks.forEach((week) => {
    week.contributionDays.forEach((day) => {
      if (day.contributionCount > 0) activeDays.add(day.date)
    })
  })

  return computeStreakStats(activeDays)
}

// 4. Developer Personality
export function getDeveloperPersonality(events) {
  const hourCounts = new Array(24).fill(0)
  const dayCounts = new Array(7).fill(0) // 0 = Sunday, 6 = Saturday
  let totalPushEvents = 0

  events.forEach((event) => {
    if (event.type !== 'PushEvent') return
    const date = new Date(event.created_at)
    hourCounts[date.getHours()]++
    dayCounts[date.getDay()]++
    totalPushEvents++
  })

  if (totalPushEvents === 0) {
    return {
      type: 'The Ghost',
      emoji: '👻',
      description: 'Commits in mysterious silence. No one knows when or how.',
      color: '#7c6af7',
    }
  }

  const midnightTo6am = hourCounts.slice(0, 6).reduce((a, b) => a + b, 0)
  const lateNight = hourCounts.slice(22).reduce((a, b) => a + b, 0) + hourCounts[0] + hourCounts[1]
  const weekendCommits = (dayCounts[0] + dayCounts[6]) / totalPushEvents
  const afternoonCommits = hourCounts.slice(13, 18).reduce((a, b) => a + b, 0) / totalPushEvents
  const morningCommits = hourCounts.slice(6, 10).reduce((a, b) => a + b, 0) / totalPushEvents

  if (lateNight / totalPushEvents > 0.3) {
    return {
      type: 'Night Owl',
      emoji: '🦉',
      description: 'Writing the best code when the world is asleep. Builds at 2am, sleeps at noon.',
      color: '#7c6af7',
    }
  }

  if (weekendCommits > 0.45) {
    return {
      type: 'Weekend Warrior',
      emoji: '⚔️',
      description: 'Weekdays are for meetings. Real shipping happens on Saturday and Sunday.',
      color: '#f59e0b',
    }
  }

  if (morningCommits > 0.35) {
    return {
      type: 'Early Bird',
      emoji: '🐦',
      description: 'Tackles the hardest problems before most people drink their first coffee.',
      color: '#f472b6',
    }
  }

  if (afternoonCommits > 0.4) {
    return {
      type: 'Afternoon Architect',
      emoji: '🌇',
      description: 'Peak focus hits after lunch, every single day. Coffee-fuelled and unstoppable.',
      color: '#22d3a0',
    }
  }

  return {
    type: 'Steady Builder',
    emoji: '🏗️',
    description: 'Consistent, reliable, always shipping. The person every team wants but few have.',
    color: '#60a5fa',
  }
}

// 5. Contribution Heatmap Data — best-effort, same source/limits as getCommitStreaks.
export function getHeatmapData(events) {
  const contributionsByDate = {}

  events.forEach((event) => {
    if (!isContributionEvent(event)) return
    const date = new Date(event.created_at).toISOString().split('T')[0]
    const weight = event.type === 'PushEvent'
      ? (event.payload?.commits?.length || 1)
      : 1
    contributionsByDate[date] = (contributionsByDate[date] || 0) + weight
  })

  const weeks = []
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 52 * 7)

  for (let week = 0; week < 52; week++) {
    const days = []
    for (let day = 0; day < 7; day++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + week * 7 + day)
      const dateKey = date.toISOString().split('T')[0]
      days.push({
        date: dateKey,
        count: contributionsByDate[dateKey] || 0,
      })
    }
    weeks.push(days)
  }

  return weeks
}

// 5b. Contribution Heatmap Data — exact, from the authenticated calendar.
// Reshaped into the same 52-week x 7-day grid the Heatmap component expects.
export function getHeatmapFromCalendar(contributionCalendar) {
  const allDays = contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .map((day) => ({ date: day.date, count: day.contributionCount }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  const last364Days = allDays.slice(-364)

  const weeks = []
  for (let i = 0; i < last364Days.length; i += 7) {
    weeks.push(last364Days.slice(i, i + 7))
  }

  return weeks
}

// 6. Summary Stats
export function getSummaryStats(userInfo, repos) {
  return {
    totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    totalForks: repos.reduce((sum, repo) => sum + repo.forks_count, 0),
    totalRepos: userInfo.public_repos,
    followers: userInfo.followers,
    joinedYear: new Date(userInfo.created_at).getFullYear(),
  }
}