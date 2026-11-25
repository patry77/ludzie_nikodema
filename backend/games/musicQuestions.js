'use strict';
// Wbudowana pula pytan muzycznych (wiedza o muzyce) do 1 z 10. Dwa pytania maja odtwarzacz (YouTube).

const abcd = (id, pytanie, a, b, c, d, ok, extra) => ({
  id: `music-${id}`, typ: 'abcd', pytanie, odp_a: a, odp_b: b, odp_c: c, odp_d: d, poprawna_odpowiedz: ok, ...(extra || {}),
});
const open = (id, pytanie, ok, alt, extra) => ({
  id: `music-${id}`, typ: 'otwarte', pytanie, poprawna_odpowiedz: ok, alt: alt || [], ...(extra || {}),
});

const MUSIC_QUESTIONS = [
  open(1, 'Jaki to utwór zespołu Queen?', 'Bohemian Rhapsody', ['bohemian rhapsody'], { media: 'muzyka', link: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ' }),
  abcd(2, 'Kto wykonuje ten utwór?', 'Rick Astley', 'Michael Jackson', 'Elton John', 'Phil Collins', 'a', { media: 'wideo', link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }),
  abcd(3, 'Ile osób liczył oryginalny skład The Beatles?', '3', '4', '5', '6', 'b'),
  abcd(4, 'Który kompozytor stracił słuch, a mimo to napisał IX Symfonię z „Odą do radości”?', 'Mozart', 'Bach', 'Beethoven', 'Chopin', 'c'),
  abcd(5, 'Który instrument ma 88 klawiszy?', 'Organy', 'Akordeon', 'Fortepian', 'Klawesyn', 'c'),
  abcd(6, 'Kto jest autorem „Czterech pór roku”?', 'Antonio Vivaldi', 'Johann Strauss', 'Giuseppe Verdi', 'Claude Debussy', 'a'),
  abcd(7, 'Który polski kompozytor jest autorem „Poloneza A-dur”?', 'Moniuszko', 'Chopin', 'Szymanowski', 'Penderecki', 'b'),
  abcd(8, 'Jak nazywa się „król popu”?', 'Elvis Presley', 'Michael Jackson', 'Prince', 'George Michael', 'b'),
  abcd(9, 'Którego zespołu liderem był Freddie Mercury?', 'Led Zeppelin', 'Queen', 'Pink Floyd', 'The Who', 'b'),
  abcd(10, 'Z jakiego kraju pochodzi zespół ABBA?', 'Norwegia', 'Dania', 'Szwecja', 'Finlandia', 'c'),
  abcd(11, 'Ile strun ma standardowa gitara klasyczna?', '4', '5', '6', '8', 'c'),
  abcd(12, 'Który instrument należy do grupy instrumentów dętych blaszanych?', 'Flet', 'Trąbka', 'Klarnet', 'Obój', 'b'),
  abcd(13, 'Jak nazywa się najniższy męski głos śpiewaczy?', 'Tenor', 'Baryton', 'Bas', 'Kontratenor', 'c'),
  abcd(14, 'Kto napisał operę „Straszny dwór”?', 'Stanisław Moniuszko', 'Fryderyk Chopin', 'Ignacy Paderewski', 'Henryk Wieniawski', 'a'),
  abcd(15, 'Jak nazywa się brytyjska piosenkarka, autorka płyty „21”?', 'Dua Lipa', 'Adele', 'Amy Winehouse', 'Duffy', 'b'),
  abcd(16, 'Który zespół wydał album „The Dark Side of the Moon”?', 'Pink Floyd', 'Genesis', 'Deep Purple', 'Yes', 'a'),
  abcd(18, 'W którym mieście odbywa się Krajowy Festiwal Polskiej Piosenki?', 'Opole', 'Kielce', 'Zielona Góra', 'Lublin', 'a'),
  abcd(19, 'Który polski zespół nagrał przebój „Przez Twe oczy zielone”?', 'Akcent', 'Bajm', 'Lombard', 'Perfect', 'a'),
  abcd(20, 'Kto śpiewał przebój „Jolka, Jolka pamiętasz”?', 'Budka Suflera', 'Perfect', 'Lady Pank', 'Dżem', 'a'),
  abcd(22, 'W jakim kraju wymyślono tango?', 'Hiszpania', 'Argentyna', 'Meksyk', 'Kuba', 'b'),
  abcd(23, 'Który polski taniec narodowy tradycyjnie otwiera bal, np. studniówkę?', 'Krakowiak', 'Mazur', 'Polonez', 'Oberek', 'c'),
  abcd(24, 'Który kompozytor napisał „Marsz weselny” do „Snu nocy letniej”?', 'Mendelssohn', 'Wagner', 'Schubert', 'Brahms', 'a'),
  abcd(25, 'Jak nazywa się mały instrument strunowy szarpany, kojarzony z Hawajami?', 'Banjo', 'Ukulele', 'Mandolina', 'Lutnia', 'b'),
  abcd(26, 'Co oznacza w nutach słowo „forte”?', 'Cicho', 'Szybko', 'Głośno', 'Wolno', 'c'),
  abcd(27, 'Który kolor mają klawisze fortepianu oznaczające półtony?', 'Czarny', 'Biały', 'Czerwony', 'Brązowy', 'a'),
  abcd(28, 'Kto jest autorem utworu „Imagine”?', 'Paul McCartney', 'John Lennon', 'George Harrison', 'Ringo Starr', 'b'),
  abcd(29, 'Jak nazywał się wokalista zespołu Nirvana?', 'Eddie Vedder', 'Kurt Cobain', 'Chris Cornell', 'Dave Grohl', 'b'),
  open(31, 'Jak nazywa się wielki festiwal muzyczny w Wielkiej Brytanii, słynący z błota i sceny „Pyramid”?', 'Glastonbury', ['glastonbury festival']),
  open(33, 'Jak nazywa się bożonarodzeniowa kolęda zaczynająca się od słów „Wśród nocnej ciszy”?', 'Wśród nocnej ciszy', ['wsrod nocnej ciszy']),
  open(34, 'Jak nazywa się kolęda zaczynająca się od słów „Bóg się rodzi, moc truchleje”?', 'Bóg się rodzi', ['bog sie rodzi']),
  open(37, 'Jak nazywa się zespół, który wykonuje utwór „Last Christmas”?', 'Wham!', ['wham']),
  open(38, 'Jaka piosenkarka wykonuje „All I Want for Christmas Is You”?', 'Mariah Carey', ['mariah carey', 'carey']),
  open(39, 'Jaki jest tytuł kolędy zaczynającej się od słów „Lulajże, Jezuniu”?', 'Lulajże, Jezuniu', ['lulajze jezuniu', 'lulajze']),
  abcd(41, 'Który zespół wykonuje „Hotel California”?', 'Eagles', 'Fleetwood Mac', 'The Doors', 'Kansas', 'a'),
  abcd(42, 'Jak ma na imię wokalista zespołu U2, znany jako Bono?', 'Paul', 'Adam', 'Dave', 'Larry', 'a'),
  abcd(43, 'Ile linii ma pięciolinia?', '4', '5', '6', '7', 'b'),
  abcd(44, 'Kto wykonał „Sen o Warszawie”?', 'Czesław Niemen', 'Krzysztof Krawczyk', 'Marek Grechuta', 'Zbigniew Wodecki', 'a'),
  abcd(45, 'Który instrument ma pedały i klawiaturę nożną, a słynie z kościołów?', 'Akordeon', 'Organy', 'Harmonijka', 'Pianino', 'b'),
];

module.exports = { MUSIC_QUESTIONS };
