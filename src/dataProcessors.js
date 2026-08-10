// Core data transformation and metrics computation from raw GitHub API responses.

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
export function getTopRepos(repos) {
  const ownedAndActive = repos.filter((repo) => !repo.fork && !repo.archived)
  const pool = ownedAndActive.length > 0 ? ownedAndActive : repos

  return [...pool]
    .sort((a, b) => {
      const scoreA = a.stargazers_count + a.forks_count
      const scoreB = b.stargazers_count + b.forks_count

      if (scoreB !== scoreA) return scoreB - scoreA
      return new Date(b.pushed_at) - new Date(a.pushed_at)
    })
    .slice(0, 4)
    .map((repo) => ({
      name: repo.name,
      description: repo.description || '',
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      url: repo.html_url,
    }))
}

// 3. Commit Streaks
export function getCommitStreaks(events) {
  const activeDays = new Set()

  events.forEach((event) => {
    if (!isContributionEvent(event)) return
    const date = new Date(event.created_at).toISOString().split('T')[0]
    activeDays.add(date)
  })

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

  // Compare calendar dates, not raw timestamps, so time-of-day doesn't
  // affect whether the last active day counts as "today or yesterday".
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

// 5. Contribution Heatmap Data
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