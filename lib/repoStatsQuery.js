
export const REPO_STATS_QUERY = `
  query($username: String!) {
    user(login: $username) {
      repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
        nodes {
          name
          description
          url
          isFork
          isArchived
          stargazerCount
          forkCount
          pushedAt
          primaryLanguage { name }
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges {
              size
              node { name }
            }
          }
          defaultBranchRef {
            target {
              ... on Commit {
                history { totalCount }
              }
            }
          }
        }
      }
    }
  }
`

function mapRepo(node) {
  return {
    name: node.name,
    description: node.description || '',
    url: node.url,
    fork: node.isFork,
    archived: node.isArchived,
    stars: node.stargazerCount,
    forks: node.forkCount,
    pushed_at: node.pushedAt,
    language: node.primaryLanguage?.name || null,
    // real per-language byte counts, not just the one "primary" language
    languages: (node.languages?.edges || []).map((e) => ({
      name: e.node.name,
      bytes: e.size,
    })),
    // empty repos have no defaultBranchRef at all
    commitCount: node.defaultBranchRef?.target?.history?.totalCount || 0,
  }
}

// Returns { status, body }. Never throws - callers just forward this
// straight to the client as the HTTP response.
export async function fetchRepoStats(username, token) {
  if (!username) {
    return { status: 400, body: { error: 'missing username' } }
  }

  if (!token) {
    return { status: 500, body: { error: 'GITHUB_TOKEN not set' } }
  }

  let ghRes
  try {
    ghRes = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: REPO_STATS_QUERY,
        variables: { username },
      }),
    })
  } catch (err) {
    return { status: 502, body: { error: `network error reaching github: ${err.message}` } }
  }

  if (!ghRes.ok) {
    return { status: 502, body: { error: `github error ${ghRes.status}` } }
  }

  const json = await ghRes.json()

  if (json.errors?.length) {
    const notFound = json.errors.some((e) => e.type === 'NOT_FOUND')
    return { status: notFound ? 404 : 502, body: { error: json.errors[0].message } }
  }

  const nodes = json.data?.user?.repositories?.nodes

  if (!nodes) {
    return { status: 404, body: { error: 'not found' } }
  }

  return { status: 200, body: nodes.map(mapRepo) }
}