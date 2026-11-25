import React from 'react';
import { PartyCard } from '../ogniwo/OgniwoPages';

export const KlamczuchCard = ({ onCreated }) => (
  <PartyCard
    format="klamczuch"
    title="Kłamczuch"
    tagline="4–10 graczy · jeden z was dostaje odpowiedzi z góry"
    onCreated={onCreated}
    sources={[
      { value: 'sample', label: 'Wbudowana pula pytań Familiady' },
      { value: 'custom', label: 'Moje pytania Familiady' },
      { value: 'all', label: 'Wbudowane + moje pytania Familiady' },
    ]}
    bullets={[
      <>Pytania i tablica odpowiedzi <strong style={{ color: 'var(--ink)' }}>jak w Familiadzie</strong> – gracze podają po jednej odpowiedzi głosem, a prowadzący wskazuje ją na tablicy.</>,
      <>Po cichu losowany jest <strong style={{ color: 'var(--ink)' }}>kłamczuch</strong>: na swoim telefonie widzi wszystkie odpowiedzi. Reszta odpowiada z głowy.</>,
      <>Po każdej rundzie wszyscy <strong style={{ color: 'var(--ink)' }}>głosują na kłamczucha</strong>. Najwięcej głosów – odpada i ujawnia rolę.</>,
      <>Kłamczuch wykryty = wygrywają uczciwi. Kłamczuch dotrwał do finałowej dwójki = wygrywa on.</>,
    ]}
  />
);

export default KlamczuchCard;
