import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { youtubeEmbedUrl } from './quizApi';
import { Avatar } from './Avatar';

const BORDER_GOLD = 'linear-gradient(180deg, var(--gold-light), var(--gold-deep))';
const BORDER_GREEN = 'linear-gradient(180deg, #b6ffc9, #19b857)';
const BORDER_RED = 'linear-gradient(180deg, #ffb4b4, #d63a3a)';
const FILL_BLUE = 'linear-gradient(180deg, #0b1a73 0%, #050f46 100%)';
const FILL_GREEN = 'linear-gradient(180deg, #11994a 0%, #0a6b33 100%)';
const FILL_RED = 'linear-gradient(180deg, #b32a2a 0%, #7a1414 100%)';
const FILL_PICKED = 'linear-gradient(180deg, #c78a12 0%, #8a5a06 100%)';

// Szesciokatny pasek w stylu teleturnieju (zlota ramka + wypelnienie): "state" = 'default' | 'good' | 'bad'
export const HexBar = ({ selected = false, state, minHeight = 56, onClick, children, component, px, ...rest }) => {
  const st = state || (selected ? 'good' : 'default');
  const border = st === 'good' ? BORDER_GREEN : st === 'bad' ? BORDER_RED : BORDER_GOLD;
  const fill = st === 'good' ? FILL_GREEN : st === 'bad' ? FILL_RED : st === 'picked' ? FILL_PICKED : FILL_BLUE;
  return (
    <Box
      component={component}
      onClick={onClick}
      className="hex-bar"
      sx={{
        p: '2px',
        background: border,
        cursor: onClick ? 'pointer' : 'default',
        border: 0,
        width: '100%',
        transition: 'filter .15s ease, transform .15s ease',
        '&:hover': onClick ? { filter: 'brightness(1.12)', transform: 'translateY(-1px)' } : undefined,
        '&:focus-visible': { outline: '3px solid #fff', outlineOffset: 2 },
        '&:disabled': { cursor: 'default', opacity: 0.55 },
      }}
      {...rest}
    >
      <Box
        className="hex-bar"
        sx={{
          background: fill,
          display: 'flex',
          alignItems: 'center',
          minHeight,
          px: px || { xs: 3.5, sm: 5 },
          py: 0.5,
          color: '#fff',
          textAlign: 'left',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

// Szanse: zapalone lampki (zlote) i zgaszone
export const Lamps = ({ lives, max = 3, size = 14 }) => {
  // Animacja gasniecia lampki tylko po pierwszym renderze (nie przy odswiezeniu strony)
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return (
  <Box sx={{ display: 'inline-flex', gap: `${Math.round(size / 3)}px` }} aria-label={`Szanse: ${lives} z ${max}`}>
    {Array.from({ length: max }, (_, i) => (
      <Box
        key={`${i}-${i < lives}`}
        component="span"
        className={ready && i >= lives ? 'lamp-off-anim' : undefined}
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: i < lives ? 'radial-gradient(circle at 35% 30%, #fff, var(--gold) 55%, var(--gold-deep))' : 'rgba(255,255,255,0.12)',
          boxShadow: i < lives ? '0 0 10px 2px rgba(var(--accent-rgb), 0.7)' : 'none',
          border: '1px solid rgba(255,255,255,0.25)',
        }}
      />
    ))}
  </Box>
  );
};

export const TimerBar = ({ left, total }) => {
  if (left === null || left === undefined) return null;
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const urgent = left <= 5;
  return (
    <Box
      className={urgent ? 'timer-urgent' : undefined}
      sx={{ position: 'relative', height: urgent ? 14 : 10, borderRadius: 999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden', transition: 'height .3s ease' }}
      role="timer"
      aria-label={`Pozostało ${Math.ceil(left)} s`}
    >
      <Box
        sx={{
          width: `${pct}%`,
          height: '100%',
          background: urgent ? 'linear-gradient(90deg, #ff6b6b, #d63a3a)' : 'linear-gradient(90deg, var(--gold-light), var(--gold))',
          transition: 'width .2s linear',
        }}
      />
    </Box>
  );
};

// Odtwarzacz na TV: samoczynny start, bez tytulu (muzyka - zakryty caly obraz, wideo - zakryty pasek z tytulem),
// sterowany z panelu prowadzacego (mediaCmd: play / pause / restart przez YouTube IFrame API).
const ytCommand = (frame, func, args = []) => {
  try {
    frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  } catch (e) {
    /* ramka jeszcze niegotowa */
  }
};

export const TvMedia = ({ media, link, qid, mediaCmd, start = 0, end = 0 }) => {
  const frameRef = useRef(null);
  const lastN = useRef(mediaCmd ? mediaCmd.n : 0);
  const emb = youtubeEmbedUrl(link, 'autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1' + (start ? `&start=${start}` : '') + (end ? `&end=${end}` : ''));
  const isMusic = media !== 'wideo';

  useEffect(() => {
    if (!mediaCmd || mediaCmd.n === lastN.current) return;
    lastN.current = mediaCmd.n;
    if (mediaCmd.qid !== qid || !frameRef.current) return;
    const f = frameRef.current;
    if (mediaCmd.cmd === 'pause') ytCommand(f, 'pauseVideo');
    else if (mediaCmd.cmd === 'play') ytCommand(f, 'playVideo');
    else if (mediaCmd.cmd === 'restart') {
      ytCommand(f, 'seekTo', [start, true]);
      ytCommand(f, 'playVideo');
    }
  }, [mediaCmd, qid, start]);

  if (!emb) return null;
  return (
    <Box sx={{ mt: 'clamp(6px, 1.2vh, 16px)', flex: '1 1 0', minHeight: 44, display: 'flex', justifyContent: 'center' }}>
    <Box sx={{ position: 'relative', height: '100%', maxWidth: '100%', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--gold)', background: '#000' }}>
      <svg viewBox="0 0 16 9" aria-hidden="true" style={{ height: '100%', width: 'auto', maxWidth: '100%', display: 'block', visibility: 'hidden' }} />
      <iframe
        ref={frameRef}
        title="Multimedia do pytania"
        src={emb}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, pointerEvents: 'none' }}
        allow="autoplay; encrypted-media"
      />
      {isMusic ? (
        <Box sx={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, #12206b, #050a2e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }} aria-hidden="true">🎵</Typography>
          <Typography sx={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase' }}>Słuchajcie uważnie…</Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, height: '24%', background: '#000' }} />
          <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '12%', background: '#000' }} />
        </>
      )}
    </Box>
    </Box>
  );
};

const remoteBtn = { cursor: 'pointer', padding: '8px 16px', borderRadius: 999, border: '2px solid var(--gold)', background: 'linear-gradient(120deg, var(--primary-dark), var(--primary))', color: '#fff6e5', fontWeight: 700, font: 'inherit' };

// Przyciski prowadzacego: odtwarzanie / pauza / od poczatku na ekranie TV
export const MediaRemote = ({ media, act, busy }) => (
  <Box sx={{ mt: 2, p: 1.5, borderRadius: '14px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(var(--accent-rgb),0.35)', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
    <Typography sx={{ fontWeight: 700, color: 'var(--gold)', mr: 1 }}>{media === 'wideo' ? '🎬 Film na TV:' : '🎵 Utwór na TV:'}</Typography>
    <button type="button" disabled={busy} onClick={() => act('media', { cmd: 'play' })} style={remoteBtn}>▶ Odtwórz</button>
    <button type="button" disabled={busy} onClick={() => act('media', { cmd: 'pause' })} style={remoteBtn}>⏸ Pauza</button>
    <button type="button" disabled={busy} onClick={() => act('media', { cmd: 'restart' })} style={remoteBtn}>↺ Od początku</button>
  </Box>
);

// Osadzenie filmu YouTube albo link do innych serwisow
export const MediaBlock = ({ media, link, size = 'phone', embed = true }) => {
  if (!link) return null;
  const emb = embed ? youtubeEmbedUrl(link) : null;
  const label = media === 'wideo' ? '🎬 Otwórz film' : '🎵 Otwórz utwór';
  return (
    <Box sx={{ mt: 2 }}>
      {emb && (
        <Box sx={{ position: 'relative', paddingTop: '56.25%', borderRadius: '16px', overflow: 'hidden', border: '2px solid var(--gold)', maxWidth: size === 'tv' ? 760 : '100%', mx: 'auto' }}>
          <iframe
            title={media === 'wideo' ? 'Film do pytania' : 'Utwór do pytania'}
            src={emb}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </Box>
      )}
      <Box sx={{ textAlign: 'center', mt: 1 }}>
        <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', fontWeight: 700 }}>
          {label}
        </a>
      </Box>
    </Box>
  );
};

const LETTERS = ['a', 'b', 'c', 'd'];

// Pytanie z opcjami. `current.correct` jest obecne tylko gdy wolno je pokazac (prowadzacy / po ujawnieniu).
export const QuestionPanel = ({ current, size = 'phone', hostPreview = false, onPick, pickDisabled, pickedLetter, embedMedia = true, mediaCmd = null }) => {
  const q = current.question;
  const revealed = current.status === 'revealed';
  const correctLetter = current.correct ? current.correct.letter : null;
  const answeredLetter = current.answer && current.answer.value && q.typ === 'abcd' ? current.answer.value : null;
  const big = size === 'tv';

  return (
    <Box sx={big ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' } : undefined}>
      <HexBar minHeight={big ? 'clamp(56px, 11vh, 120px)' : 84} px={{ xs: 4, sm: 6 }}>
        <Typography sx={{ fontWeight: 600, fontSize: big ? 'clamp(1.1rem, min(2.6vw, 4.4vh), 3rem)' : { xs: '1.1rem', sm: '1.25rem' }, lineHeight: 1.3, py: 1.5, width: '100%', textAlign: 'center' }}>
          {q.pytanie}
        </Typography>
      </HexBar>

      {q.link && big && youtubeEmbedUrl(q.link) ? (
        <TvMedia key={q.id} media={q.media} link={q.link} qid={q.id} mediaCmd={mediaCmd} start={q.start || 0} end={q.end || 0} />
      ) : q.link && size === 'phone' && youtubeEmbedUrl(q.link) ? (
        <Box sx={{ mt: 2, textAlign: 'center', color: 'var(--gold)', fontWeight: 700 }}>
          {q.media === 'wideo' ? '🎬 Film leci na ekranie TV' : '🎵 Utwór leci na ekranie TV'}
        </Box>
      ) : (
        <MediaBlock media={q.media} link={q.link} size={size} embed={embedMedia} />
      )}

      {q.typ === 'abcd' && q.options && (
        <Box sx={{ mt: big ? 'clamp(6px, 1.2vh, 16px)' : 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: big ? '1fr 1fr' : '1fr' }, gap: big ? 'clamp(6px, 1vh, 12px)' : 1.25 }}>
          {LETTERS.map((l) => {
            let state = 'default';
            if (revealed || hostPreview) {
              if (correctLetter === l) state = 'good';
              else if (revealed && answeredLetter === l) state = 'bad';
              else if (!revealed && answeredLetter === l) state = 'picked';
            } else if (answeredLetter === l) {
              state = 'picked';
            } else if (pickedLetter === l) {
              state = 'good';
            }
            const content = (
              <>
                <Box component="span" sx={{ color: 'var(--primary-light)', fontWeight: 800, mr: 1.5, minWidth: 28, fontSize: big ? 'clamp(1rem, min(2vw, 3.6vh), 2.2rem)' : '1.15rem' }}>
                  {l.toUpperCase()}:
                </Box>
                <Box component="span" sx={{ fontSize: big ? 'clamp(0.95rem, min(1.9vw, 3.4vh), 2rem)' : '1.05rem', fontWeight: 500 }}>
                  {q.options[l]}
                </Box>
              </>
            );
            return onPick ? (
              <HexBar key={l} component="button" type="button" state={state} minHeight={big ? 72 : 60} onClick={() => onPick(l)} disabled={pickDisabled}>
                {content}
              </HexBar>
            ) : (
              <HexBar key={l} state={state} minHeight={big ? 'clamp(40px, 7vh, 72px)' : 52}>
                {content}
              </HexBar>
            );
          })}
        </Box>
      )}

      {revealed && q.typ !== 'abcd' && current.correct && (
        <Box sx={{ mt: 2 }}>
          <HexBar state="good" minHeight={big ? 80 : 60}>
            <Typography sx={{ width: '100%', textAlign: 'center', fontWeight: 800, fontSize: big ? 'clamp(1.3rem, 2.4vw, 2.6rem)' : '1.2rem' }}>
              ✔ {current.correct.text}
            </Typography>
          </HexBar>
        </Box>
      )}
    </Box>
  );
};

// Karta jednego stanowiska (podium)
export const PodiumCard = ({ player, stage, compact = false, tv = false, code }) => {
  const active = player.isTarget || player.isBuzzer || player.isDesignating;
  const out = player.eliminated;
  return (
    <Box
      className={out ? 'podium-out' : active ? 'podium-active' : undefined}
      sx={{
        position: 'relative',
        borderRadius: '16px',
        p: compact ? 1 : tv ? 'clamp(8px, 0.9vw, 16px)' : 1.5,
        background: out ? 'rgba(255,255,255,0.04)' : active ? 'linear-gradient(180deg, #1c3bd1, #0b1a73)' : 'linear-gradient(180deg, #0b1a73, #050f46)',
        border: active ? '2px solid var(--gold)' : '2px solid rgba(var(--accent-rgb), 0.35)',
        boxShadow: active ? '0 0 26px 4px rgba(var(--accent-rgb), 0.55)' : 'none',
        opacity: out ? 0.45 : 1,
        transition: 'all .25s ease',
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar code={code} player={player} size={tv ? 'clamp(36px, 3.4vw, 68px)' : compact ? 32 : 36} />
        <Typography noWrap sx={{ fontWeight: 700, fontSize: tv ? 'clamp(0.9rem, 1.4vw, 1.7rem)' : '0.95rem', textDecoration: out ? 'line-through' : 'none' }}>
          {player.name}
        </Typography>
      </Box>
      <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Lamps lives={player.lives} size={tv ? 18 : 13} />
        {stage === 3 && (
          <Typography sx={{ fontWeight: 800, color: 'var(--gold)', fontSize: tv ? 'clamp(0.9rem, 1.4vw, 1.7rem)' : '0.95rem' }}>
            <span key={player.points} className="bump">{player.points}</span> pkt
          </Typography>
        )}
      </Box>
      {(player.isHolder || player.isBuzzer || player.isDesignating) && (
        <Typography sx={{ position: 'absolute', top: -10, right: 8, fontSize: tv ? 'clamp(0.7rem, 1vw, 1.1rem)' : '0.7rem', fontWeight: 800, px: 1, borderRadius: 999, background: 'var(--primary)', color: '#fff' }}>
          {player.isBuzzer ? 'ODPOWIADA' : player.isDesignating ? 'WSKAZUJE' : '☝ WSKAZUJE'}
        </Typography>
      )}
    </Box>
  );
};

export const stageHint = (state) => {
  if (!state) return '';
  switch (state.stage) {
    case 1:
      return `Etap I – ${state.current && state.current.round ? `kolejka ${state.current.round} z 2` : 'dwie kolejki pytań'}`;
    case 2:
      return 'Etap II – wyznaczanie, aż zostanie trzech graczy';
    case 3:
      return state.finalQuestions ? `Finał – pytanie ${Math.min(state.finalQuestions.asked, state.finalQuestions.max)} z ${state.finalQuestions.max}` : 'Finał';
    default:
      return '';
  }
};

export const playerName = (state, id) => {
  const p = state && state.players.find((x) => x.id === id);
  return p ? p.name : '';
};

// Opis tego, co sie teraz dzieje - jednozdaniowy komunikat dla wszystkich widokow
export const describeNow = (state) => {
  if (!state) return '';
  if (state.status === 'lobby') return 'Czekamy na graczy...';
  if (state.status === 'finished') return 'Koniec gry!';
  const c = state.current;
  if (state.awaiting) {
    const who = playerName(state, state.awaiting.byId);
    return `${who} wybiera, kto odpowiada${state.awaiting.first ? ' (przeciwna strona studia)' : ''}`;
  }
  if (!c) return '';
  const target = playerName(state, c.targetId);
  if (c.status === 'revealed') {
    if (c.result && c.result.correct === true) return 'Dobra odpowiedź!';
    if (c.result && c.result.correct === false) return 'Zła odpowiedź';
    return 'Nikt się nie zgłosił';
  }
  if (c.status === 'judging') return c.question && c.question.typ === 'abcd' ? 'Odpowiedź zaznaczona – czekamy na zatwierdzenie prowadzącego...' : 'Prowadzący ocenia odpowiedź...';
  if (c.kind === 'single') return `Pytanie dla: ${target}`;
  if (c.status === 'answering') return `${playerName(state, c.buzzerId)} odpowiada`;
  return 'Kto pierwszy się zgłosi?';
};
