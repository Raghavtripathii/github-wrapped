import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchContributionCalendar } from './lib/contributionsQuery.js'
import { fetchRepoStats } from './lib/repoStatsQuery.js'

function apiDevProxy(githubToken) {
  return {
    name: 'api-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const { pathname, searchParams } = new URL(req.url, 'http://localhost')

        if (pathname === '/api/contributions') {
          const { status, body } = await fetchContributionCalendar(
            searchParams.get('username'),
            githubToken
          )
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
          return
        }

        if (pathname === '/api/repo-stats') {
          const { status, body } = await fetchRepoStats(
            searchParams.get('username'),
            githubToken
          )
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
          return
        }

        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), apiDevProxy(env.GITHUB_TOKEN)],
  }
})