import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, FormControlLabel, Switch, TextField, Typography } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { THEMES, THEME_IDS } from '../themes';
import { useSiteTheme } from '../ThemeContext';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// ISO -> wartosc dla <input type="datetime-local"> w czasie lokalnym przegladarki
const isoToLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Karta w panelu admina: wybor motywu strony + ustawienia odliczania.
const ThemeSettingsCard = () => {
  const { settings, applySettings } = useSiteTheme();
  const [theme, setTheme] = useState(settings.theme);
  const [showCountdown, setShowCountdown] = useState(settings.showCountdown !== false);
  const [date, setDate] = useState(isoToLocalInput(settings.countdownDate));
  const [label, setLabel] = useState(settings.countdownLabel || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { severity, text }

  // Gdy ustawienia zaladuja sie z serwera, odswiez formularz
  useEffect(() => {
    setTheme(settings.theme);
    setShowCountdown(settings.showCountdown !== false);
    setDate(isoToLocalInput(settings.countdownDate));
    setLabel(settings.countdownLabel || '');
  }, [settings]);

  const preset = THEMES[theme];

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': sessionStorage.getItem('adminPass') || '',
        },
        body: JSON.stringify({
          theme,
          showCountdown,
          countdownDate: date ? new Date(date).toISOString() : '',
          countdownLabel: label,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Nie udało się zapisać motywu');
      applySettings(data);
      setMessage({ severity: 'success', text: `Zapisano. Aktywny motyw: ${THEMES[data.theme].label} ${THEMES[data.theme].emoji}` });
    } catch (e) {
      setMessage({ severity: 'error', text: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-6 bg-white shadow-lg border-2">
      <CardContent>
        <Typography variant="h6" className="mb-1 font-semibold text-blue-700">
          🎨 Motyw strony
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
          Zmienia kolory, tło, logo, teksty i animacje całej strony. Karta „Mikołajki” jest widoczna tylko w motywie świątecznym.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.5, mb: 3 }}>
          {THEME_IDS.map((id) => {
            const t = THEMES[id];
            const active = theme === id;
            return (
              <Box
                key={id}
                component="button"
                type="button"
                onClick={() => setTheme(id)}
                aria-pressed={active}
                sx={{
                  cursor: 'pointer',
                  textAlign: 'left',
                  font: 'inherit',
                  p: 1.25,
                  borderRadius: '16px',
                  border: active ? `3px solid ${t.colors.primary}` : '3px solid transparent',
                  outline: '1px solid rgba(0,0,0,0.12)',
                  background: '#fff',
                  position: 'relative',
                  transition: 'transform .15s ease, box-shadow .15s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(0,0,0,0.15)' },
                }}
              >
                <Box
                  sx={{
                    height: 56,
                    borderRadius: '10px',
                    mb: 1,
                    background: `radial-gradient(120px 60px at 15% 0%, ${t.colors.glow1}, transparent 70%), radial-gradient(120px 60px at 100% 100%, ${t.colors.glow3}, transparent 70%), linear-gradient(180deg, ${t.colors.night}, ${t.colors.night2})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                  }}
                >
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', background: t.colors.primary }} />
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', background: t.colors.gold }} />
                  <Box sx={{ width: 14, height: 14, borderRadius: '50%', background: t.colors.secondary }} />
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {t.emoji} {t.label}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>{t.description}</Typography>
                {active && (
                  <CheckIcon
                    sx={{ position: 'absolute', top: 6, right: 6, color: '#fff', background: t.colors.primary, borderRadius: '50%', fontSize: 20, p: '2px' }}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          ⏳ Odliczanie
        </Typography>
        <FormControlLabel
          control={<Switch checked={showCountdown} onChange={(e) => setShowCountdown(e.target.checked)} />}
          label="Pokaż odliczanie na stronie menu"
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mt: 1 }}>
          <TextField
            label="Data i godzina"
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={!showCountdown}
            InputLabelProps={{ shrink: true }}
            helperText={
              preset.countdownDate
                ? 'Puste = domyślna data motywu'
                : 'Ten motyw nie ma domyślnej daty – bez niej odliczanie się nie pokaże'
            }
          />
          <TextField
            label="Podpis nad odliczaniem"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={!showCountdown}
            inputProps={{ maxLength: 80 }}
            placeholder={preset.countdownLabel}
            helperText="Puste = domyślny podpis motywu"
          />
        </Box>

        {message && (
          <Alert severity={message.severity} sx={{ mt: 2 }}>
            {message.text}
          </Alert>
        )}

        <Button variant="contained" onClick={save} disabled={saving} sx={{ mt: 2.5 }}>
          {saving ? 'Zapisywanie...' : 'Zapisz motyw'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ThemeSettingsCard;
