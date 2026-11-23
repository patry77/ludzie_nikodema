import React from 'react';
import { Box, Typography } from '@mui/material';
import { Lamps } from './QuizBits';
import { Avatar } from './Avatar';

// Jedno stanowisko jak w "1 z 10": u gory zdjecie (albo bialy ludek), na dole pulpit z numerem, imieniem, szansami i punktami.
const Podium = ({ player, stage, code, offset }) => {
  const active = player.isTarget || player.isBuzzer || player.isDesignating;
  const out = player.eliminated;
  const tag = player.isBuzzer ? 'ODPOWIADA' : player.isDesignating ? 'WSKAZUJE' : player.isTarget ? 'PYTANIE' : player.isHolder ? '☝ WSKAZUJE' : null;
  const fig = 'clamp(54px, 6.4vw, 124px)';

  return (
    <Box
      className={out ? 'podium-out' : undefined}
      sx={{
        position: 'relative',
        width: 'clamp(76px, 8.8vw, 176px)',
        flex: '0 1 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `translateY(${offset}px)`,
        opacity: out ? 0.5 : 1,
        transition: 'opacity .4s ease',
      }}
    >
      {/* Reflektor na aktywnym graczu */}
      {active && (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            left: '50%',
            top: '-34vh',
            width: 'clamp(110px, 12vw, 240px)',
            height: '34vh',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(to bottom, transparent, rgba(var(--accent-rgb),0.34))',
            clipPath: 'polygon(35% 0, 65% 0, 100% 100%, 0 100%)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Plakietka stanu */}
      <Box sx={{ height: 'clamp(16px, 1.5vw, 28px)', mb: 0.5 }}>
        {tag && (
          <Typography
            className="pop-in"
            sx={{ fontSize: 'clamp(0.6rem, 0.85vw, 1.05rem)', fontWeight: 800, px: 1, borderRadius: 999, background: 'var(--primary)', color: '#fff', whiteSpace: 'nowrap', lineHeight: 1.5 }}
          >
            {tag}
          </Typography>
        )}
      </Box>

      {/* Zdjecie / bialy ludek */}
      <Box className={active ? 'podium-active' : undefined} sx={{ borderRadius: '50%', zIndex: 1 }}>
        <Avatar code={code} player={player} size={fig} badge={false} />
      </Box>

      {/* Pulpit */}
      <Box
        className={active ? 'podium-active' : undefined}
        sx={{
          mt: 'calc(clamp(54px, 6.4vw, 124px) * -0.12)',
          width: '100%',
          pt: 'clamp(10px, 1.2vw, 22px)',
          pb: 'clamp(6px, 0.8vw, 14px)',
          px: 'clamp(4px, 0.5vw, 10px)',
          borderRadius: '12px 12px 6px 6px',
          background: active ? 'linear-gradient(180deg, #2447e8, #0b1a73 55%, #050f46)' : 'linear-gradient(180deg, #14297f, #0b1a73 50%, #050f46)',
          borderTop: '3px solid var(--gold)',
          boxShadow: active ? undefined : '0 10px 24px rgba(0,0,0,0.45)',
          textAlign: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(4px, 0.5vw, 10px)' }}>
          <Box
            component="span"
            sx={{
              width: 'clamp(20px, 2.1vw, 40px)',
              height: 'clamp(20px, 2.1vw, 40px)',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontWeight: 800,
              fontSize: 'clamp(0.75rem, 1.2vw, 1.5rem)',
              color: '#1a1205',
              background: out ? '#888' : 'linear-gradient(180deg, var(--gold-light), var(--gold-deep))',
            }}
          >
            {player.seat}
          </Box>
          <Typography noWrap sx={{ fontWeight: 700, fontSize: 'clamp(0.7rem, 1vw, 1.3rem)', maxWidth: '100%', textDecoration: out ? 'line-through' : 'none' }}>
            {player.name}
          </Typography>
        </Box>

        <Box sx={{ mt: 'clamp(4px, 0.5vw, 10px)', display: 'flex', justifyContent: 'center' }}>
          <Lamps lives={player.lives} size={14} />
        </Box>

        {/* Punkty */}
        <Box
          sx={{
            mt: 'clamp(4px, 0.5vw, 10px)',
            mx: 'auto',
            width: '86%',
            borderRadius: '6px',
            background: '#020617',
            border: '1px solid rgba(var(--accent-rgb),0.45)',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.9)',
            py: 'clamp(1px, 0.2vw, 4px)',
          }}
        >
          <Typography
            sx={{
              fontFamily: "'Courier New', monospace",
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              fontSize: 'clamp(0.85rem, 1.5vw, 2rem)',
              color: stage === 3 && !out ? 'var(--gold)' : 'rgba(255,255,255,0.35)',
              textShadow: stage === 3 && !out ? '0 0 10px rgba(var(--accent-rgb),0.9)' : 'none',
              lineHeight: 1.3,
            }}
          >
            {stage === 3 ? <span key={player.points} className="bump">{player.points}</span> : '–'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

// Rzad stanowisk na dole ekranu (lekki luk jak w studiu)
const TvPodiums = ({ state }) => {
  const n = state.players.length;
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        gap: 'clamp(4px, 0.7vw, 14px)',
        width: '100%',
        position: 'relative',
        zIndex: 2,
        pt: 'clamp(8px, 1vh, 16px)',
      }}
    >
      {state.players.map((p, i) => {
        const x = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0;
        return <Podium key={p.id} player={p} stage={state.stage} code={state.code} offset={Math.round(x * x * 16)} />;
      })}
    </Box>
  );
};

export default TvPodiums;
