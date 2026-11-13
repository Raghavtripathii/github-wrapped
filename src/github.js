const GITHUB_BASE = 'https://api.github.com'

async function fetchFromGithub(endpoint) {
  const url = `${GITHUB_BASE}${endpoint}`
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })

  if (response.status === 404) {
    throw new Error('NOT_FOUND')
  }

  if (response.status === 403 || response.status === 429) {
    throw new Error('RATE_LIMIT')
  }

  if (!response.ok) {
    throw new Error(`GitHub error: ${response.status}`)
  }

  return response.json()
}

// Handles paginated GitHub API endpoints to fetch all available items
async function fetchAllPages(endpoint, maxPages = 4) {
  const allItems = []

  for (let page = 1; page <= maxPages; page++) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const data = await fetchFromGithub(
      `${endpoint}${separator}per_page=100&page=${page}`
    )

    if (!Array.isArray(data) || data.length === 0) break

    allItems.push(...data)

    // Break the loop if the current page has fewer than 100 items (last page reached)
    if (data.length < 100) break
  }

  return allItems
}

// Calls one of our own /api routes. Any failure returns null so the app
// falls back to estimates, but the reason is logged instead of swallowed.
async function fetchFromProxy(path, username, label) {
  try {
    const res = await fetch(`${path}?username=${encodeURIComponent(username)}`)

    if (!res.ok) {
      const detail = await res.json().then((body) => body?.error).catch(() => null)
      console.warn(`[exact ${label} unavailable] ${res.status}${detail ? `: ${detail}` : ''}`)
      return null
    }

    return await res.json()
  } catch (err) {
    console.warn(`[exact ${label} unavailable] ${err.message}`)
    return null
  }
}

function fetchContributionCalendar(username) {
  return fetchFromProxy('/api/contributions', username, 'streaks')
}

function fetchRepoStats(username) {
  return fetchFromProxy('/api/repo-stats', username, 'repo stats')
}

export async function fetchGithubUserData(username) {
  const [userInfo, repos, events, contributionCalendar, repoStats] = await Promise.all([
    fetchFromGithub(`/users/${username}`),
    fetchAllPages(`/users/${username}/repos`),
    fetchAllPages(`/users/${username}/events`, 3),
    fetchContributionCalendar(username),
    fetchRepoStats(username),
  ])

  return {
    userInfo,
    repos,
    events,
    contributionCalendar,
    repoStats,
  }
}