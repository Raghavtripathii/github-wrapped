// dataProcessors.js
// Handles core data transformation and metrics computation from raw GitHub API responses.

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
    .sort((a, b) => b.percent - a.percent) // Sort by highest percentage descending
    .slice(0, 6) // Cap output to top 6 dominant languages
}

// 2. Top Repositories 
export function getTopRepos(repos) {
  return [...repos]
    .sort(
      (a, b) =>
        b.stargazers_count + b.forks_count - (a.stargazers_count + a.forks_count)
    )
    .slice(0, 4) // Extract top 4 repositories based on engagement metrics
    .map((repo) => ({
      name: repo.name,
      description: repo.description || '',
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      url: repo.html_url,
    }))
}

//  3. Commit Streaks 
export function getCommitStreaks(events) {
  const daysWithCommits = new Set()

  // Filter for unique calendar dates containing PushEvents
  events.forEach((event) => {
    if (event.type !== 'PushEvent') return
    const date = new Date(event.created_at).toISOString().split('T')[0]
    daysWithCommits.add(date)
  })

  const sortedDays = [...daysWithCommits].sort()

  if (sortedDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalActiveDays: 0 }
  }

  let longestStreak = 1
  let tempStreak = 1

  // Compute consecutive day intervals
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

  // Validate if the current streak is still active (committed today or yesterday)
  const lastCommitDay = new Date(sortedDays[sortedDays.length - 1])
  const today = new Date()
  const daysSinceLastCommit = (today - lastCommitDay) / (1000 * 60 * 60 * 24)
  const currentStreak = daysSinceLastCommit <= 1 ? tempStreak : 0

  return {
    currentStreak,
    longestStreak,
    totalActiveDays: daysWithCommits.size,
  }
}

//  4. Developer Personality 
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

  // Segment metrics based on specific working hours and patterns
  const midnightTo6am = hourCounts.slice(0, 6).reduce((a, b) => a + b, 0)
  const lateNight = hourCounts.slice(22).reduce((a, b) => a + b, 0) + hourCounts[0] + hourCounts[1]
  const weekendCommits = (dayCounts[0] + dayCounts[6]) / totalPushEvents
  const afternoonCommits = hourCounts.slice(13, 18).reduce((a, b) => a + b, 0) / totalPushEvents
  const morningCommits = hourCounts.slice(6, 10).reduce((a, b) => a + b, 0) / totalPushEvents

  // Behavioral profile heuristics evaluation order
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

//  5. Contribution Heatmap Data 
export function getHeatmapData(events) {
  const commitsByDate = {}

  events.forEach((event) => {
    if (event.type !== 'PushEvent') return
    const date = new Date(event.created_at).toISOString().split('T')[0]
    const commitsInThisPush = event.payload?.commits?.length || 1
    commitsByDate[date] = (commitsByDate[date] || 0) + commitsInThisPush
  })

  // Generate a continuous 52-week grid layout backwards from current point
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
        count: commitsByDate[dateKey] || 0,
      })
    }
    weeks.push(days)
  }

  return weeks
}

//  6. Summary Stats 
export function getSummaryStats(userInfo, repos) {
  return {
    totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    totalForks: repos.reduce((sum, repo) => sum + repo.forks_count, 0),
    totalRepos: userInfo.public_repos,
    followers: userInfo.followers,
    joinedYear: new Date(userInfo.created_at).getFullYear(),
  }
}