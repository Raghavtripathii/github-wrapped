
import { fetchRepoStats } from '../lib/repoStatsQuery.js'

export default async function handler(req, res) {
  const { status, body } = await fetchRepoStats(
    req.query.username,
    process.env.GITHUB_TOKEN
  )

  if (status === 200) {
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  }

  res.status(status).json(body)
}