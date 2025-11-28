# Konfiguracja DNS dla wysyłania maili

## Krótka odpowiedź

**NIE, samo zainstalowanie Postfix nie wystarczy!** Musisz skonfigurować rekordy DNS w domenie.

## Co musisz dodać w DNS oprócz rekordu A?

### Minimalna konfiguracja (działa, ale maile mogą trafiać do SPAM):

1. **Rekord A** (już masz):
   ```
   A    @    IP_VPS
   ```

2. **Rekord SPF** (WYMAGANY):
   ```
   TXT  @    "v=spf1 ip4:IP_VPS ~all"
   ```
   Zamień `IP_VPS` na rzeczywisty IP Twojego VPS.

### Zalecana konfiguracja (maile nie trafiają do SPAM):

1. **Rekord A** ✅
2. **Rekord SPF** ✅ (jak wyżej)
3. **Rekord DKIM** (zwiększa wiarygodność)
4. **Rekord DMARC** (monitorowanie i raportowanie)

## Szczegółowa konfiguracja DNS

### 1. Rekord SPF

W panelu DNS dodaj rekord TXT:
- **Nazwa:** `@` (lub puste, zależy od panelu)
- **Typ:** `TXT`
- **Wartość:** `v=spf1 ip4:IP_TWOJEGO_VPS ~all`

Przykład dla IP `123.45.67.89`:
```
v=spf1 ip4:123.45.67.89 ~all
```

### 2. Rekord DKIM (opcjonalny, ale zalecany)

Najpierw wygeneruj klucz na VPS:
```bash
sudo apt-get install opendkim opendkim-tools
sudo mkdir -p /etc/opendkim/keys/twoja-domena.pl
sudo opendkim-genkey -D /etc/opendkim/keys/twoja-domena.pl/ -d twoja-domena.pl -s default
sudo cat /etc/opendkim/keys/twoja-domena.pl/default.txt
```

Skopiuj wartość z `default.txt` i dodaj jako rekord TXT:
- **Nazwa:** `default._domainkey`
- **Typ:** `TXT`
- **Wartość:** (z pliku default.txt, zaczyna się od `v=DKIM1;...`)

### 3. Rekord DMARC (opcjonalny, ale zalecany)

- **Nazwa:** `_dmarc`
- **Typ:** `TXT`
- **Wartość:** `v=DMARC1; p=none; rua=mailto:admin@twoja-domena.pl`

## Przykładowa konfiguracja w różnych panelach DNS

### Cloudflare
1. Wejdź w DNS → Dodaj rekord
2. Wybierz typ `TXT`
3. Dla SPF: Nazwa: `@`, Wartość: `v=spf1 ip4:IP ~all`
4. Dla DKIM: Nazwa: `default._domainkey`, Wartość: (z pliku)
5. Dla DMARC: Nazwa: `_dmarc`, Wartość: `v=DMARC1; p=none; rua=mailto:admin@domena.pl`

### Namecheap
1. Advanced DNS → Add New Record
2. Wybierz TXT Record
3. Host: `@` (dla SPF), `default._domainkey` (dla DKIM), `_dmarc` (dla DMARC)
4. Value: odpowiednia wartość

### OVH
1. DNS → Dodaj wpis
2. Typ: TXT
3. Poddomena: `@` (dla SPF), `default._domainkey` (dla DKIM), `_dmarc` (dla DMARC)
4. Wartość: odpowiednia wartość

## Weryfikacja rekordów DNS

Po dodaniu rekordów, sprawdź czy działają (może zająć kilka minut do propagacji):

```bash
# Sprawdź SPF
dig TXT twoja-domena.pl | grep spf

# Sprawdź DKIM
dig TXT default._domainkey.twoja-domena.pl

# Sprawdź DMARC
dig TXT _dmarc.twoja-domena.pl
```

Lub użyj narzędzi online:
- https://mxtoolbox.com/spf.aspx
- https://mxtoolbox.com/dkim.aspx
- https://mxtoolbox.com/dmarc.aspx

## Alternatywa: Użyj zewnętrznego serwisu SMTP

Jeśli konfiguracja DNS wydaje się skomplikowana, możesz użyć zewnętrznego serwisu:

### SendGrid (darmowy do 100 maili/dzień)
1. Zarejestruj się na sendgrid.com
2. Zweryfikuj domenę (dodasz rekordy DNS które SendGrid poda)
3. Użyj w `.env`:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=twoj-api-key
```

### Mailgun (darmowy do 5000 maili/miesiąc)
1. Zarejestruj się na mailgun.com
2. Zweryfikuj domenę
3. Użyj w `.env`:
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@twoja-domena.pl
SMTP_PASS=haslo-z-mailgun
```

**Zalety zewnętrznych serwisów:**
- ✅ Nie musisz konfigurować Postfix
- ✅ Automatyczna konfiguracja DNS (dostaniesz instrukcje)
- ✅ Lepsza dostarczalność (mniej SPAM)
- ✅ Monitoring i statystyki
- ✅ Darmowe limity dla małych projektów

