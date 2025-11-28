# Konfiguracja wysyłania emaili

## 1. Instalacja zależności

```bash
npm install
```

## 2. Konfiguracja zmiennych środowiskowych

Utwórz plik `.env` w głównym katalogu projektu (obok `package.json`) na podstawie pliku `env.example`:

```bash
cp env.example .env
```

Następnie edytuj plik `.env` i uzupełnij dane SMTP:

```env
# Server Configuration
PORT=5000
BASE_URL=https://twoja-domena.pl

# SMTP Configuration
SMTP_HOST=smtp.twoja-domena.pl
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@twoja-domena.pl
SMTP_PASS=twoje-haslo
SMTP_FROM=noreply@twoja-domena.pl
```

## 3. Opcje konfiguracji SMTP

**WAŻNE:** Jeśli używasz własnego VPS z Postfix, musisz skonfigurować rekordy DNS! 
Zobacz plik `DNS_SETUP.md` dla szczegółowych instrukcji.

### Gmail (dla testów)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=twoj-email@gmail.com
SMTP_PASS=twoje-haslo-aplikacji  # Hasło aplikacji, nie zwykłe hasło!
SMTP_FROM=twoj-email@gmail.com
```

**Uwaga:** Dla Gmail musisz użyć "hasła aplikacji", nie zwykłego hasła. Możesz je wygenerować w ustawieniach konta Google.

### Własny serwer SMTP (VPS)
Jeśli masz własną domenę i VPS, możesz skonfigurować własny serwer SMTP.

#### Opcja A: Postfix (prosty serwer SMTP)

**WAŻNE:** Samo zainstalowanie Postfix NIE wystarczy! Musisz:
1. Skonfigurować rekordy DNS w domenie (SPF, DKIM, DMARC)
2. Skonfigurować Postfix
3. Bez odpowiednich rekordów DNS maile będą trafiać do SPAM lub w ogóle nie będą działać

##### Krok 1: Instalacja Postfix
```bash
# Instalacja Postfix
sudo apt-get update
sudo apt-get install postfix mailutils

# Podczas instalacji wybierz "Internet Site"
# Podaj nazwę domeny (np. twoja-domena.pl)
```

##### Krok 2: Konfiguracja DNS w domenie

W panelu DNS Twojej domeny musisz dodać następujące rekordy:

**1. Rekord A (jeśli jeszcze nie masz):**
```
A    @    IP_TWOJEGO_VPS
A    www  IP_TWOJEGO_VPS
```

**2. Rekord MX (opcjonalny, tylko jeśli chcesz ODBIERAĆ maile):**
```
MX   @    twoja-domena.pl    10
```

**3. Rekord SPF (WYMAGANY do wysyłania maili):**
```
TXT  @    "v=spf1 mx ip4:IP_TWOJEGO_VPS ~all"
```
Lub jeśli używasz tylko VPS do wysyłania:
```
TXT  @    "v=spf1 ip4:IP_TWOJEGO_VPS ~all"
```

**4. Rekord DKIM (ZALECANY - zwiększa wiarygodność):**

Najpierw wygeneruj klucz DKIM:
```bash
sudo apt-get install opendkim opendkim-tools
sudo mkdir -p /etc/opendkim/keys/twoja-domena.pl
sudo opendkim-genkey -D /etc/opendkim/keys/twoja-domena.pl/ -d twoja-domena.pl -s default
sudo chown -R opendkim:opendkim /etc/opendkim/keys/twoja-domena.pl
```

Pobierz klucz publiczny:
```bash
sudo cat /etc/opendkim/keys/twoja-domena.pl/default.txt
```

Dodaj rekord TXT w DNS:
```
TXT  default._domainkey    "v=DKIM1; k=rsa; p=KLUCZ_PUBLICZNY_Z_POWYZSZEGO_POLECENIA"
```

**5. Rekord DMARC (ZALECANY):**
```
TXT  _dmarc    "v=DMARC1; p=none; rua=mailto:admin@twoja-domena.pl"
```

##### Krok 3: Konfiguracja Postfix

Edytuj główny plik konfiguracyjny:
```bash
sudo nano /etc/postfix/main.cf
```

Upewnij się że masz:
```conf
myhostname = twoja-domena.pl
mydomain = twoja-domena.pl
myorigin = $mydomain
inet_interfaces = all
inet_protocols = ipv4
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain
relayhost =
```

Dla wysyłania maili przez SMTP (port 587):
```conf
smtpd_tls_security_level = may
smtp_tls_security_level = may
smtpd_tls_auth_only = yes
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = $myhostname
smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination
```

Zrestartuj Postfix:
```bash
sudo systemctl restart postfix
sudo systemctl status postfix
```

##### Krok 4: Testowanie

Przetestuj wysyłanie maila:
```bash
echo "Test mail" | mail -s "Test" twoj-email@gmail.com
```

Sprawdź logi:
```bash
sudo tail -f /var/log/mail.log
```

**Uwaga:** Wiele dostawców VPS (np. DigitalOcean, AWS) blokuje port 25 (SMTP) domyślnie. Możesz:
- Poprosić o odblokowanie portu 25 u dostawcy
- Użyć portu 587 (submission) - wymaga autoryzacji SASL
- Użyć zewnętrznego serwisu SMTP (SendGrid, Mailgun) - **ZALECANE dla początkujących**

#### Opcja B: SendGrid, Mailgun, lub inny serwis
Wiele serwisów oferuje API SMTP. Sprawdź dokumentację swojego dostawcy.

## 4. Konfiguracja na VPS

### Krok 1: Połącz się z VPS
```bash
ssh uzytkownik@twoj-vps-ip
```

### Krok 2: Zainstaluj Node.js (jeśli nie masz)
```bash
# Dla Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Sprawdź wersję
node --version
npm --version
```

### Krok 3: Skopiuj projekt na VPS
```bash
# Na swoim komputerze
scp -r . uzytkownik@twoj-vps-ip:/path/to/app

