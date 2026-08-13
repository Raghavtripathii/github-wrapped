// lib/contributionsQuery.js
export const CONTRIBUTIONS_QUERY = `
  query($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`

// Returns { status, body }. Never throws - callers just forward this straight to the client as the HTTP response.
export async function fetchContributionCalendar(username, token) {
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
        query: CONTRIBUTIONS_QUERY,
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

  const calendar = json.data?.user?.contributionsCollection?.contributionCalendar

  if (!calendar) {
    return { status: 404, body: { error: 'not found' } }
  }

  return { status: 200, body: calendar }
}