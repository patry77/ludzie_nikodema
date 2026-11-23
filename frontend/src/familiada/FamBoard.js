import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import DotDisplay from './DotMatrix';

export const ANSWER_CHARS = 16;
const ROW_CHARS = 21; // numer(1) + spacja(1) + odpowiedz(16) + spacja(1) + punkty(2)

const place = (arr, start, str, v = 1) => {
  [...str].forEach((ch, i) => {
    if (start + i >= 0 && start + i < arr.length) arr[start + i] = { ch, v };
  });
};
const blankLine = (n) => Array.from({ length: n }, () => ({ ch: ' ', v: 0 }));

// Tablica rundy: do 6 odpowiedzi + linia SUMA. Nieodkryte: numer + przyciemnione kreski.
export const FamBoard = ({ round }) => {
  const { lines, keys } = useMemo(() => {
    const out = [];
    const ks = [];
    for (let i = 0; i < 6; i++) {
      const a = round && round.answers[i];
      const line = blankLine(ROW_CHARS);
      if (a) {
        place(line, 0, String(i + 1));
        if (a.revealed) {
          const dim = a.late ? 0.55 : 1;
          place(line, 2, [...a.text].slice(0, ANSWER_CHARS).join(''), dim);
          place(line, 19, String(a.points).padStart(2, ' '), dim);
        } else {
          place(line, 2, '-'.repeat(ANSWER_CHARS), 0.28);
        }
        ks.push(a.revealed ? `r${round.n}-${i}` : '');
      } else {
        ks.push('');
      }
      out.push(line);
    }
    const sum = blankLine(ROW_CHARS);
    place(sum, 11, 'SUMA');
    place(sum, 16, String(round ? round.bank : 0).padStart(4, ' '));
    out.push(sum);
    ks.push('');
    return { lines: out, keys: ks };
  }, [round]);

  return <DotDisplay lines={lines} charCols={ROW_CHARS} gap={2} animKeys={keys} label="Tablica z odpowiedziami" />;
};

const FINAL_CHARS = 37; // odp. gracza 1 (15) + spacja + pkt (2) + spacja + pkt (2) + spacja + odp. gracza 2 (15)

// Tablica finalu: 5 wierszy (odpowiedzi 1. i 2. gracza z punktami) + linia sum
export const FinalBoard = ({ final: f, target }) => {
  const { lines, keys } = useMemo(() => {
    const out = [];
    const ks = [];
    const cut = (s) => [...(s || '')].slice(0, 15).join('');
    for (let i = 0; i < 5; i++) {
      const row = f && f.rows[i];
      const line = blankLine(FINAL_CHARS);
      if (row) {
        if (row.shown) {
          if (row.a1) {
            place(line, 0, cut(row.a1.text).padEnd(15, ' '), row.a1.onBoard ? 1 : 0.5);
            place(line, 16, String(row.a1.points).padStart(2, ' '));
          } else {
            place(line, 0, '-'.repeat(15), 0.28);
          }
          if (row.a2) {
            place(line, 19, String(row.a2.points).padStart(2, ' '));
            place(line, 22, cut(row.a2.text), row.a2.onBoard ? 1 : 0.5);
          } else {
            place(line, 22, '-'.repeat(15), 0.28);
          }
          ks.push(`f${i}`);
        } else {
          // odpowiedzi ukryte: gwiazdki pokazuja, ze wiersz jest wypelniony
          place(line, 0, (row.filled1 ? '*' : '-').repeat(15), row.filled1 ? 0.7 : 0.28);
          place(line, 22, (row.filled2 ? '*' : '-').repeat(15), row.filled2 ? 0.7 : 0.28);
          ks.push('');
        }
      }
      out.push(line);
    }
    const sum = blankLine(FINAL_CHARS);
    // sumy rosna razem z odkrywanymi wierszami (nie zdradzamy ich wczesniej)
    const showing = !!f && (f.step === 'revealing' || f.step === 'result');
    const shownRows = showing ? f.rows.filter((row) => row.shown) : [];
    const s1 = showing ? shownRows.reduce((n, row) => n + (row.a1 ? row.a1.points : 0), 0) : null;
    const s2 = showing ? shownRows.reduce((n, row) => n + (row.a2 ? row.a2.points : 0), 0) : null;
    place(sum, 0, 'SUMA');
    place(sum, 5, s1 === null ? '  --' : String(s1).padStart(4, ' '));
    const total = (s1 || 0) + (s2 || 0);
    place(sum, 14, showing ? `${String(total).padStart(3, ' ')}/${target}` : '', 1);
    place(sum, 28, 'SUMA');
    place(sum, 33, s2 === null ? '  --' : String(s2).padStart(4, ' '));
    out.push(sum);
    ks.push('');
    return { lines: out, keys: ks };
  }, [f, target]);

  return <DotDisplay lines={lines} charCols={FINAL_CHARS} gap={2} animKeys={keys} label="Tablica finału" />;
};

// Maly licznik punktow (np. wynik druzyny)
export const ScoreDisplay = ({ value, digits = 3, label }) => {
  const lines = useMemo(() => [String(value).padStart(digits, ' ')], [value, digits]);
  const keys = useMemo(() => [String(value)], [value]);
  return <DotDisplay lines={lines} charCols={digits} gap={0} animKeys={keys} label={label || 'Wynik'} />;
};

// Ramka tablicy (czarna, z metalowym obramowaniem)
export const BoardFrame = ({ children, sx }) => (
  <Box
    sx={{
      p: 'clamp(10px, 1.4vw, 26px)',
      borderRadius: '22px',
      background: '#010402',
      border: 'clamp(4px, 0.5vw, 10px) solid #1b1f2b',
      boxShadow: '0 0 0 3px #3a4156, 0 0 40px rgba(57,255,106,0.12), inset 0 0 40px rgba(0,0,0,0.9)',
      ...sx,
    }}
  >
    {children}
  </Box>
);
