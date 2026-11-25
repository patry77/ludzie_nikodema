'use strict';
// Smieszne pytania "w stylu familiadowym" - WLASNE, wymyslone na potrzeby gry (wyniki ankiet sa przykladowe,
// nie pochodza z prawdziwych badan ani z programu telewizyjnego). Odpowiedzi: maks. 16 znakow, malejaco wg punktow.

const q = (n, pytanie, odpowiedzi) => ({
  id: `fam-funny-${n}`,
  pytanie,
  odpowiedzi: odpowiedzi.map(([tekst, punkty]) => ({ tekst, punkty })),
});

const FAMILIADA_FUNNY_QUESTIONS = [
  q(1, 'Co słyszy mąż, gdy wraca z zakupów bez połowy rzeczy z listy?', [['A TO NIE KUPIŁEŚ', 34], ['PRZECIEŻ PISAŁAM', 26], ['MIAŁEŚ DZWONIĆ', 18], ['JA TO ZROBIĘ', 14], ['NO TAK...', 8]]),
  q(2, 'Wymień wymówkę, gdy nie odbierasz telefonu od szefa.', [['BYŁEM W TOALECIE', 32], ['NIE SŁYSZAŁEM', 26], ['BATERIA PADŁA', 18], ['ŚPIĘ', 14], ['BYŁEM NA ZASIĘGU', 10]]),
  q(3, 'Co robisz, gdy ktoś mówi „musimy porozmawiać”?', [['PANIKUJĘ', 38], ['SZUKAM WINY', 20], ['UCIEKAM', 18], ['UDAJĘ CHOREGO', 14], ['IDĘ NA KAWĘ', 10]]),
  q(4, 'Wymień rzecz, którą ktoś Ci pożyczył i do dziś nie oddałeś.', [['PARASOL', 30], ['KSIĄŻKĘ', 28], ['PŁYTĘ', 16], ['PIENIĄDZE', 14], ['KABEL', 8], ['SŁOIK', 4]]),
  q(5, 'Co robi facet, gdy żona każe mu coś naprawić?', [['GOOGLUJE', 30], ['ODKŁADA NA JUTRO', 26], ['DZWONI DO TATY', 20], ['WZYWA FACHOWCA', 14], ['BURCZY', 10]]),
  q(6, 'Wymień rzecz, którą robisz w samochodzie, gdy nikt nie widzi.', [['ŚPIEWAM', 42], ['GRZEBIĘ W NOSIE', 24], ['TAŃCZĘ', 14], ['GADAM SAM', 12], ['PRZEKLINAM', 8]]),
  q(7, 'Za co teściowa może krytykować zięcia?', [['ZA ZUPĘ', 24], ['ZA AUTO', 20], ['ZA PRACĘ', 18], ['ZA WYGLĄD', 16], ['ZA ŻONĘ', 12], ['ZA WSZYSTKO', 10]]),
  q(8, 'Co robimy, gdy tort urodzinowy jest już pokrojony?', [['JEMY', 46], ['ROBIMY ZDJĘCIE', 20], ['LIŻEMY PALCE', 14], ['PODKRADAMY', 12], ['DIETA OD JUTRA', 8]]),
  q(9, 'Wymień dźwięk, który budzi ludzi w nocy.', [['BUDZIK', 24], ['CHRAPANIE', 24], ['TELEFON', 20], ['KOT', 14], ['SĄSIAD', 10], ['BURZA', 8]]),
  q(10, 'Co robi mąż w łóżku, co denerwuje żonę?', [['CHRAPIE', 40], ['KOPIE', 20], ['ZABIERA KOŁDRĘ', 18], ['OGLĄDA TELEFON', 14], ['JE CHIPSY', 8]]),
  q(11, 'Co robi dziecko, gdy ma już iść spać?', [['CHCE MU SIĘ PIĆ', 32], ['IDZIE DO TOALETY', 24], ['JEST GŁODNE', 20], ['MA PYTANIA', 14], ['SIĘ BOI', 10]]),
  q(12, 'Co dostaje babcia na Dzień Babci od wnuczka?', [['LAURKĘ', 38], ['KWIATY', 24], ['WIERSZYK', 18], ['BUZIAKA', 12], ['CZEKOLADKI', 8]]),
  q(13, 'Co chowamy przed gośćmi?', [['BAŁAGAN', 36], ['BRUDNE NACZYNIA', 24], ['BIELIZNĘ', 18], ['ŚMIECI', 12], ['KOTA', 10]]),
  q(14, 'Czego nie powinno się mówić na pierwszej randce?', [['O BYŁYM', 36], ['O PIENIĄDZACH', 20], ['O MAMIE', 18], ['O ŚLUBIE', 14], ['O CHOROBACH', 12]]),
  q(15, 'Co robi pies, gdy właściciel wraca do domu?', [['SKACZE', 34], ['SZCZEKA', 26], ['MACHA OGONEM', 22], ['LIŻE', 12], ['GRYZIE BUTY', 6]]),
  q(16, 'Za co dzieci dostają szlaban?', [['ZA OCENY', 34], ['ZA BAŁAGAN', 22], ['ZA TELEFON', 20], ['ZA PYSKOWANIE', 14], ['ZA PÓŹNY POWRÓT', 10]]),
  q(17, 'Co wysyła się w grupie rodzinnej na WhatsAppie?', [['ŻYCZENIA', 30], ['ZDJĘCIE KOTA', 22], ['ŁAŃCUSZEK', 20], ['FILMIK', 16], ['MEMY', 8], ['BUZIAKI', 4]]),
  q(18, 'Co robią wszyscy na weselu po północy?', [['TAŃCZĄ', 36], ['PIJĄ', 28], ['ŚPIEWAJĄ', 16], ['JEDZĄ BARSZCZ', 12], ['PŁACZĄ', 8]]),
  q(19, 'Co wyjadamy z lodówki po północy?', [['SZYNKĘ', 24], ['SER', 22], ['NUTELLĘ', 20], ['KEFIR', 12], ['PARÓWKI', 12], ['KETCHUP', 10]]),
  q(20, 'Co ma na sobie typowy Polak na plaży?', [['KLAPKI', 28], ['SKARPETY', 26], ['SLIPY', 20], ['KAPELUSZ', 14], ['OKULARY', 12]]),
  q(21, 'Co po dwóch tygodniach staje się wieszakiem na ubrania?', [['BIEŻNIA', 34], ['ROWEREK', 26], ['KRZESŁO', 20], ['ORBITREK', 14], ['HANTLE', 6]]),
  q(22, 'Co kupują mężczyźni w sklepie z elektroniką, a nie potrzebują?', [['TELEWIZOR', 34], ['SŁUCHAWKI', 22], ['KONSOLĘ', 18], ['DRONA', 14], ['KABEL', 8], ['GŁOŚNIK', 4]]),
  q(23, 'Co mówi dziecko, które nie chce iść do szkoły?', [['BOLI MNIE BRZUCH', 40], ['MAM GORĄCZKĘ', 24], ['NIE MAM ZESZYTU', 14], ['JEST WF', 12], ['NIE CHCĘ', 10]]),
  q(24, 'Które zwierzę w ZOO najbardziej rozśmiesza ludzi?', [['MAŁPA', 46], ['PINGWIN', 22], ['SŁOŃ', 12], ['PAPUGA', 12], ['SURYKATKA', 8]]),
  q(25, 'Co robimy po zjedzeniu za dużo na święta?', [['LEŻYMY', 40], ['JĘCZYMY', 22], ['ŚPIMY', 18], ['OBIECUJEMY DIETĘ', 12], ['SPACERUJEMY', 8]]),
  q(26, 'Jakiego klienta nie lubią sprzedawcy?', [['TYLKO PATRZY', 30], ['TARGUJE SIĘ', 26], ['REKLAMUJE', 20], ['PYTA O PROMOCJĘ', 14], ['KŁÓCI SIĘ', 10]]),
  q(27, 'Co robi pasażer autobusu, gdy zbliża się kontroler?', [['UDAJE ŚPIĄCEGO', 30], ['BLEDNIE', 26], ['SZUKA BILETU', 22], ['WYSIADA', 14], ['MODLI SIĘ', 8]]),
  q(28, 'Gdzie ludzie najgłośniej śpiewają?', [['POD PRYSZNICEM', 52], ['W AUCIE', 24], ['NA KARAOKE', 12], ['W KOŚCIELE', 8], ['PRZY SPRZĄTANIU', 4]]),
  q(29, 'Co babcia wkłada do torebki, gdy idzie w gości?', [['CHUSTECZKI', 34], ['CUKIERKI', 28], ['OKULARY', 16], ['TABLETKI', 14], ['RÓŻANIEC', 8]]),
  q(30, 'Dlaczego ludzie wychodzą z imprezy wcześniej?', [['ZMĘCZENIE', 28], ['NUDA', 24], ['SPRAWY RODZINNE', 18], ['KATER', 16], ['PRACA RANO', 14]]),
  q(31, 'Co wyrzucamy pierwsze podczas porządków?', [['STARE PAPIERY', 30], ['ZEPSUTY SPRZĘT', 24], ['UBRANIA', 22], ['ZABAWKI', 14], ['REKLAMY', 10]]),
  q(32, 'Co jest zakazane w kinie, a ludzie i tak to robią?', [['GADAJĄ', 32], ['ŚMIECĄ', 20], ['NAGRYWAJĄ', 18], ['CAŁUJĄ SIĘ', 16], ['KOPIĄ W FOTEL', 14]]),
  q(33, 'Co dzieje się z długopisem w domu?', [['ZNIKA', 44], ['PRZESTAJE PISAĆ', 24], ['SIĘ GUBI', 14], ['JEST POŻYCZONY', 10], ['ZGRYZIONY', 8]]),
  q(34, 'Wymień coś, co zawsze jest za krótkie.', [['KOŁDRA', 30], ['WEEKEND', 26], ['URLOP', 20], ['SPODNIE', 12], ['KABEL', 8], ['ŻYCIE', 4]]),
  q(35, 'Z czym kojarzy się niedzielne popołudnie?', [['Z OBIADEM', 32], ['Z NUDĄ', 24], ['ZE SPACEREM', 18], ['Z TELEWIZJĄ', 16], ['Z DRZEMKĄ', 10]]),
  q(36, 'Co robią ludzie, gdy czekają na windę?', [['PATRZĄ W TELEFON', 36], ['NACISKAJĄ GUZIK', 30], ['GAPIĄ SIĘ', 16], ['TUPIĄ', 10], ['POPRAWIAJĄ WŁOSY', 8]]),
  q(37, 'Za co lubimy swojego psa?', [['ZA WIERNOŚĆ', 40], ['ZA RADOŚĆ', 22], ['ZA PRZYTULANIE', 18], ['ZA SPACERY', 10], ['ZA MIŁOŚĆ', 10]]),
  q(38, 'Co robisz, gdy zorientujesz się, że idziesz w złą stronę?', [['ZAWRACAM', 34], ['ZERKAM W TELEFON', 26], ['PYTAM O DROGĘ', 20], ['IDĘ DALEJ', 12], ['KLNĘ', 8]]),
  q(39, 'Co mówią polskie mamy do dzieci przy wyjściu?', [['ZAPNIJ KURTKĘ', 32], ['ZAŁÓŻ CZAPKĘ', 28], ['UWAŻAJ NA SIEBIE', 20], ['WEŹ KANAPKĘ', 12], ['NIE RÓB GŁUPOT', 8]]),
  q(40, 'Co robi tata, gdy rozkłada meble z pudełka?', [['KLNIE', 34], ['ZOSTAJE ŚRUBKA', 28], ['SZUKA KLUCZA', 20], ['DZWONI PO POMOC', 12], ['SIĘ POCI', 6]]),
];

module.exports = { FAMILIADA_FUNNY_QUESTIONS };
