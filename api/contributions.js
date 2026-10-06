// api/contributions.js
import { fetchContributionCalendar } from '../lib/contributionsQuery.js'

export default async function handler(req, res) {
  const { status, body } = await fetchContributionCalendar(
    req.query.username,
    process.env.GITHUB_TOKEN
  )

  res.setHeader('Cache-Control', 'no-store')

  res.status(status).json(body)
}