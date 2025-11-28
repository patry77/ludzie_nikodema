# 🎅 Aplikacja Mikołajki 2024 🎄

Aplikacja do losowania osób na Mikołajki zbudowana w Node.js i React.

## 🚀 Instalacja

1. Zainstaluj zależności:
```bash
npm run install-all
```

2. Uruchom aplikację:
```bash
npm run dev
```

Aplikacja będzie dostępna:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 📋 Funkcjonalności

- ✅ Dodawanie osób do losowania
- ✅ Losowanie przypisań (każdy dostaje kogoś innego)
- ✅ Unikalne linki dla każdej osoby
- ✅ Świąteczny design z animacjami
- ✅ Responsywny interfejs

## 🎨 Technologie

- **Backend**: Node.js + Express
- **Frontend**: React + Material UI + Tailwind CSS
- **Database**: JSON file

## 📝 Użycie

1. Dodaj osoby do losowania na stronie głównej (możesz dodać email dla automatycznej wysyłki linków)
2. Kliknij "Losuj osoby!" aby przeprowadzić losowanie
3. Każda osoba otrzyma unikalny link, który może otworzyć aby zobaczyć kogo wylosowała
4. Jeśli osoby mają podane emaile, linki zostaną automatycznie wysłane mailem
5. Linki można również kopiować przyciskiem "Kopiuj link"

## 📧 Konfiguracja wysyłania emaili

Aby włączyć automatyczne wysyłanie maili z linkami po losowaniu:

1. Utwórz plik `.env` w głównym katalogu (skopiuj z `env.example`)
2. Uzupełnij dane SMTP (host, port, użytkownik, hasło)
3. Ustaw `BASE_URL` na adres Twojej domeny

Szczegółowe instrukcje znajdziesz w pliku `SETUP_EMAIL.md`

