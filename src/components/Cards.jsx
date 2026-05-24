// Cards.jsx - Dashboard UI Components and Visualizations
import { motion } from 'framer-motion'

// Global color mapping for GitHub language statistics
const LANGUAGE_COLORS = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python:     '#3572a5',
  Go:         '#00add8',
  Rust:       '#ce4a00',
  Java:       '#b07219',
  CSS:        '#563d7c',
  HTML:       '#e34c26',
  Vue:        '#4fc08d',
  Ruby:       '#cc342d',
  PHP:        '#4f5d95',
  'C++':      '#f34b7d',
  C:          '#555555',
  Kotlin:     '#a97bff',
  Swift:      '#f05138',
  Shell:      '#89e051',
  Dart:       '#00b4ab',
}

export function getLangColor(lang) {
  return LANGUAGE_COLORS[lang] || '#7c6af7'
}

// Reusable card component for individual user metrics (Stars, Forks, etc.)
export function StatCard({ label, value, emoji, color, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      style={{
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: '#5a5a72',
      }}>
        {emoji && <span style={{ marginRight: 5 }}>{emoji}</span>}
        {label}
      </div>

      <div style={{
        fontSize: 30,
        fontWeight: 800,
        color: color || '#f0f0f8',
        lineHeight: 1.1,
        fontFamily: "'Syne', sans-serif",
      }}>
        {value}
      </div>
    </motion.div>
  )
}

// Horizontal progress bar visualization representing repository language distribution
export function LanguageBar({ languages }) {
  return (
    <div>
      <div style={{
        display: 'flex',
        height: 10,
        borderRadius: 6,
        overflow: 'hidden',
        gap: 2,
        marginBottom: '1rem',
      }}>
        {languages.map((lang, i) => (
          <motion.div
            key={lang.name}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              delay: i * 0.08 + 0.2,
              duration: 0.6,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={{
              height: '100%',
              width: `${lang.percent}%`,
              background: getLangColor(lang.name),
              transformOrigin: 'left',
              borderRadius: 3,
              minWidth: 4,
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        {languages.map((lang, i) => (
          <motion.div
            key={lang.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 + 0.3 }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: getLangColor(lang.name),
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: '#9090a8' }}>
              {lang.name}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f0f8' }}>
              {lang.percent}%
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// Renders a custom 52-week SVG grid pattern mapping user commit intensity
export function Heatmap({ weeks }) {
  const allCounts = weeks.flat().map(d => d.count)
  const maxCount = Math.max(...allCounts, 1)

  // Dynamically computes background color opacity based on activity scaling
  function getSquareColor(count) {
    if (count === 0) return 'rgba(255,255,255,0.04)'
    const intensity = count / maxCount
    if (intensity < 0.25) return '#1e3a2f'
    if (intensity < 0.5)  return '#166534'
    if (intensity < 0.75) return '#16a34a'
    return '#22d3a0'
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${52 * 13} ${7 * 13}`}
        width="100%"
        style={{ display: 'block', minWidth: 580 }}
        role="img"
        aria-label="Contribution heatmap"
      >
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => (
            <rect
              key={`${weekIndex}-${dayIndex}`}
              x={weekIndex * 13}
              y={dayIndex * 13}
              width={11}
              height={11}
              rx={2}
              fill={getSquareColor(day.count)}
            >
              <title>
                {day.date}: {day.count} commit{day.count !== 1 ? 's' : ''}
              </title>
            </rect>
          ))
        )}
      </svg>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 5,
        marginTop: 10,
      }}>
        <span style={{ fontSize: 11, color: '#5a5a72' }}>Less</span>
        {['rgba(255,255,255,0.04)', '#1e3a2f', '#166534', '#16a34a', '#22d3a0'].map((color, i) => (
          <div
            key={i}
            style={{
              width: 11,
              height: 11,
              borderRadius: 2,
              background: color,
            }}
          />
        ))}
        <span style={{ fontSize: 11, color: '#5a5a72' }}>More</span>
      </div>
    </div>
  )
}

// Individual repository display card featuring stargazers and forks counts
export function RepoCard({ repo, delay = 0 }) {
  return (
    <motion.a
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -3, borderColor: 'rgba(124,106,247,0.5)' }}
      style={{
        display: 'block',
        background: '#111118',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '1rem 1.25rem',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
        gap: 8,
      }}>
        <div style={{
          fontWeight: 700,
          fontSize: 14,
          color: '#a78bfa',
          wordBreak: 'break-word',
         }}>
          {repo.name}
        </div>
        <div style={{
          display: 'flex',
          gap: 10,
          fontSize: 12,
          color: '#5a5a72',
          flexShrink: 0,
        }}>
          <span>⭐ {repo.stars}</span>
          <span>🍴 {repo.forks}</span>
        </div>
      </div>

      {repo.description && (
        <div style={{
          fontSize: 12,
          color: '#9090a8',
          marginBottom: 10,
          lineHeight: 1.55,
        }}>
          {repo.description.length > 100
            ? repo.description.slice(0, 100) + '…'
            : repo.description}
        </div>
      )}

      {repo.language && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 9,
            height: 9,
            borderRadius: '50%',
            background: getLangColor(repo.language),
          }} />
          <span style={{ fontSize: 11, color: '#5a5a72' }}>
            {repo.language}
          </span>
        </div>
      )}
    </motion.a>
  )
}

// Showcases customized developer behavioral profiles mapped from commit activity
export function PersonalityCard({ personality, delay = 0.4 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
      style={{
        background: `linear-gradient(135deg, ${personality.color}22 0%, #111118 65%)`,
        border: `1px solid ${personality.color}40`,
        borderRadius: 20,
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 52, marginBottom: 10, lineHeight: 1 }}>
        {personality.emoji}
      </div>

      <div style={{
        fontSize: 24,
        fontWeight: 800,
        color: personality.color,
        marginBottom: 10,
        fontFamily: "'Syne', sans-serif",
      }}>
        {personality.type}
      </div>

      <div style={{
        fontSize: 14,
        color: '#9090a8',
        lineHeight: 1.65,
        maxWidth: 300,
        margin: '0 auto',
      }}>
        {personality.description}
      </div>
    </motion.div>
  )
}

// Shimmer placeholder effect displayed during async network fetch sequences
export function Skeleton({ width = '100%', height = 20, radius = 8 }) {
  return (
    <div style={{
      width,
      height,
      borderRadius: radius,
      background: 'linear-gradient(90deg, #111118 0%, #1a1a24 50%, #111118 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.6s infinite linear',
    }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}