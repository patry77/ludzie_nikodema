import React, { useEffect, useState } from 'react';
import { Box, Button, IconButton, Typography } from '@mui/material';

const KEY = 'installPromptDismissed';

const isStandalone = () => {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch (e) {
    return false;
  }
};

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent || '');

// Zaproszenie do zainstalowania strony jako aplikacji (Android/Chrome: przycisk, iPhone: krotka instrukcja)
const InstallPrompt = () => {
  const [deferred, setDeferred] = useState(null);
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch (e) {
      return false;
    }
  });
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, '1');
    } catch (e) {
      /* ignorujemy */
    }
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch (e) {
      /* ignorujemy */
    }
    setDeferred(null);
    dismiss();
  };

  const ios = isIos();
  if (installed || hidden || (!deferred && !ios)) return null;

  return (
    <Box
      role="dialog"
      aria-label="Instalacja aplikacji"
      sx={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 1300,
        maxWidth: 520,
        mx: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: '16px',
        background: 'rgba(7,20,15,0.96)',
        border: '1px solid rgba(244,201,93,0.55)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
        color: '#fff6e5',
      }}
    >
      <Typography aria-hidden="true" sx={{ fontSize: '1.8rem', lineHeight: 1 }}>📲</Typography>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, lineHeight: 1.25 }}>Zainstaluj aplikację</Typography>
        <Typography sx={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.35 }}>
          {deferred ? 'Szybki dostęp z ekranu telefonu, bez paska przeglądarki.' : 'Kliknij „Udostępnij” (kwadrat ze strzałką), potem „Dodaj do ekranu początkowego”.'}
        </Typography>
      </Box>
      {deferred && (
        <Button onClick={install} variant="contained" size="small" sx={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
          Zainstaluj
        </Button>
      )}
      <IconButton onClick={dismiss} aria-label="Zamknij" size="small" sx={{ color: '#fff6e5' }}>
        ✕
      </IconButton>
    </Box>
  );
};

export default InstallPrompt;
