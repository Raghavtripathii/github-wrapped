// api/contributions.js
import { fetchContributionCalendar } from '../lib/contributionsQuery.js'

export default async function handler(req, res) {
  const { status, body } = await fetchContributionCalendar(
    req.query.username,
    process.env.GITHUB_TOKEN
  )

  // this only needs to be fresh once a day, so let it cache
  if (status === 200) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  }

  res.status(status).json(body)
}