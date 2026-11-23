import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { HexBar, Lamps, QuestionPanel, TimerBar, describeNow, playerName } from './QuizBits';
import { useSecondsLeft } from './quizApi';
import StageBackdrop from './StageBackdrop';
import { Avatar, PhotoPicker } from './Avatar';
import { SoundControl, useQuizSounds, useSoundSettings } from './useQuizSounds';

const BigButton = ({ children, color = 'gold', ...props }) => (
  <Box
    component="button"
    type="button"
    {...props}
    sx={{
      width: '100%',
      py: 2.2,
      border: 0,
      cursor: 'pointer',
      font: 'inherit',
      fontWeight: 800,
      fontSize: '1.3rem',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: color === 'gold' ? '#1a1205' : '#fff',
      background: color === 'gold' ? 'linear-gradient(180deg, var(--gold-light), var(--gold) 45%, var(--gold-deep))' : 'linear-gradient(180deg, #e0334f, #a3122b)',
      borderRadius: '18px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      '&:active': { transform: 'scale(0.98)' },
      '&:disabled': { opacity: 0.5, cursor: 'default' },
    }}
    className={[props.className, props.pulse ? 'glow-pulse' : null].filter(Boolean).join(' ') || undefined}
  >
    {children}
  </Box>
);

// Widok telefonu uczestnika: odpowiadanie, zgloszenie, wskazywanie.
const GamePlayer = ({ state, offsetRef, act, busy, error, onResetError }) => {
  const you = state.you;
  const c = state.current;
  const [picked, setPicked] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    setPicked('');
    setText('');
  }, [c && c.n]);

  const iAmTarget = !!c && c.kind === 'single' && c.targetId === you.id && c.status === 'asking';
  const iAmBuzzer = !!c && c.kind === 'buzz' && c.status === 'answering' && c.buzzerId === you.id;
  const canAnswer = iAmTarget || iAmBuzzer;
  const canBuzz = !!c && c.kind === 'buzz' && c.status === 'asking' && !you.eliminated;
  const iDesignate = !!state.awaiting && state.awaiting.byId === you.id;

  const timerOn = c && (c.status === 'asking' || c.status === 'answering');
  const left = useSecondsLeft(timerOn ? c.deadline : null, offsetRef, state.pausedAt);
  const total = c ? (c.kind === 'single' || c.status === 'answering' ? state.config.answerSeconds : state.config.buzzSeconds) : 0;
  const designLeft = useSecondsLeft(iDesignate ? state.awaiting.deadline : null, offsetRef, state.pausedAt);

  const myResult = c && c.status === 'revealed' && c.result && c.result.playerId === you.id ? c.result.correct : undefined;

  // Dzwiek na telefonie domyslnie wylaczony (na spotkaniu gra TV); wibracja przy Twojej kolei dziala zawsze, gdy telefon ja wspiera
  const sound = useSoundSettings('player', false);
  useQuizSounds(state, { role: 'player', enabled: sound.active });

  const send = (value) => act('answer', { value });
  const savePhoto = async (photo) => {
    await act('photo', { photo });
  };
  const removePhoto = () => act('removePhoto');

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, py: 3, display: 'flex', flexDirection: 'column', gap: 2.5, position: 'relative', zIndex: 20 }}>
      <StageBackdrop variant="soft" />
      {/* Karta gracza */}
      <Box className="glass" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Avatar code={state.code} player={you} size={52} />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontWeight: 800, fontSize: '1.15rem' }}>{you.name}</Typography>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem' }}>1 z 10 · kod {state.code}{state.test && ' · test'}</Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Lamps lives={you.lives} size={18} />
          {state.stage === 3 && <Typography sx={{ color: 'var(--gold)', fontWeight: 800 }}>{you.points} pkt</Typography>}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1.5 }}>
        <SoundControl sound={sound} variant="inline" />
      </Box>

      {error && <Alert severity="error" onClose={onResetError}>{error}</Alert>}
      {state.paused && state.status === 'running' && (
        <Alert severity="warning" icon={false} className="pop-in" sx={{ textAlign: 'center', fontWeight: 800 }}>
          ⏸ Gra wstrzymana przez prowadzącego – czekaj na wznowienie
        </Alert>
      )}

      {/* Poczekalnia */}
      {state.status === 'lobby' && (
        <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
            <Avatar code={state.code} player={you} size={110} />
          </Box>
          <Typography variant="h5" sx={{ color: 'var(--gold)', mb: 1 }}>Jesteś w grze!</Typography>
          <Typography sx={{ color: 'var(--ink-dim)' }}>Twoje stanowisko: <strong style={{ color: 'var(--ink)' }}>{you.seat}</strong>. Czekaj, aż prowadzący rozpocznie grę.</Typography>
          <Box sx={{ mt: 2.5 }}>
            <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.85rem', mb: 1 }}>Dodaj swoje zdjęcie – zobaczą je wszyscy na ekranie TV:</Typography>
            <PhotoPicker hasPhoto={you.hasPhoto} onPick={savePhoto} onRemove={removePhoto} busy={busy} />
          </Box>
          <Typography sx={{ mt: 2.5, color: 'var(--ink-dim)', fontSize: '0.9rem' }}>
            W grze: {state.players.map((p) => `${p.seat}. ${p.name}`).join(' · ')}
          </Typography>
        </Box>
      )}

      {/* Koniec */}
      {state.status === 'finished' && state.result && (
        <Box className="glass pop-in" sx={{ p: 3, textAlign: 'center' }}>
          <Typography className="bounce" sx={{ fontSize: '3rem' }} aria-hidden="true">{state.result.winnerIds.includes(you.id) ? '🏆' : '👏'}</Typography>
          <Typography variant="h4" className="gold-text" sx={{ mb: 1 }}>
            {state.result.winnerIds.includes(you.id) ? 'Wygrałeś(aś)!' : 'Koniec gry'}
          </Typography>
          <Typography sx={{ color: 'var(--ink-dim)' }}>Zwycięzca: <strong style={{ color: 'var(--ink)' }}>{state.result.winnerIds.map((id) => playerName(state, id)).join(' i ')}</strong></Typography>
          <Box sx={{ mt: 2, textAlign: 'left' }}>
            {state.result.ranking.slice(0, 5).map((r, i) => (
              <Typography key={r.id} sx={{ py: 0.25, fontWeight: r.id === you.id ? 800 : 400 }}>{i + 1}. {r.name} – {r.total} pkt</Typography>
            ))}
          </Box>
        </Box>
      )}

      {/* Rozgrywka */}
      {state.status === 'running' && (
        <>
          {you.eliminated && (
            <Alert severity="warning" icon={false}>Odpadłeś(aś) z gry – ale możesz dalej śledzić pytania. 😉</Alert>
          )}

          <Typography className={iAmTarget || iAmBuzzer || iDesignate ? 'turn-pulse' : undefined} sx={{ textAlign: 'center', fontWeight: 800, fontSize: '1.2rem', color: iAmTarget || iAmBuzzer || iDesignate ? 'var(--gold)' : 'var(--ink)' }}>
            {iAmTarget && 'TWOJA KOLEJ – odpowiadasz!'}
            {iAmBuzzer && 'Zgłosiłeś(aś) się – odpowiadasz!'}
            {iDesignate && 'Wskaż, kto odpowiada'}
            {!iAmTarget && !iAmBuzzer && !iDesignate && describeNow(state)}
          </Typography>

          {timerOn && <TimerBar left={left} total={total} />}

          {iDesignate && (
            <Box sx={{ display: 'grid', gap: 1.25 }}>
              {state.awaiting.first && state.stage === 2 && (
                <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)', fontSize: '0.85rem' }}>Pierwsze wyznaczenie – wybierz osobę z przeciwnej strony studia.</Typography>
              )}
              {state.awaiting.allowedIds.map((id) => {
                const p = state.players.find((x) => x.id === id);
                return (
                  <HexBar key={id} component="button" type="button" minHeight={60} onClick={() => act('designate', { targetId: id })} disabled={busy || state.paused}>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
                      <Box component="span" sx={{ color: 'var(--primary-light)', mr: 1 }}>{p.seat}.</Box>
                      {p.name}{p.id === you.id && ' (ja)'}
                    </Typography>
                    <Box sx={{ ml: 'auto' }}><Lamps lives={p.lives} size={11} /></Box>
                  </HexBar>
                );
              })}
              {designLeft !== null && <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)' }}>Losowo za {Math.ceil(designLeft)} s</Typography>}
            </Box>
          )}

          {state.awaiting && !iDesignate && (
            <Box className="glass" sx={{ p: 3, textAlign: 'center' }}>
              <Typography sx={{ fontSize: '1.2rem', fontWeight: 700 }}>☝ {playerName(state, state.awaiting.byId)} wskazuje, kto odpowiada...</Typography>
            </Box>
          )}

          {c && (
            <Box key={`${c.n}:${c.question.id}`} className="pop-in">
            <QuestionPanel
              current={c}
              size="phone"
              onPick={iAmTarget || iAmBuzzer ? (l) => setPicked(l) : undefined}
              pickedLetter={picked}
              pickDisabled={busy || state.paused}
              embedMedia
            />
            </Box>
          )}

          {/* Odpowiedz: ABCD */}
          {canAnswer && c.question.typ === 'abcd' && (
            <BigButton onClick={() => send(picked)} disabled={!picked || busy || state.paused}>
              {picked ? `Zatwierdź: ${picked.toUpperCase()}` : 'Wybierz odpowiedź'}
            </BigButton>
          )}

          {/* Odpowiedz: otwarta */}
          {canAnswer && c.question.typ !== 'abcd' && (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <TextField
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Wpisz odpowiedź..."
                autoComplete="off"
                inputProps={{ maxLength: 200, 'aria-label': 'Twoja odpowiedź' }}
                onKeyDown={(e) => e.key === 'Enter' && text.trim() && send(text)}
                sx={{
                  '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.08)', borderRadius: '14px', fontSize: '1.2rem', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.5)' } },
                }}
              />
              <BigButton onClick={() => send(text)} disabled={!text.trim() || busy || state.paused}>Wyślij odpowiedź</BigButton>
              <Button onClick={() => send('__voice__')} disabled={busy || state.paused} sx={{ color: 'var(--ink)' }}>🎤 Odpowiadam głosem (oceni prowadzący)</Button>
            </Box>
          )}

          {/* Zgloszenie w finale */}
          {canBuzz && (
            <BigButton color="red" pulse className="buzz-ring" onClick={() => act('buzz')} disabled={busy || state.paused}>
              ✋ Zgłaszam się!
            </BigButton>
          )}

          {c && c.status === 'answering' && !iAmBuzzer && (
            <Typography sx={{ textAlign: 'center', color: 'var(--ink-dim)' }}>{playerName(state, c.buzzerId)} zgłosił(a) się pierwszy/a</Typography>
          )}

          {c && c.status === 'judging' && (
            <Alert severity="info" icon={false} sx={{ textAlign: 'center' }}>Odpowiedź wysłana – prowadzący ją ocenia...</Alert>
          )}

          {myResult !== undefined && (
            <Box className={`glass pop-in ${myResult ? '' : 'shake'}`} sx={{ p: 3, textAlign: 'center', border: `2px solid ${myResult ? '#19b857' : '#d63a3a'}` }}>
              <Typography sx={{ fontSize: '2.6rem' }} aria-hidden="true">{myResult ? '✅' : '❌'}</Typography>
              <Typography variant="h5" sx={{ color: myResult ? '#7be3a2' : '#ff9b9b' }}>
                {myResult ? 'Dobra odpowiedź!' : c.answer ? 'Zła odpowiedź' : 'Brak odpowiedzi'}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default GamePlayer;
