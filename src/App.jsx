import React, { useState } from 'react'
import { fetchGithubUserData } from './github.js'

// TODO: Temporary API check. Verify data in console before building UI.
export default function App() {
  const [status, setStatus] = useState('idle')

  async function handleTest() {
    setStatus('loading...')
    try {
      const data = await fetchGithubUserData('torvalds')
      console.log('User:', data.userInfo)
      console.log('Repos:', data.repos.length, 'repos fetched')
      console.log('Events:', data.events.length, 'events fetched')
      console.log('First repo:', data.repos[0])
      setStatus(`Done! Check console. Got ${data.repos.length} repos.`)
    } catch (err) {
      console.error(err)
      setStatus('Error: ' + err.message)
    }
  }

  return (
    <div style={{ padding: '2rem', color: 'white' }}>
      <h1 style={{ marginBottom: '1rem' }}>GitHub Wrapped — API Test</h1>
      <button
        onClick={handleTest}
        style={{
          padding: '10px 20px',
          background: '#7c6af7',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        Test API Call
      </button>
      <p style={{ marginTop: '1rem', color: '#9090a8' }}>{status}</p>
      <p style={{ marginTop: '0.5rem', color: '#5a5a72', fontSize: '13px' }}>
        (Open browser DevTools → Console tab to see raw data)
      </p>
    </div>
  )
}