import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fetchContributionCalendar } from './lib/contributionsQuery.js'

function contributionsDevProxy(githubToken) {
  return {
    name: 'contributions-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/contributions')) return next()

        const { searchParams } = new URL(req.url, 'http://localhost')
        const { status, body } = await fetchContributionCalendar(
          searchParams.get('username'),
          githubToken
        )

        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(body))
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // third arg '' loads every env var, not just VITE_-prefixed ones - the
  // token stays server-side in this config file, never reaches the browser
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), contributionsDevProxy(env.GITHUB_TOKEN)],
  }
})