# Lub użyj git
git clone twoj-repo
```

### Krok 4: Zainstaluj zależności na VPS
```bash
cd /path/to/app
npm install
cd frontend
npm install
cd ..
```

### Krok 5: Zbuduj frontend
```bash
cd frontend
npm run build
cd ..
```

### Krok 6: Utwórz plik .env na VPS
```bash
nano .env
# Wklej konfigurację SMTP
```

### Krok 7: Uruchom aplikację

#### Opcja A: PM2 (zalecane)
```bash
# Zainstaluj PM2
sudo npm install -g pm2

# Uruchom aplikację
pm2 start backend/server.js --name mikolajki

# Zapisz konfigurację
pm2 save
pm2 startup
```

#### Opcja B: systemd
Utwórz plik `/etc/systemd/system/mikolajki.service`:
```ini
[Unit]
Description=Mikolajki App
After=network.target

[Service]
Type=simple
User=twoj-uzytkownik
WorkingDirectory=/path/to/app
Environment=NODE_ENV=production
EnvironmentFile=/path/to/app/.env
ExecStart=/usr/bin/node backend/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Następnie:
```bash
sudo systemctl enable mikolajki
sudo systemctl start mikolajki
sudo systemctl status mikolajki
```

### Krok 8: Konfiguracja Nginx (opcjonalnie, dla HTTPS)

```bash
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/mikolajki
```

Wklej:
```nginx
server {
    listen 80;
    server_name twoja-domena.pl www.twoja-domena.pl;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktywuj:
```bash
sudo ln -s /etc/nginx/sites-available/mikolajki /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Krok 9: SSL/HTTPS (Let's Encrypt)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d twoja-domena.pl -d www.twoja-domena.pl
```

## 5. Testowanie

1. Dodaj osoby z adresami email w aplikacji
2. Kliknij "Losuj osoby!"
3. Sprawdź czy maile zostały wysłane
4. Sprawdź logi aplikacji:
```bash
pm2 logs mikolajki
# lub
sudo journalctl -u mikolajki -f
```

## 6. Rozwiązywanie problemów

### Maile nie są wysyłane
- Sprawdź logi aplikacji
- Sprawdź czy zmienne środowiskowe są poprawnie ustawione
- Sprawdź czy SMTP_HOST, SMTP_USER, SMTP_PASS są poprawne
- Sprawdź czy port SMTP nie jest zablokowany przez firewall

### Błędy połączenia SMTP
- Sprawdź czy port SMTP (587/465) jest otwarty w firewall
- Dla Gmail: upewnij się że używasz hasła aplikacji
- Sprawdź czy SMTP_SECURE jest poprawnie ustawione (true dla 465, false dla 587)

### Firewall
```bash
# Sprawdź czy port jest otwarty
sudo ufw status
# Otwórz port jeśli trzeba
sudo ufw allow 587/tcp
```

