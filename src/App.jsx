import React, { useState } from 'react'
import { fetchGithubUserData } from './github.js'
import {
  getLanguageBreakdown,
  getTopRepos,
  getCommitStreaks,
  getDeveloperPersonality,
  getHeatmapData,
  getSummaryStats,
} from './dataProcessors.js'

export default function App() {
  const [status, setStatus] = useState('idle')
  const [processed, setProcessed] = useState(null)

  async function handleTest() {
    setStatus('Fetching from GitHub...')
    try {
      // Step 1: Fetch raw data layer
      const raw = await fetchGithubUserData('torvalds')
      setStatus('Processing data metrics...')

      // Step 2: Run processing and transformation pipeline
      const result = {
        user: {
          name: raw.userInfo.name || raw.userInfo.login,
          login: raw.userInfo.login,
          avatar: raw.userInfo.avatar_url,
          bio: raw.userInfo.bio,
        },
        languages: getLanguageBreakdown(raw.repos),
        topRepos: getTopRepos(raw.repos),
        streaks: getCommitStreaks(raw.events),
        personality: getDeveloperPersonality(raw.events),
        heatmap: getHeatmapData(raw.events),
        stats: getSummaryStats(raw.userInfo, raw.repos),
      }

      // Output diagnostics to console for pipeline validation
      console.log('=== PROCESSED DATA ===')
      console.log('User:', result.user)
      console.log('Languages:', result.languages)
      console.log('Top Repos:', result.topRepos)
      console.log('Streaks:', result.streaks)
      console.log('Personality:', result.personality)
      console.log('Stats:', result.stats)
      console.log('Heatmap weeks:', result.heatmap.length)

      setProcessed(result)
      setStatus('Done! Data ready. Check console for details.')
    } catch (err) {
      console.error(err)
      setStatus('Error: ' + err.message)
    }
  }

  return (
    <div style={{ padding: '2rem', color: 'white', fontFamily: 'monospace' }}>
      <h1 style={{ marginBottom: '0.5rem', fontFamily: 'Syne, sans-serif' }}>
        GitHub Wrapped — Day 1 Data Test
      </h1>
      <p style={{ color: '#9090a8', marginBottom: '1.5rem', fontSize: '13px' }}>
        Data ingestion and processing pipeline verification. UI construction will follow in Day 2.
      </p>

      <button
        onClick={handleTest}
        style={{
          padding: '10px 24px',
          background: '#7c6af7',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontFamily: 'Syne, sans-serif',
        }}
      >
        Run Full Pipeline
      </button>

      <p style={{ marginTop: '1rem', color: '#9090a8', fontSize: '13px' }}>
        {status}
      </p>

      {/* Temporary state preview layout used for local debugging purposes */}
      {processed && (
        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: '#111118', padding: '1rem', borderRadius: '10px', border: '1px solid #1a1a24' }}>
            <p style={{ color: '#5a5a72', fontSize: '11px', marginBottom: '6px' }}>PERSONALITY</p>
            <p style={{ fontSize: '20px' }}>
              {processed.personality.emoji} {processed.personality.type}
            </p>
            <p style={{ color: '#9090a8', fontSize: '12px', marginTop: '4px' }}>
              {processed.personality.description}
            </p>
          </div>

          <div style={{ background: '#111118', padding: '1rem', borderRadius: '10px', border: '1px solid #1a1a24' }}>
            <p style={{ color: '#5a5a72', fontSize: '11px', marginBottom: '8px' }}>TOP LANGUAGES</p>
            {processed.languages.map((lang) => (
              <p key={lang.name} style={{ fontSize: '13px', color: '#f0f0f8', marginBottom: '3px' }}>
                {lang.name}: {lang.percent}%
              </p>
            ))}
          </div>

          <div style={{ background: '#111118', padding: '1rem', borderRadius: '10px', border: '1px solid #1a1a24' }}>
            <p style={{ color: '#5a5a72', fontSize: '11px', marginBottom: '8px' }}>STREAKS</p>
            <p style={{ fontSize: '13px' }}>
              Current: {processed.streaks.currentStreak} days &nbsp;|&nbsp;
              Longest: {processed.streaks.longestStreak} days &nbsp;|&nbsp;
              Active days: {processed.streaks.totalActiveDays}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}