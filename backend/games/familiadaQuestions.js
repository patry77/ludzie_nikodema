'use strict';
// Wbudowana pula pytan do Familiady. UWAGA: to pytania "w stylu familiadowym" z przykladowymi wynikami ankiet
// (wymyslonymi na potrzeby gry, nie z prawdziwych badan). Odpowiedzi: maks. 16 znakow, malejaco wg punktow.

const q = (n, pytanie, odpowiedzi) => ({
  id: `fam-sample-${n}`,
  pytanie,
  odpowiedzi: odpowiedzi.map(([tekst, punkty]) => ({ tekst, punkty })),
});

const FAMILIADA_SAMPLE_QUESTIONS = [
  q(1, 'Co zabierasz ze sobą na plażę?', [['RĘCZNIK', 32], ['KREM Z FILTREM', 24], ['OKULARY', 17], ['PARASOL', 12], ['WODĘ', 9], ['KSIĄŻKĘ', 6]]),
  q(2, 'Wymień zawód, w którym trzeba dużo chodzić.', [['LISTONOSZ', 38], ['KURIER', 26], ['KELNER', 16], ['POLICJANT', 11], ['PIELĘGNIARKA', 9]]),
  q(3, 'Co robimy w noc sylwestrową?', [['TAŃCZYMY', 28], ['SZAMPAN', 24], ['FAJERWERKI', 20], ['ŻYCZENIA', 16], ['JEDZENIE', 12]]),
  q(4, 'Wymień zwierzę domowe.', [['PIES', 41], ['KOT', 33], ['CHOMIK', 10], ['KRÓLIK', 7], ['PAPUGA', 5], ['RYBKI', 4]]),
  q(5, 'Co kupujemy w piekarni?', [['CHLEB', 36], ['BUŁKI', 27], ['PĄCZKI', 14], ['DROŻDŻÓWKA', 11], ['BAGIETKĘ', 7], ['PIERNIK', 5]]),
  q(6, 'Dlaczego ludzie spóźniają się do pracy?', [['KORKI', 34], ['PRZESPALI SIĘ', 28], ['KOMUNIKACJA', 18], ['DZIECI', 11], ['AWARIA AUTA', 9]]),
  q(7, 'Co robisz zaraz po powrocie do domu?', [['ZDEJMUJĘ BUTY', 30], ['JEM', 25], ['OGLĄDAM TV', 20], ['MYJĘ RĘCE', 15], ['PRZEBIERAM SIĘ', 10]]),
  q(8, 'Wymień czerwony owoc.', [['JABŁKO', 31], ['TRUSKAWKA', 27], ['WIŚNIA', 15], ['MALINA', 13], ['ARBUZ', 8], ['POMIDOR', 6]]),
  q(9, 'Dokąd jedziemy na wakacje?', [['NAD MORZE', 40], ['W GÓRY', 28], ['NA MAZURY', 14], ['ZA GRANICĘ', 11], ['DO BABCI', 7]]),
  q(10, 'Wymień prezent świąteczny.', [['KSIĄŻKA', 24], ['PERFUMY', 21], ['SKARPETKI', 18], ['ZABAWKA', 15], ['SŁODYCZE', 12], ['KOSMETYKI', 10]]),
  q(11, 'Co robimy na imprezie urodzinowej?', [['ŚPIEWAMY STO LAT', 32], ['JEMY TORT', 28], ['TAŃCZYMY', 18], ['DAJEMY PREZENTY', 14], ['ŻYCZYMY', 8]]),
  q(12, 'Wymień sport drużynowy.', [['PIŁKA NOŻNA', 45], ['SIATKÓWKA', 25], ['KOSZYKÓWKA', 15], ['PIŁKA RĘCZNA', 9], ['HOKEJ', 6]]),
  q(13, 'Czego nie może zabraknąć w lodówce?', [['MLEKA', 30], ['JAJ', 25], ['MASŁA', 18], ['SERA', 14], ['WĘDLINY', 8], ['KETCHUPU', 5]]),
  q(14, 'Co robimy w kinie?', [['JEMY POPCORN', 40], ['OGLĄDAMY FILM', 30], ['PIJEMY COLĘ', 15], ['CAŁUJEMY SIĘ', 10], ['ŚPIMY', 5]]),
  q(15, 'Wymień cechę dobrego szefa.', [['SPRAWIEDLIWY', 32], ['WYMAGAJĄCY', 20], ['ZORGANIZOWANY', 18], ['CIERPLIWY', 16], ['ZABAWNY', 14]]),
  q(16, 'Wymień rasę psa.', [['OWCZAREK', 28], ['LABRADOR', 24], ['YORK', 18], ['HUSKY', 12], ['DOBERMAN', 9], ['CHIHUAHUA', 9]]),
  q(17, 'Którego dnia tygodnia ludzie nie lubią najbardziej?', [['PONIEDZIAŁKU', 62], ['WTORKU', 12], ['ŚRODY', 10], ['CZWARTKU', 8], ['PIĄTKU', 5], ['NIEDZIELI', 3]]),
  q(18, 'Z czym kojarzy się zima?', [['ŚNIEG', 42], ['MRÓZ', 24], ['NARTY', 14], ['BAŁWAN', 10], ['SANKI', 6], ['KOŻUCH', 4]]),
  q(19, 'Co bierzesz do szkoły?', [['PLECAK', 30], ['ZESZYT', 25], ['DŁUGOPIS', 20], ['KSIĄŻKI', 13], ['PIÓRNIK', 7], ['KANAPKĘ', 5]]),
  q(20, 'Co robisz, gdy nie możesz zasnąć?', [['LICZĘ OWCE', 30], ['CZYTAM', 22], ['OGLĄDAM TV', 18], ['PIJĘ MLEKO', 15], ['SPACERUJĘ', 10], ['ŚPIEWAM', 5]]),
  q(21, 'Z czym kojarzy się Wielkanoc?', [['JAJKA', 36], ['ZAJĄC', 20], ['BARANEK', 14], ['ŚWIĘCONKA', 13], ['MAZUREK', 10], ['ŚMIGUS-DYNGUS', 7]]),
  q(22, 'Wymień popularne imię żeńskie.', [['ANNA', 30], ['MARIA', 25], ['KATARZYNA', 15], ['MAŁGORZATA', 12], ['AGNIESZKA', 10], ['EWA', 8]]),
  q(23, 'Wymień mebel z salonu.', [['SOFA', 34], ['STÓŁ', 24], ['FOTEL', 16], ['REGAŁ', 12], ['KOMODA', 8], ['STOLIK KAWOWY', 6]]),
  q(24, 'Co zakładamy na nogi?', [['BUTY', 38], ['SKARPETKI', 30], ['SPODNIE', 14], ['RAJSTOPY', 10], ['KLAPKI', 8]]),
  q(25, 'Co pijemy rano?', [['KAWĘ', 52], ['HERBATĘ', 28], ['SOK', 8], ['WODĘ', 6], ['KAKAO', 4], ['MLEKO', 2]]),
  q(26, 'Wymień zwierzę z Afryki.', [['LEW', 28], ['SŁOŃ', 26], ['ŻYRAFA', 20], ['ZEBRA', 14], ['HIPOPOTAM', 8], ['GEPARD', 4]]),
  q(27, 'Co robimy w łazience?', [['MYJEMY ZĘBY', 36], ['KĄPIEMY SIĘ', 28], ['GOLIMY SIĘ', 14], ['ŚPIEWAMY', 12], ['CZESZEMY SIĘ', 10]]),
  q(28, 'Czym jeździmy do pracy?', [['SAMOCHODEM', 40], ['AUTOBUSEM', 25], ['TRAMWAJEM', 12], ['ROWEREM', 10], ['METREM', 8], ['NA PIECHOTĘ', 5]]),
  q(29, 'Wymień miasto w Polsce.', [['WARSZAWA', 30], ['KRAKÓW', 24], ['GDAŃSK', 16], ['WROCŁAW', 12], ['POZNAŃ', 10], ['ŁÓDŹ', 8]]),
  q(30, 'Co widzimy w parku?', [['ŁAWKI', 28], ['DRZEWA', 26], ['PSY', 18], ['DZIECI', 14], ['KACZKI', 8], ['ROWERZYSTÓW', 6]]),
  q(31, 'Co kupujemy na wagę?', [['OWOCE', 30], ['WARZYWA', 28], ['WĘDLINY', 18], ['SER', 12], ['CUKIERKI', 12]]),
  q(32, 'Co najczęściej się gubi?', [['KLUCZE', 42], ['TELEFON', 24], ['PARASOL', 14], ['SKARPETKA', 10], ['OKULARY', 6], ['PORTFEL', 4]]),
  q(33, 'Wymień instrument muzyczny.', [['GITARA', 36], ['FORTEPIAN', 22], ['SKRZYPCE', 16], ['BĘBNY', 12], ['FLET', 8], ['TRĄBKA', 6]]),
  q(34, 'Co robimy w poniedziałek rano?', [['PIJEMY KAWĘ', 34], ['IDZIEMY DO PRACY', 28], ['NARZEKAMY', 18], ['WSTAJEMY', 12], ['PRZEKLINAMY', 8]]),
  q(35, 'Wymień potrawę wigilijną.', [['BARSZCZ', 30], ['PIEROGI', 26], ['KARP', 20], ['KUTIA', 10], ['ŚLEDŹ', 8], ['KOMPOT Z SUSZU', 6]]),
  q(36, 'Wymień cechę dobrego przyjaciela.', [['WIERNY', 30], ['SZCZERY', 24], ['LOJALNY', 16], ['ŻYCZLIWY', 14], ['SŁUCHA', 10], ['ZABAWNY', 6]]),
  q(37, 'Co ludzie robią w święta?', [['JEDZĄ', 38], ['ŚPIĄ', 22], ['OGLĄDAJĄ TV', 18], ['SPACERUJĄ', 12], ['ODPOCZYWAJĄ', 10]]),
  q(38, 'Wymień coś, co się nosi w portfelu.', [['PIENIĄDZE', 40], ['DOWÓD', 24], ['KARTĘ', 18], ['PRAWO JAZDY', 10], ['ZDJĘCIE', 5], ['PARAGONY', 3]]),
  q(39, 'Wymień warzywo.', [['MARCHEW', 28], ['ZIEMNIAK', 24], ['POMIDOR', 18], ['OGÓREK', 14], ['CEBULA', 10], ['KAPUSTA', 6]]),
  q(40, 'Co ma każdy w kuchni?', [['LODÓWKĘ', 30], ['PIEKARNIK', 24], ['CZAJNIK', 18], ['ZLEW', 14], ['PATELNIĘ', 8], ['NOŻE', 6]]),
];

module.exports = { FAMILIADA_SAMPLE_QUESTIONS };
