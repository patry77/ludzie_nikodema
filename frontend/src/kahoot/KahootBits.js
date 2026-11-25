import React from 'react';
import { Box, Typography } from '@mui/material';
import { Avatar } from '../quiz/Avatar';

// Kolory i znaki odpowiedzi jak w Kahoot: A czerwony trojkat, B niebieski romb, C zolty kolo, D zielony kwadrat
export const K = {
  a: { bg: 'linear-gradient(180deg, #f0344f, #b8112b)', solid: '#e21b3c', shape: '▲' },
  b: { bg: 'linear-gradient(180deg, #2a86ee, #0e56a6)', solid: '#1368ce', shape: '◆' },
  c: { bg: 'linear-gradient(180deg, #f2b51a, #b07f00)', solid: '#d89e00', shape: '●' },
  d: { bg: 'linear-gradient(180deg, #34a812, #1b6307)', solid: '#26890c', shape: '■' },
};
export const LETTERS = ['a', 'b', 'c', 'd'];

export const fmtMs = (ms) => (ms === null || ms === undefined ? '–' : `${(ms / 1000).toFixed(1)} s`);

export const nameOf = (state, id) => {
  const p = state.players.find((x) => x.id === id);
  return p ? p.name : '?';
};

// Zmiana miejsca w rankingu: ▲ awans, ▼ spadek
export const RankMove = ({ now, prev }) => {
  const d = (prev || now) - now;
  if (!d) return <span style={{ opacity: 0.4 }}>–</span>;
  return <span style={{ color: d > 0 ? '#7dff9d' : '#ff8d8d', fontWeight: 800 }}>{d > 0 ? `▲${d}` : `▼${-d}`}</span>;
};

// Ranking po rundzie / na koncu. `rows` = wiersze wynikow rundy (z punktami za runde) albo prosty ranking.
// `compact` zmniejsza wiersze, zeby wszystko zmiescilo sie na ekranie TV bez przewijania.
export const Leaderboard = ({ state, rows, compact = false, columns = 1, showGain = true }) => {
  const rowH = compact ? 'clamp(26px, 4.6vh, 54px)' : 44;
  const font = compact ? 'clamp(0.8rem, min(1.35vw, 2.5vh), 1.7rem)' : '1rem';
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: columns === 2 ? '1fr 1fr' : '1fr', gap: compact ? 'clamp(3px, 0.6vh, 8px) clamp(8px, 1vw, 18px)' : 1 }}>
      {rows.map((r) => {
        const p = state.players.find((x) => x.id === r.playerId) || {};
        const top = r.rank <= 3;
        return (
          <Box
            key={r.playerId}
            className="pop-in"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 'clamp(6px, 0.8vw, 14px)',
              minHeight: rowH,
              px: 'clamp(6px, 0.9vw, 16px)',
              borderRadius: '12px',
              background: top ? 'linear-gradient(90deg, rgba(var(--accent-rgb),0.28), rgba(255,255,255,0.06))' : 'rgba(255,255,255,0.07)',
              border: top ? '1px solid rgba(var(--accent-rgb),0.55)' : '1px solid rgba(255,255,255,0.08)',
              fontSize: font,
              minWidth: 0,
            }}
          >
            <Typography component="span" sx={{ width: '1.8em', fontWeight: 800, color: top ? 'var(--gold)' : 'var(--ink-dim)', fontSize: 'inherit', textAlign: 'center' }}>
              {r.rank}
            </Typography>
            <Avatar code={state.code} player={p} size={compact ? 'clamp(20px, 3.6vh, 44px)' : 34} badge={false} />
            <Typography noWrap component="span" sx={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 'inherit' }}>
              {p.name || '?'}
            </Typography>
            {r.streak >= 2 && (
              <span title={`Seria ${r.streak}`} style={{ whiteSpace: 'nowrap' }}>
                🔥{r.streak}
              </span>
            )}
            {showGain && r.points !== undefined && (
              <span style={{ color: r.points > 0 ? '#7dff9d' : 'var(--ink-dim)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {r.points > 0 ? `+${r.points}` : '+0'}
              </span>
            )}
            <span style={{ fontWeight: 800, color: 'var(--gold)', minWidth: '3.2em', textAlign: 'right' }}>{r.score}</span>
            {showGain && r.prevRank !== undefined && <RankMove now={r.rank} prev={r.prevRank} />}
          </Box>
        );
      })}
    </Box>
  );
};

// Podsumowanie rundy: rozklad odpowiedzi, najszybszy, serie
export const RoundHighlights = ({ state, results, compact = false }) => {
  const font = compact ? 'clamp(0.85rem, min(1.5vw, 2.7vh), 1.9rem)' : '1rem';
  const streaks = results.rows.filter((r) => r.streak >= 2).sort((a, b) => b.streak - a.streak).slice(0, 3);
  const q = state.current.question;
  const maxCount = Math.max(1, ...Object.values(results.distribution));
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: compact ? 'clamp(6px, 1.2vh, 14px)' : 2, fontSize: font }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'clamp(6px, 0.8vw, 14px)', alignItems: 'end' }}>
        {LETTERS.map((l) => {
          const good = results.correct === l;
          const h = Math.max(6, Math.round((results.distribution[l] / maxCount) * (compact ? 60 : 90)));
          return (
            <Box key={l} sx={{ textAlign: 'center', opacity: good ? 1 : 0.6 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 'inherit' }}>{results.distribution[l]}</Typography>
              <Box sx={{ height: h, background: K[l].bg, borderRadius: '8px 8px 0 0', border: good ? '3px solid #fff' : '3px solid transparent', boxShadow: good ? '0 0 18px rgba(125,255,157,0.8)' : 'none' }} />
              <Typography sx={{ fontWeight: 800, background: K[l].solid, borderRadius: '0 0 8px 8px', fontSize: 'inherit', px: 0.5 }}>
                {K[l].shape} {good ? '✔' : ''}
              </Typography>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ p: 'clamp(6px, 1vh, 14px)', borderRadius: '12px', background: 'rgba(255,255,255,0.08)' }}>
        {results.fastest ? (
          <Typography sx={{ fontSize: 'inherit' }}>
            ⚡ Najszybszy: <strong style={{ color: 'var(--gold)' }}>{nameOf(state, results.fastest.playerId)}</strong> – {fmtMs(results.fastest.ms)}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 'inherit', color: 'var(--ink-dim)' }}>⚡ Nikt nie odpowiedział poprawnie</Typography>
        )}
        <Typography sx={{ fontSize: 'inherit', mt: 0.5 }}>
          🔥 Serie:{' '}
          {streaks.length ? streaks.map((r) => `${nameOf(state, r.playerId)} ×${r.streak}`).join(' · ') : <span style={{ color: 'var(--ink-dim)' }}>nikt nie ma serii</span>}
        </Typography>
        <Typography sx={{ fontSize: 'inherit', mt: 0.5, color: 'var(--ink-dim)' }}>
          Poprawna: <strong style={{ color: '#fff' }}>{K[results.correct].shape} {q.options[results.correct]}</strong>
        </Typography>
      </Box>
    </Box>
  );
};
