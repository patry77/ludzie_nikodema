# Konfiguracja tła

Aby dodać swoje zdjęcie jako tło:

1. Umieść plik JPG w tym folderze (`frontend/public/`) jako `background.jpg`
2. Lub zmień nazwę w pliku `frontend/src/index.css` w linii z `url('/background.jpg')`

Zdjęcie będzie automatycznie zblurowane efektem Gaussa (10px blur).

Możesz dostosować intensywność blur w pliku `frontend/src/index.css` zmieniając wartość `blur(10px)` na inną (np. `blur(5px)` dla mniejszego blur lub `blur(15px)` dla większego).

