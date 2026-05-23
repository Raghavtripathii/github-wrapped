// App.jsx - Main Application Controller and Core Layout Pipeline
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { fetchGithubUserData } from './github.js'
import {
  getLanguageBreakdown,
  getTopRepos,
  getCommitStreaks,
  getDeveloperPersonality,
  getHeatmapData,
  getSummaryStats,
} from './dataProcessors.js'

import {
  StatCard,
  LanguageBar,
  Heatmap,
  RepoCard,
  PersonalityCard,
  Skeleton,
} from './components/Cards.jsx'

// Renders skeleton layouts during async data fetching sequences
function LoadingScreen() {
  return (
    <div style={{
      maxWidth: 860,
      margin: '0 auto',
      padding: '3rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
    }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Skeleton width={80} height={80} radius={40} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton width="45%" height={26} />
          <Skeleton width="65%" height={16} />
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
      }}>
        <Skeleton height={96} radius={16} />
        <Skeleton height={96} radius={16} />
        <Skeleton height={96} radius={16} />
        <Skeleton height={96} radius={16} />
      </div>

      <Skeleton height={180} radius={20} />
      <Skeleton height={120} radius={16} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Skeleton height={120} radius={14} />
        <Skeleton height={120} radius={14} />
      </div>
    </div>
  )
}

