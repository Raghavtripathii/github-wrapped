const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 18
const CONTENT_W = PAGE_W - MARGIN * 2

const COLORS = {
  text: [24, 24, 32],
  muted: [110, 110, 125],
  line: [222, 222, 230],
  accent: [91, 70, 220],
  heat: [
    [235, 237, 240],
    [172, 228, 190],
    [102, 201, 140],
    [40, 167, 98],
    [18, 120, 70],
  ],
}

// helvetica only covers latin-1, so strip anything it can't draw (emoji etc.)
function clean(text = '') {
  return String(text)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function loadAvatar(url) {
  try {
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}s=160`)
    if (!res.ok) return null

    const blob = await res.blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    return { dataUrl, type: blob.type.includes('png') ? 'PNG' : 'JPEG' }
  } catch {
    return null
  }
}

function heatColor(count, max) {
  if (count === 0) return COLORS.heat[0]
  const ratio = count / max
  if (ratio < 0.25) return COLORS.heat[1]
  if (ratio < 0.5) return COLORS.heat[2]
  if (ratio < 0.75) return COLORS.heat[3]
  return COLORS.heat[4]
}

export async function buildReport(data, avatar = null) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const { user, stats, languages, languagesExact, topRepos, streaks, streaksExact, personality, heatmap } = data
  let y = MARGIN

  const setColor = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2])

  function ensureSpace(height) {
    if (y + height > PAGE_H - 18) {
      doc.addPage()
      y = MARGIN
    }
  }

  // needed = room the title plus its first block must fit in, so a title never sits alone at the bottom of a page
  function sectionTitle(title, needed = 16) {
    ensureSpace(needed)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    setColor(COLORS.muted)
    doc.text(title.toUpperCase(), MARGIN, y, { charSpace: 0.6 })
    y += 2.5
    doc.setDrawColor(...COLORS.line)
    doc.setLineWidth(0.3)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 6
  }

  function note(text) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    setColor(COLORS.muted)
    doc.text(clean(text), MARGIN, y)
    y += 5
  }

  function statRow(items) {
    const gap = 4
    const width = (CONTENT_W - gap * (items.length - 1)) / items.length
    const height = 20

    ensureSpace(height + 4)

    items.forEach((item, i) => {
      const x = MARGIN + i * (width + gap)
      doc.setDrawColor(...COLORS.line)
      doc.setLineWidth(0.3)
      doc.roundedRect(x, y, width, height, 2, 2, 'S')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      setColor(COLORS.muted)
      doc.text(item.label.toUpperCase(), x + 4, y + 6.5, { charSpace: 0.3 })

      doc.setFontSize(17)
      setColor(COLORS.text)
      doc.text(String(item.value), x + 4, y + 15.5)
    })

    y += height + 8
  }

  // header
  const textWidth = avatar ? CONTENT_W - 32 : CONTENT_W

  if (avatar) {
    doc.addImage(avatar.dataUrl, avatar.type, PAGE_W - MARGIN - 26, y - 2, 26, 26)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  setColor(COLORS.text)
  doc.text(clean(user.name), MARGIN, y + 6)
  y += 13

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setColor(COLORS.muted)
  doc.text(`@${clean(user.login)}  \u00B7  on GitHub since ${user.joinedYear}`, MARGIN, y)
  y += 6

  if (user.bio) {
    const bioLines = doc.splitTextToSize(clean(user.bio), textWidth).slice(0, 3)
    doc.setFontSize(10)
    setColor(COLORS.text)
    doc.text(bioLines, MARGIN, y)
    y += bioLines.length * 4.8
  }

  const profileUrl = `https://github.com/${user.login}`
  doc.setFontSize(9)
  setColor(COLORS.accent)
  doc.textWithLink(profileUrl, MARGIN, y + 1, { url: profileUrl })

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  setColor(COLORS.muted)
  doc.text(`Generated ${today}`, MARGIN + doc.getTextWidth(profileUrl) + 6, y + 1)

  y = Math.max(y + 10, MARGIN + 34)

  // overview
  sectionTitle('Overview')
  statRow([
    { label: 'Public repos', value: stats.totalRepos.toLocaleString() },
    { label: 'Total stars', value: stats.totalStars.toLocaleString() },
    { label: 'Total forks', value: stats.totalForks.toLocaleString() },
    { label: 'Followers', value: stats.followers.toLocaleString() },
  ])

  // personality
  sectionTitle('Developer personality')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  setColor(COLORS.accent)
  doc.text(clean(personality.type), MARGIN, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setColor(COLORS.text)
  const personalityLines = doc.splitTextToSize(clean(personality.description), CONTENT_W)
  doc.text(personalityLines, MARGIN, y)
  y += personalityLines.length * 4.8 + 6

  // streaks
  sectionTitle('Commit streaks')
  statRow([
    { label: 'Current streak', value: `${streaks.currentStreak}d` },
    { label: 'Longest streak', value: `${streaks.longestStreak}d` },
    { label: 'Active days', value: streaks.totalActiveDays },
  ])
  if (!streaksExact) {
    note('Estimated from the last ~90 days of public activity.')
  }

  // heatmap
  const allCounts = heatmap.flat().map((d) => d.count)
  const maxCount = Math.max(...allCounts, 1)
  const totalInRange = allCounts.reduce((sum, c) => sum + c, 0)
  const pitch = CONTENT_W / 52
  const cell = pitch * 0.84

  sectionTitle('Contribution activity - last 52 weeks')
  ensureSpace(pitch * 7 + 14)

  heatmap.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      doc.setFillColor(...heatColor(day.count, maxCount))
      doc.roundedRect(MARGIN + weekIndex * pitch, y + dayIndex * pitch, cell, cell, 0.5, 0.5, 'F')
    })
  })
  y += pitch * 7 + 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setColor(COLORS.muted)
  doc.text(`${totalInRange.toLocaleString()} contributions in this period`, MARGIN, y)

  const legendX = PAGE_W - MARGIN - 38
  doc.text('Less', legendX, y)
  COLORS.heat.forEach((rgb, i) => {
    doc.setFillColor(...rgb)
    doc.roundedRect(legendX + 7 + i * 4.5, y - 2.6, 3.4, 3.4, 0.5, 0.5, 'F')
  })
  doc.text('More', legendX + 7 + 5 * 4.5 + 1, y)
  y += 10

  // languages
  if (languages.length > 0) {
    sectionTitle('Language breakdown')
    const trackX = MARGIN + 42
    const trackW = CONTENT_W - 42 - 16

    languages.forEach((lang) => {
      ensureSpace(8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      setColor(COLORS.text)
      doc.text(clean(lang.name), MARGIN, y)

      doc.setFillColor(...COLORS.heat[0])
      doc.roundedRect(trackX, y - 3, trackW, 3.2, 1.2, 1.2, 'F')
      doc.setFillColor(...COLORS.accent)
      doc.roundedRect(trackX, y - 3, Math.max((trackW * lang.percent) / 100, 1), 3.2, 1.2, 1.2, 'F')

      doc.setFont('helvetica', 'bold')
      doc.text(`${lang.percent}%`, PAGE_W - MARGIN, y, { align: 'right' })
      y += 7
    })

    if (!languagesExact) {
      note("Based on each repo's primary language only.")
    }
    y += 4
  }

  // top repos
  if (topRepos.length > 0) {
    sectionTitle('Top repositories', 48)

    topRepos.forEach((repo) => {
      let descLines = []
      if (repo.description) {
        // wrap with the same font we draw with, otherwise lines overflow the card
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        descLines = doc.splitTextToSize(clean(repo.description), CONTENT_W - 10)
        if (descLines.length > 3) {
          descLines = descLines.slice(0, 3)
          descLines[2] = descLines[2].replace(/\s*\S*$/, '') + '...'
        }
      }

      const height = 14 + descLines.length * 4.4 + (repo.language ? 5 : 0)
      ensureSpace(height + 4)

      doc.setDrawColor(...COLORS.line)
      doc.setLineWidth(0.3)
      doc.roundedRect(MARGIN, y, CONTENT_W, height, 2, 2, 'S')

      let cursor = y + 7
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      setColor(COLORS.accent)
      doc.textWithLink(clean(repo.name), MARGIN + 5, cursor, { url: repo.url })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      setColor(COLORS.muted)
      doc.text(`Stars ${repo.stars}  \u00B7  Forks ${repo.forks}`, PAGE_W - MARGIN - 5, cursor, { align: 'right' })
      cursor += 5.5

      if (descLines.length > 0) {
        doc.setFontSize(9)
        setColor(COLORS.text)
        doc.text(descLines, MARGIN + 5, cursor)
        cursor += descLines.length * 4.4
      }

      if (repo.language) {
        doc.setFontSize(8.5)
        setColor(COLORS.muted)
        doc.text(clean(repo.language), MARGIN + 5, cursor + 1)
      }

      y += height + 4
    })
  }

  // footer on every page
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setColor(COLORS.muted)
    doc.text(`GitHub Wrapped  \u00B7  github.com/${clean(user.login)}`, MARGIN, PAGE_H - 10)
    doc.text(`${page} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' })
  }

  return doc
}

export async function downloadReport(data) {
  const avatar = data.user.avatar ? await loadAvatar(data.user.avatar) : null
  const doc = await buildReport(data, avatar)
  doc.save(`${data.user.login}-github-wrapped.pdf`)
}