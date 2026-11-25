'use strict';
// Wbudowana pula pytan MUZYCZNYCH Z LINKIEM (YouTube) - taka jak z formularza pytan (media + link).
// Linki sprawdzone przez YouTube oEmbed. Do testu odtwarzacza w 1 z 10 (TV, prowadzacy, telefon).

const yt = (id) => `https://www.youtube.com/watch?v=${id}`;
const song = (n, id, pytanie, a, b, c, d, ok, media) => ({
  id: `music-${n}`, typ: 'abcd', pytanie, odp_a: a, odp_b: b, odp_c: c, odp_d: d, poprawna_odpowiedz: ok, media: media || 'muzyka', link: yt(id),
});
const guess = (n, id, pytanie, ok, alt, media) => ({
  id: `music-${n}`, typ: 'otwarte', pytanie, poprawna_odpowiedz: ok, alt: alt || [], media: media || 'muzyka', link: yt(id),
});

const MUSIC_QUESTIONS = [
  guess(1, 'fJ9rUzIMcZQ', 'Jaki to utwór zespołu Queen?', 'Bohemian Rhapsody', ['bohemian rhapsody']),
  song(2, 'dQw4w9WgXcQ', 'Kto wykonuje ten utwór?', 'Rick Astley', 'Michael Jackson', 'Elton John', 'Phil Collins', 'a', 'wideo'),
  song(3, 'kJQP7kiw5Fk', 'Jaki to utwór?', 'Bailando', 'Despacito', 'Gasolina', 'Danza Kuduro', 'b'),
  guess(4, '9bZkp7q19f0', 'Jak nazywa się ten taniec-przebój koreańskiego artysty PSY?', 'Gangnam Style', ['gangnam']),
  song(5, 'JGwWNGJdvx8', 'Kto śpiewa „Shape of You”?', 'Justin Bieber', 'Ed Sheeran', 'Sam Smith', 'Shawn Mendes', 'b'),
  guess(6, 'Zi_XLOBDo_Y', 'Jaki to utwór Michaela Jacksona?', 'Billie Jean', ['billie jean']),
  song(7, 'hTWKbfoikeg', 'Który zespół wykonuje ten utwór?', 'Pearl Jam', 'Soundgarden', 'Nirvana', 'Foo Fighters', 'c'),
  song(8, 'OPf0YbXqDm0', 'Jaki to utwór?', 'Uptown Funk', 'Happy', 'Get Lucky', 'Shake It Off', 'a', 'wideo'),
  guess(9, 'YQHsXMglC9A', 'Kto wykonuje ten utwór „Hello”?', 'Adele', ['adele']),
  song(10, 'FTQbiNvZqaY', 'Jak nazywa się ten przebój zespołu Toto?', 'Rosanna', 'Hold the Line', 'Africa', 'I Won\'t Hold You Back', 'c'),
  guess(11, '1w7OgIMMRc4', 'Jaki to utwór zespołu Guns N\' Roses?', 'Sweet Child O\' Mine', ['sweet child o mine', 'sweet child']),
  song(12, 'fNFzfwLM72c', 'Który zespół wykonuje „Stayin\' Alive”?', 'ABBA', 'Bee Gees', 'Boney M.', 'Earth, Wind & Fire', 'b', 'wideo'),
  guess(13, 'djV11Xbc914', 'Jaki to utwór zespołu a-ha?', 'Take On Me', ['take on me']),
  song(14, 'bx1Bh8ZvH84', 'Który zespół wykonuje „Wonderwall”?', 'Blur', 'Oasis', 'Coldplay', 'Radiohead', 'b'),
  guess(15, 'YkgkThdzX-8', 'Jaki to utwór Johna Lennona?', 'Imagine', ['imagine']),
  song(16, '1k8craCGpgs', 'Który zespół wykonuje „Don\'t Stop Believin\'”?', 'Journey', 'Bon Jovi', 'Survivor', 'Foreigner', 'a'),
  guess(17, '_Yhyp-_hX2s', 'Który raper wykonuje „Lose Yourself”?', 'Eminem', ['eminem']),
  song(18, 'rYEDA3JcQqw', 'Jaki to utwór Adele?', 'Skyfall', 'Hello', 'Someone Like You', 'Rolling in the Deep', 'd', 'wideo'),
  guess(19, 'izGwDsrQ1eQ', 'Kto śpiewa „Careless Whisper”?', 'George Michael', ['george michael', 'michael']),
  song(20, 'sOnqjkJTMaA', 'Który artysta wykonuje „Thriller”?', 'Prince', 'Michael Jackson', 'Lionel Richie', 'Stevie Wonder', 'b', 'wideo'),
];

// Przykladowe fragmenty [od, do] w sekundach - pokazuja dzialanie wycinka na TV
const SEGMENTS = { 1: [60, 80], 3: [40, 60], 5: [30, 50], 6: [25, 45], 7: [20, 40], 9: [45, 65], 11: [30, 50], 13: [30, 50], 14: [50, 70], 16: [40, 60], 17: [45, 65], 19: [30, 50] };
MUSIC_QUESTIONS.forEach((q) => {
  const seg = SEGMENTS[Number(String(q.id).replace('music-', ''))];
  if (seg) {
    q.start = seg[0];
    q.end = seg[1];
  }
});

module.exports = { MUSIC_QUESTIONS };