// Landing view managing user input submission and basic search queries
function SearchScreen({ onSearch, error }) {
  const [inputValue, setInputValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const username = inputValue.trim()
    if (username) onSearch(username)
  }

  const demoUsers = ['torvalds', 'sindresorhus', 'gaearon', 'yyx990803']

  return (
    <motion.div
      key="search"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      style={{
        maxWidth: 540,
        margin: '0 auto',
        padding: '5rem 1.5rem 3rem',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 72,
          height: 72,
          background: 'linear-gradient(135deg, #7c6af7, #f472b6)',
          borderRadius: 20,
          fontSize: 36,
          marginBottom: '2rem',
        }}
      >
        🐙
      </motion.div>

      <h1 style={{
        fontSize: 'clamp(2.2rem, 6vw, 3.8rem)',
        fontWeight: 800,
        lineHeight: 1.1,
        marginBottom: '1rem',
        background: 'linear-gradient(135deg, #f0f0f8 20%, #7c6af7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontFamily: "'Syne', sans-serif",
      }}>
        GitHub<br />Wrapped
      </h1>

      <p style={{
        fontSize: 15,
        color: '#9090a8',
        lineHeight: 1.7,
        marginBottom: '2.5rem',
      }}>
        Enter any GitHub username to see their year in code —<br />
        languages, streaks, personality type, and top repos.
      </p>

      <form onSubmit={handleSubmit} style={{ marginBottom: '1.25rem' }}>
        <div style={{
          display: 'flex',
          border: '1.5px solid rgba(255,255,255,0.14)',
          borderRadius: 14,
          overflow: 'hidden',
          background: '#111118',
        }}>
          <span style={{
            padding: '0 0 0 1.25rem',
            display: 'flex',
            alignItems: 'center',
            color: '#5a5a72',
            fontSize: 17,
            userSelect: 'none',
          }}>
            @
          </span>

          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="username"
            autoFocus
            style={{
              flex: 1,
              padding: '0.9rem 0.75rem',
              fontSize: 16,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f0f0f8',
              fontFamily: "'Space Mono', monospace",
            }}
          />

          <button
            type="submit"
            disabled={!inputValue.trim()}
            style={{
              padding: '0 1.5rem',
              background: inputValue.trim() ? '#7c6af7' : '#1a1a24',
              color: inputValue.trim() ? 'white' : '#5a5a72',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s, color 0.2s',
              fontFamily: "'Syne', sans-serif",
              borderLeft: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Wrap it →
          </button>
        </div>
      </form>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: '#2d1515',
            border: '1px solid #7f1d1d',
            borderRadius: 10,
            padding: '0.75rem 1rem',
            color: '#fca5a5',
            fontSize: 13,
            marginBottom: '1.25rem',
            textAlign: 'left',
          }}
        >
          {error === 'NOT_FOUND'
            ? "😶 Couldn't find that user. Double-check the spelling."
            : error === 'RATE_LIMIT'
            ? '⏳ GitHub rate limit hit. Wait about a minute and try again.'
            : '⚠️ Something went wrong. Please try again.'}
        </motion.div>
      )}

      <div style={{
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 12, color: '#5a5a72' }}>Try:</span>
        {demoUsers.map(username => (
          <button
            key={username}
            onClick={() => onSearch(username)}
            style={{
              padding: '4px 14px',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 20,
              fontSize: 12,
              color: '#9090a8',
              background: '#111118',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: "'Space Mono', monospace",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#7c6af7'
              e.currentTarget.style.color = '#a78bfa'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'
              e.currentTarget.style.color = '#9090a8'
            }}
          >
            {username}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// Layout utility wrapper for modular dashboard subdivisions
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '2.25rem' }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#5a5a72',
        marginBottom: '1rem',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// Main analytics dashboard presenting consolidated visualization elements
function ResultsScreen({ data, onReset }) {
  const { user, stats, languages, topRepos, streaks, personality, heatmap } = data

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        maxWidth: 860,
        margin: '0 auto',
        padding: '2rem 1.5rem 5rem',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
      }}>
        <button
          onClick={onReset}
          style={{
            fontSize: 12,
            color: '#9090a8',
            padding: '6px 14px',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            cursor: 'pointer',
            background: 'transparent',
            fontFamily: "'Syne', sans-serif",
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#f0f0f8'}
          onMouseLeave={e => e.currentTarget.style.color = '#9090a8'}
        >
          ← Search again
        </button>
        <span style={{ fontSize: 12, color: '#5a5a72' }}>
          GitHub Wrapped
        </span>
      </div>

      {/* User profile overview layout */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          display: 'flex',
          gap: '1.25rem',
          alignItems: 'center',
          marginBottom: '2.5rem',
          padding: '1.5rem',
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          flexWrap: 'wrap',
        }}
      >
        <img
          src={user.avatar}
          alt={user.name}
          style={{
            width: 76,
            height: 76,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.12)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{
            fontSize: 22,
            fontWeight: 800,
            fontFamily: "'Syne', sans-serif",
            marginBottom: 4,
          }}>
            {user.name}
          </div>
          <div style={{ fontSize: 13, color: '#5a5a72', marginBottom: 6 }}>
            @{user.login} · on GitHub since {user.joinedYear}
          </div>
          {user.bio && (
            <div style={{ fontSize: 13, color: '#9090a8', lineHeight: 1.55 }}>
              {user.bio}
            </div>
          )}
        </div>
        <a
          href={`https://github.com/${user.login}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '8px 16px',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 10,
            fontSize: 12,
            color: '#9090a8',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#f0f0f8'}
          onMouseLeave={e => e.currentTarget.style.color = '#9090a8'}
        >
          View profile ↗
        </a>
      </motion.div>

      <Section title="At a glance">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
        }}>
          <StatCard emoji="📁" label="Public repos"  value={stats.totalRepos.toLocaleString()}  delay={0.1} />
          <StatCard emoji="⭐" label="Total stars"   value={stats.totalStars.toLocaleString()}   color="#f59e0b" delay={0.2} />
          <StatCard emoji="🍴" label="Total forks"   value={stats.totalForks.toLocaleString()}   color="#22d3a0" delay={0.3} />
          <StatCard emoji="👥" label="Followers"     value={stats.followers.toLocaleString()}    color="#f472b6" delay={0.4} />
        </div>
      </Section>

      <Section title="Developer personality">
        <PersonalityCard personality={personality} delay={0.2} />
      </Section>

      <Section title="Commit streaks">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
        }}>
          <StatCard emoji="🔥" label="Current streak"  value={`${streaks.currentStreak}d`}  color="#f59e0b" delay={0.1} />
          <StatCard emoji="🏆" label="Longest streak"  value={`${streaks.longestStreak}d`}  color="#a78bfa" delay={0.2} />
          <StatCard emoji="📅" label="Active days"     value={streaks.totalActiveDays}       color="#22d3a0" delay={0.3} />
        </div>
      </Section>

      {languages.length > 0 && (
        <Section title="Language breakdown">
          <div style={{
            background: '#111118',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '1.5rem',
          }}>
            <LanguageBar languages={languages} />
          </div>
        </Section>
      )}

      <Section title="Contribution activity — last 52 weeks">
        <div style={{
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '1.5rem',
        }}>
          <Heatmap weeks={heatmap} />
        </div>
      </Section>

      {topRepos.length > 0 && (
        <Section title="Top repositories">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}>
            {topRepos.map((repo, i) => (
              <RepoCard key={repo.name} repo={repo} delay={i * 0.08 + 0.1} />
            ))}
          </div>
        </Section>
      )}
    </motion.div>
  )
}

// Orchestrates central navigation phases and orchestrates state mapping sequences
export default function App() {
  const [phase, setPhase] = useState('search')
  const [data, setData]   = useState(null)
  const [error, setError] = useState(null)

  async function handleSearch(username) {
    setPhase('loading')
    setError(null)

    try {
      const raw = await fetchGithubUserData(username)

      const processed = {
        user: {
          name:       raw.userInfo.name || raw.userInfo.login,
          login:      raw.userInfo.login,
          avatar:     raw.userInfo.avatar_url,
          bio:        raw.userInfo.bio,
          joinedYear: new Date(raw.userInfo.created_at).getFullYear(),
        },
        stats:       getSummaryStats(raw.userInfo, raw.repos),
        languages:   getLanguageBreakdown(raw.repos),
        topRepos:    getTopRepos(raw.repos),
        streaks:     getCommitStreaks(raw.events),
        personality: getDeveloperPersonality(raw.events),
        heatmap:     getHeatmapData(raw.events),
      }

      setData(processed)
      setPhase('results')

    } catch (err) {
      setError(err.message)
      setPhase('search')
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(124,106,247,0.13) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {phase === 'search' && (
            <SearchScreen
              key="search"
              onSearch={handleSearch}
              error={error}
            />
          )}

          {phase === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LoadingScreen />
            </motion.div>
          )}

          {phase === 'results' && data && (
            <ResultsScreen
              key="results"
              data={data}
              onReset={() => {
                setPhase('search')
                setData(null)
                setError(null)
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}