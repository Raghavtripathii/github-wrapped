// github.js
// Handles communication with the GitHub API to fetch raw user data.

const GITHUB_BASE = 'https://api.github.com';

// Helper function for making API requests with basic error handling
async function fetchFromGithub(endpoint) {
  const url = `${GITHUB_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (response.status === 404) {
    throw new Error('NOT_FOUND');
  }

  if (response.status === 403 || response.status === 429) {
    throw new Error('RATE_LIMIT');
  }

  if (!response.ok) {
    throw new Error(`GitHub error: ${response.status}`);
  }

  return response.json();
}

// Handles paginated GitHub API endpoints to fetch all available items
async function fetchAllPages(endpoint, maxPages = 4) {
  const allItems = [];

  for (let page = 1; page <= maxPages; page++) {
    const separator = endpoint.includes('?') ? '&' : '?';
    const data = await fetchFromGithub(
      `${endpoint}${separator}per_page=100&page=${page}`
    );

    if (!Array.isArray(data) || data.length === 0) break;

    allItems.push(...data);

    // Break the loop if the current page has fewer than 100 items (last page reached)
    if (data.length < 100) break;
  }

  return allItems;
}

// Main function to concurrently fetch user profile, repositories, and recent events
export async function fetchGithubUserData(username) {
  const [userInfo, repos, events] = await Promise.all([
    fetchFromGithub(`/users/${username}`),
    fetchAllPages(`/users/${username}/repos`),
    fetchAllPages(`/users/${username}/events`, 3),
  ]);

  return {
    userInfo,
    repos,
    events,
  };
}