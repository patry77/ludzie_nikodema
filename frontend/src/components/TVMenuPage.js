import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import { resolveMenuMessage, categoryLabels, groupItemsByCategory } from './menuShared';
import { LogoMark } from './Logo';
import { useSiteTheme } from '../ThemeContext';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const SCROLL_SPEED = 28; // px na sekunde - wolne przewijanie, wygodne do czytania z daleka
const PAUSE_MS = 5000; // postoj na gorze i na dole
const FADE_MS = 700;

// Prosta sygnatura listy, zeby odswiezanie co 30 s nie resetowalo przewijania, gdy nic sie nie zmienilo
const signature = (items) =>
  items.map((i) => `${i.id}|${i.dishName}|${i.madeBy}|${i.description || ''}|${i.category || ''}|${i.image ? i.image.length : 0}`).join('~');

const TvCard = ({ item }) => {
  const emoji = (categoryLabels[item.category || 'dania'] || '🍽️').split(' ')[0];
  return (
    <Box
      className="glass"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRadius: '22px',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        background: 'rgba(255,255,255,0.08)',
      }}
    >
      <Box sx={{ position: 'relative', paddingTop: '56.25%', background: 'rgba(0,0,0,0.25)' }}>
        {item.image ? (
          <img
            src={item.image}
            alt={item.dishName}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: item.imagePosition || 'center',
            }}
          />
        ) : (
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'clamp(3rem, 5vw, 6rem)',
              background: 'radial-gradient(circle at 50% 40%, rgba(var(--accent-rgb),0.22), transparent 70%)',
            }}
          >
            {emoji}
          </Box>
        )}
      </Box>
      <Box sx={{ p: 'clamp(14px, 1.4vw, 28px)' }}>
        <Typography
          sx={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(1.3rem, 1.9vw, 2.5rem)',
            lineHeight: 1.2,
            color: 'var(--gold)',
            mb: 'clamp(6px, 0.6vw, 12px)',
          }}
        >
          {item.dishName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--ink)', mb: item.description ? 'clamp(6px, 0.6vw, 12px)' : 0 }}>
          <PersonIcon sx={{ fontSize: 'clamp(1.1rem, 1.5vw, 2rem)', color: 'var(--ink-dim)' }} />
          <Typography sx={{ fontSize: 'clamp(1rem, 1.3vw, 1.7rem)', fontWeight: 600 }}>{item.madeBy}</Typography>
        </Box>
        {item.description && (
          <Typography
            sx={{
              fontSize: 'clamp(0.95rem, 1.1vw, 1.45rem)',
              lineHeight: 1.45,
              color: 'var(--ink-dim)',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.description}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

// /tvmenu: pelnoekranowe menu na telewizor. Gdy lista nie miesci sie na ekranie, przewija sie powoli
// (postoj na gorze, wolny przewijanie w dol, postoj na dole, plynny powrot na gore).
const TVMenuPage = () => {
  const { preset } = useSiteTheme();
  const [menuItems, setMenuItems] = useState([]);
  const [menuMessage, setMenuMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const viewportRef = useRef(null);
  const contentRef = useRef(null);

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Pobieranie menu + odswiezanie co 30 sekund
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await fetch(`${API_URL}/menu`);
        if (!response.ok) throw new Error('Błąd podczas pobierania menu');
        const data = await response.json();
        if (!alive) return;
        const next = data.items || [];
        setMenuItems((prev) => (signature(prev) === signature(next) ? prev : next));
        setMenuMessage(data.message || '');
      } catch (error) {
        console.error('Error fetching menu:', error);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  // Automatyczne przewijanie, tylko gdy tresc jest wyzsza od ekranu
  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content || reduceMotion) return undefined;

    let raf = 0;
    let state = 'pause-top';
    let stateStart = performance.now();
    let last = stateStart;
    let y = 0;

    const apply = (offset, opacity) => {
      content.style.transform = `translate3d(0, ${-offset}px, 0)`;
      content.style.opacity = String(opacity);
    };
    const setState = (next, now) => {
      state = next;
      stateStart = now;
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.25);
      last = now;
      const max = content.offsetHeight - viewport.clientHeight;

      if (max <= 4) {
        // Wszystko miesci sie na ekranie - nic nie przewijamy
        if (y !== 0 || content.style.transform) apply(0, 1);
        y = 0;
        setState('pause-top', now);
        return;
      }

      switch (state) {
        case 'pause-top':
          if (now - stateStart > PAUSE_MS) setState('scroll', now);
          break;
        case 'scroll':
          y = Math.min(y + SCROLL_SPEED * dt, max);
          apply(y, 1);
          if (y >= max) setState('pause-bottom', now);
          break;
        case 'pause-bottom':
          if (now - stateStart > PAUSE_MS) setState('fade-out', now);
          break;
        case 'fade-out': {
          const p = (now - stateStart) / FADE_MS;
          apply(y, Math.max(1 - p, 0));
          if (p >= 1) {
            y = 0;
            apply(0, 0);
            setState('fade-in', now);
          }
          break;
        }
        case 'fade-in': {
          const p = (now - stateStart) / FADE_MS;
          apply(0, Math.min(p, 1));
          if (p >= 1) setState('pause-top', now);
          break;
        }
        default:
          break;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [menuItems, reduceMotion]);

  const grouped = groupItemsByCategory(menuItems);

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 20,
        p: 'clamp(12px, 2vh, 32px) clamp(16px, 2.4vw, 56px)',
        boxSizing: 'border-box',
      }}
    >
      {/* Naglowek */}
      <Box
        className="glass"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'clamp(12px, 2vw, 40px)',
          flexWrap: 'wrap',
          p: 'clamp(12px, 1.6vh, 26px) clamp(16px, 2.2vw, 44px)',
          mb: 'clamp(10px, 1.6vh, 24px)',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px, 1.4vw, 28px)', minWidth: 0 }}>
          <LogoMark size={72} glyph={preset.glyph} />
          <Box sx={{ minWidth: 0 }}>
            <Typography className="gold-text" sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1.05, fontSize: 'clamp(2rem, 4vw, 5rem)' }}>
              {preset.menuTitle}
            </Typography>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1rem, 1.5vw, 2rem)', mt: 0.5 }}>
              {resolveMenuMessage(menuMessage, preset)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tresc (przewijana automatycznie, gdy jest dluzsza niz ekran) */}
      <Box
        ref={viewportRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: reduceMotion ? 'auto' : 'hidden',
          position: 'relative',
          maskImage: 'linear-gradient(to bottom, transparent 0, #000 18px, #000 calc(100% - 28px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0, #000 18px, #000 calc(100% - 28px), transparent 100%)',
        }}
      >
        <Box ref={contentRef} sx={{ willChange: 'transform, opacity', pb: 'clamp(16px, 3vh, 40px)', pt: '6px' }}>
          {loading && menuItems.length === 0 ? (
            <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', fontSize: 'clamp(1.5rem, 3vw, 3rem)', py: 10 }}>
              Ładowanie menu...
            </Typography>
          ) : menuItems.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography sx={{ fontSize: 'clamp(3rem, 6vw, 7rem)' }} aria-hidden="true">
                {preset.emoji}
              </Typography>
              <Typography sx={{ color: 'var(--ink-dim)', fontSize: 'clamp(1.3rem, 2.4vw, 3rem)' }}>{preset.emptyMenu}</Typography>
            </Box>
          ) : (
            Object.entries(grouped).map(([key, items]) =>
              items.length === 0 ? null : (
                <Box key={key} component="section" sx={{ mb: 'clamp(18px, 3vh, 44px)' }}>
                  <Typography
                    sx={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      color: 'var(--ink)',
                      fontSize: 'clamp(1.6rem, 2.6vw, 3.4rem)',
                      mb: 0.5,
                    }}
                  >
                    {categoryLabels[key] || key}
                  </Typography>
                  <hr className="gold-rule" style={{ marginBottom: 'clamp(12px, 1.8vh, 26px)' }} />
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(280px, 21vw, 560px), 1fr))',
                      gap: 'clamp(14px, 1.4vw, 28px)',
                    }}
                  >
                    {items.map((item) => (
                      <TvCard key={item.id} item={item} />
                    ))}
                  </Box>
                </Box>
              )
            )
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default TVMenuPage;
