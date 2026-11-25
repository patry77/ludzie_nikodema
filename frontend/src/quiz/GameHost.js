import React, { useState } from 'react';
import { Alert, Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { MediaRemote, PodiumCard, QuestionPanel, TimerBar, describeNow, playerName, stageHint } from './QuizBits';
import { useSecondsLeft } from './quizApi';
import { IntroHost } from './IntroCam';
import { SoundControl, useQuizSounds, useSoundSettings } from './useQuizSounds';

const Panel = ({ title, children, sx }) => (
  <Box className="glass" sx={{ p: { xs: 2, md: 3 }, ...sx }}>
    {title && (
      <Typography sx={{ color: 'var(--gold)', fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', fontSize: '0.8rem', mb: 1.5 }}>{title}</Typography>
    )}
    {children}
  </Box>
);

const settingField = {
  '& .MuiOutlinedInput-root': { color: 'var(--ink)', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', '& fieldset': { borderColor: 'rgba(var(--accent-rgb),0.35)' } },
  '& .MuiInputLabel-root': { color: 'var(--ink-dim)' },
};

const Settings = ({ config, onChange, disabled, showBots }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
    <TextField size="small" type="number" label="Czas na odpowiedź (s)" value={config.answerSeconds} disabled={disabled}
      onChange={(e) => onChange({ answerSeconds: Number(e.target.value) })} sx={settingField} inputProps={{ min: 5, max: 120 }} />
    <TextField size="small" type="number" label="Czas na zgłoszenie – finał (s)" value={config.buzzSeconds} disabled={disabled}
      onChange={(e) => onChange({ buzzSeconds: Number(e.target.value) })} sx={settingField} inputProps={{ min: 5, max: 60 }} />
    <TextField size="small" type="number" label="Auto „Dalej” po (s, 0 = ręcznie)" value={config.autoAdvanceSeconds} disabled={disabled}
      onChange={(e) => onChange({ autoAdvanceSeconds: Number(e.target.value) })} sx={settingField} inputProps={{ min: 0, max: 60 }} />
    {showBots && (
      <TextField select size="small" label="Tempo botów" value={config.botSpeed || 1} disabled={disabled} onChange={(e) => onChange({ botSpeed: Number(e.target.value) })} sx={settingField}>
        <MenuItem value={0.15}>bardzo szybko</MenuItem>
        <MenuItem value={0.4}>szybko</MenuItem>
        <MenuItem value={1}>normalnie</MenuItem>
        <MenuItem value={2}>wolno</MenuItem>
      </TextField>
    )}
    {showBots && (
      <TextField select size="small" label="Skuteczność botów" value={config.botAccuracy} disabled={disabled} onChange={(e) => onChange({ botAccuracy: Number(e.target.value) })} sx={settingField}>
        <MenuItem value={0.3}>niska (30%)</MenuItem>
        <MenuItem value={0.5}>średnia (50%)</MenuItem>
        <MenuItem value={0.75}>wysoka (75%)</MenuItem>
        <MenuItem value={0.9}>bardzo wysoka (90%)</MenuItem>
      </TextField>
    )}
  </Box>
);

// Panel prowadzacego: pelna kontrola gry + poprawne odpowiedzi (tylko tutaj).

const GameHost = ({ state, offsetRef, act, busy, error, onResetError }) => {
  const c = state.current;
  const left = useSecondsLeft(c && (c.status === 'asking' || c.status === 'answering') ? c.deadline : null, offsetRef, state.pausedAt);
  const advanceLeft = useSecondsLeft(c && c.status === 'revealed' && c.advanceAt ? c.advanceAt : null, offsetRef, state.pausedAt);
  const designLeft = useSecondsLeft(state.awaiting ? state.awaiting.deadline : null, offsetRef, state.pausedAt);
  const paused = !!state.paused;
  const [copied, setCopied] = useState(false);
  // Opcjonalny dzwiek na komputerze prowadzacego (gdy np. ten laptop jest podlaczony do glosnikow)
  const sound = useSoundSettings('host', false);
  useQuizSounds(state, { role: 'host', enabled: sound.active, secondsLeft: left !== null ? left : designLeft });

  const joinUrl = `${window.location.origin}/teleturniej/gra/${state.code}`;
  const tvUrl = `${window.location.origin}/teleturniej/gra/${state.code}/tv`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      window.prompt('Skopiuj link dla uczestników:', joinUrl);
    }
  };

  const total = c ? (c.kind === 'single' || c.status === 'answering' ? state.config.answerSeconds : state.config.buzzSeconds) : 0;
  const answerer = c && c.answer ? playerName(state, c.answer.playerId) : null;
  const holder = state.awaiting ? playerName(state, state.awaiting.byId) : '';

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, gap: 3, alignItems: 'start' }}>
      {/* ---- LEWA KOLUMNA: sterowanie ---- */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <Panel>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <Box>
              <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem', letterSpacing: 2, textTransform: 'uppercase' }}>
                Panel prowadzącego {state.test && '· tryb testowy'}
              </Typography>
              <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2rem', color: 'var(--gold)', lineHeight: 1.1 }}>
                1 z 10 · kod {state.code}
              </Typography>
              <Typography sx={{ color: 'var(--ink-dim)' }}>{state.status === 'lobby' ? 'Poczekalnia' : stageHint(state)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" component="a" href={tvUrl} target="_blank" rel="noopener noreferrer" sx={{ color: 'var(--gold)', borderColor: 'rgba(var(--accent-rgb),0.6)' }}>
                📺 Otwórz widok TV
              </Button>
              <Button variant="outlined" onClick={copy} sx={{ color: 'var(--gold)', borderColor: 'rgba(var(--accent-rgb),0.6)' }}>
                {copied ? '✔ Skopiowano' : '🔗 Link dla uczestników'}
              </Button>
              <SoundControl sound={sound} variant="inline" />
              {state.status === 'running' && (
                <Button
                  variant="contained"
                  onClick={() => act(paused ? 'resume' : 'pause')}
                  disabled={busy}
                  sx={{ fontWeight: 800, color: '#1a1205', background: paused ? 'linear-gradient(120deg, #b6ffc9, #19b857)' : 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))' }}
                >
                  {paused ? '▶ Wznów grę' : '⏸ Pauza'}
                </Button>
              )}
              {state.status === 'running' && (
                <Button variant="outlined" color="error" onClick={() => window.confirm('Zakończyć grę teraz?') && act('end')} disabled={busy}>
                  Zakończ grę
                </Button>
              )}
            </Box>
          </Box>
          {paused && state.status === 'running' && (
            <Alert severity="warning" icon={false} sx={{ mt: 2, fontWeight: 700 }}>
              ⏸ Gra jest wstrzymana – czasy stoją, uczestnicy nie mogą odpowiadać. Kliknij „Wznów grę”, gdy będziesz gotowy.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={onResetError}>
              {error}
            </Alert>
          )}
        </Panel>

        {state.status === 'lobby' && <IntroHost code={state.code} intro={state.intro} people={state.players} />}

        {/* Poczekalnia */}
        {state.status === 'lobby' && (
          <Panel title="Przed startem">
            <Typography sx={{ color: 'var(--ink-dim)', mb: 2, lineHeight: 1.6 }}>
              Uczestnicy dołączają z telefonów (kod <strong style={{ color: 'var(--gold)' }}>{state.code}</strong> albo kod QR na widoku TV). Potrzeba co najmniej 2 graczy, maksymalnie 10.
              Etap I: dwie kolejki pytań po numerach 1–10, potem etap II (wyznaczanie) aż zostanie trzech graczy, na koniec finał.
            </Typography>
            <Settings config={state.config} onChange={(patch) => act('config', { config: patch })} disabled={busy} showBots={state.test} />
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 3 }}>
              <Button variant="contained" size="large" onClick={() => act('start')} disabled={busy || state.players.length < 2}
                sx={{ background: 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))', color: '#1a1205', fontWeight: 800 }}>
                ▶ Start gry ({state.players.length} {state.players.length === 1 ? 'gracz' : 'graczy'})
              </Button>
              <Button variant="outlined" onClick={() => act('addBot')} disabled={busy || state.players.length >= 10} sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>
                🤖 Dodaj bota
              </Button>
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mt: 2 }}>
              Pula pytań: {state.poolSize} {state.poolSize < 40 && '(mała – pytania mogą się powtarzać)'}
            </Typography>
          </Panel>
        )}

        {/* Rozgrywka */}
        {state.status === 'running' && (
          <Panel title={`Pytanie ${c ? c.n : ''}`}>
            <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--gold)', mb: 1.5 }}>{describeNow(state)}</Typography>

            {c && (c.status === 'asking' || c.status === 'answering') && <Box sx={{ mb: 2 }}><TimerBar left={left} total={total} /></Box>}

            {c && (
              <>
                <QuestionPanel current={c} size="host" hostPreview embedMedia={false} />
                {c.question.link && <MediaRemote media={c.question.media} act={act} busy={busy} />}
                {c.question.typ !== 'abcd' && c.correct && (
                  <Alert severity="info" sx={{ mt: 2 }} icon={false}>
                    <strong>Poprawna odpowiedź (tylko dla prowadzącego):</strong> {c.correct.text}
                  </Alert>
                )}
                {c.answer && (
                  <Alert severity={c.status === 'judging' ? 'warning' : 'info'} sx={{ mt: 2 }} icon={false}>
                    <strong>{answerer}</strong> odpowiada:{' '}
                    {c.answer.voice ? <em>głosem (oceń sam)</em> : <strong>„{c.question.typ === 'abcd' ? String(c.answer.value || '').toUpperCase() : c.answer.value}”</strong>}
                    {c.suggestion && c.status === 'judging' && (
                      <> — podpowiedź: <strong>{c.suggestion === 'correct' ? 'wygląda na dobrą' : 'wygląda na złą'}</strong></>
                    )}
                  </Alert>
                )}
              </>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 2.5 }}>
              {c && c.status === 'judging' && (
                <>
                  <Button variant="contained" color="success" size="large" onClick={() => act('judge', { correct: true })} disabled={busy}
                    sx={{ outline: c.suggestion === 'correct' ? '3px solid #fff' : 'none' }}>
                    ✔ Dobra odpowiedź
                  </Button>
                  <Button variant="contained" color="error" size="large" onClick={() => act('judge', { correct: false })} disabled={busy}
                    sx={{ outline: c.suggestion === 'wrong' ? '3px solid #fff' : 'none' }}>
                    ✖ Zła odpowiedź
                  </Button>
                  <Typography sx={{ alignSelf: 'center', color: 'var(--ink-dim)', fontSize: '0.85rem' }}>Bez limitu czasu – oceń, kiedy będziesz gotowy</Typography>
                </>
              )}
              {c && c.status === 'revealed' && (
                <Button variant="contained" size="large" onClick={() => act('next')} disabled={busy || paused}
                  sx={{ background: 'linear-gradient(120deg, var(--gold-light), var(--gold) 55%, var(--gold-deep))', color: '#1a1205', fontWeight: 800 }}>
                  Dalej ▶ {advanceLeft !== null && `(${Math.ceil(advanceLeft)})`}
                </Button>
              )}
              {c && (c.status === 'asking' || c.status === 'answering' || c.status === 'judging') && (
                <Button variant="outlined" onClick={() => act('skip')} disabled={busy || paused} sx={{ color: 'var(--ink)', borderColor: 'rgba(255,255,255,0.3)' }}>
                  ⤼ Pomiń pytanie
                </Button>
              )}
            </Box>

            {state.awaiting && (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ mb: 1 }}>
                  {holder} wskazuje{state.awaiting.first && state.stage === 2 ? ' (pierwsze wyznaczenie – tylko przeciwna strona studia)' : ''}. Możesz wskazać za niego/nią
                  {designLeft !== null && <> (losowo za {Math.ceil(designLeft)} s)</>}:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {state.awaiting.allowedIds.map((id) => (
                    <Button key={id} variant="outlined" onClick={() => act('designate', { byId: state.awaiting.byId, targetId: id })} disabled={busy || paused}
                      sx={{ color: 'var(--ink)', borderColor: 'rgba(var(--accent-rgb),0.5)' }}>
                      {state.players.find((p) => p.id === id).seat}. {playerName(state, id)}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 3 }}>
              <Typography sx={{ color: 'var(--ink-dim)', fontSize: '0.8rem', mb: 1 }}>Ustawienia (działają od następnego pytania):</Typography>
              <Settings config={state.config} onChange={(patch) => act('config', { config: patch })} disabled={busy} showBots={state.test} />
              <Typography variant="body2" sx={{ color: 'var(--ink-dim)', mt: 1.5 }}>
                Pytań zadanych: {state.questionsAsked} · w puli zostało: {state.poolRemaining}/{state.poolSize}
                {state.recycled && ' · pytania zaczęły się powtarzać'}
              </Typography>
            </Box>
          </Panel>
        )}

        {state.status === 'finished' && state.result && (
          <Panel title="Koniec gry">
            <Typography sx={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.8rem', color: 'var(--gold)' }}>
              🏆 {state.result.winnerIds.map((id) => playerName(state, id)).join(' i ')}
            </Typography>
            <Typography sx={{ color: 'var(--ink-dim)', mb: 2 }}>{state.result.reason}</Typography>
            {state.result.ranking.map((r, i) => (
              <Typography key={r.id} sx={{ py: 0.25 }}>
                {i + 1}. <strong>{r.name}</strong> (stanowisko {r.seat}) – {r.total} pkt
              </Typography>
            ))}
            <Button component="a" href="/teleturniej/gry" variant="contained" sx={{ mt: 3 }}>
              ← Wróć do listy gier
            </Button>
          </Panel>
        )}
      </Box>

      {/* ---- PRAWA KOLUMNA: gracze i przebieg ---- */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <Panel title={`Gracze (${state.players.length}/10)`}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
            {state.players.map((p) => (
              <Box key={p.id} sx={{ position: 'relative' }}>
                <PodiumCard player={p} stage={state.stage} compact code={state.code} />
                {state.status === 'lobby' && (
                  <Button size="small" onClick={() => act('kick', { playerId: p.id })} disabled={busy} sx={{ position: 'absolute', right: 2, bottom: 2, minWidth: 0, px: 1, color: '#ff9b9b', fontSize: '0.7rem' }}>
                    usuń
                  </Button>
                )}
              </Box>
            ))}
          </Box>
        </Panel>

        <Panel title="Przebieg gry">
          <Box sx={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse', gap: 0.5 }}>
            {[...state.log].reverse().map((l, i) => (
              <Typography
                key={`${l.t}-${i}`}
                variant="body2"
                sx={{ color: l.kind === 'good' ? '#7be3a2' : l.kind === 'bad' ? '#ff9b9b' : l.kind === 'stage' ? 'var(--gold)' : 'var(--ink-dim)', fontWeight: l.kind === 'stage' ? 700 : 400 }}
              >
                {l.text}
              </Typography>
            ))}
          </Box>
        </Panel>
      </Box>
    </Box>
  );
};

export default GameHost;
