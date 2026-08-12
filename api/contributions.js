// api/contributions.js

const CONTRIBUTIONS_QUERY = `
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

export default async function handler(req, res) {
  const username = req.query.username

  if (!username) {
    res.status(400).json({ error: 'missing username' })
    return
  }

  const token = process.env.GITHUB_TOKEN

  if (!token) {
    res.status(500).json({ error: 'GITHUB_TOKEN not set' })
    return
  }

  const ghRes = await fetch('https://api.github.com/graphql', {
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

  if (!ghRes.ok) {
    res.status(502).json({ error: `github error ${ghRes.status}` })
    return
  }

  const json = await ghRes.json()

  if (json.errors?.length) {
    const notFound = json.errors.some((e) => e.type === 'NOT_FOUND')
    res.status(notFound ? 404 : 502).json({ error: json.errors[0].message })
    return
  }

  const calendar = json.data?.user?.contributionsCollection?.contributionCalendar

  if (!calendar) {
    res.status(404).json({ error: 'not found' })
    return
  }

  // this only needs to be fresh once a day, so let it cache
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  res.status(200).json(calendar)
}