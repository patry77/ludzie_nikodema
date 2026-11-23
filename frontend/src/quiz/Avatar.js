import React, { useRef, useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { API } from './quizApi';

// Zdjecie z aparatu/galerii -> kwadratowy JPEG 256x256 (lekki, ~20-40 KB). Kadrujemy ze srodka, z lekkim przesunieciem ku gorze (twarze).
export async function fileToSquareJpeg(file, size = 256) {
  if (!file || !String(file.type).startsWith('image/')) throw new Error('Wybierz plik ze zdjęciem.');
  if (file.size > 30 * 1024 * 1024) throw new Error('Zdjęcie jest zbyt duże.');

  let source;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    source = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Nie udało się wczytać zdjęcia.'));
      };
      img.src = url;
    });
  }

  const w = source.width || source.naturalWidth;
  const h = source.height || source.naturalHeight;
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) * 0.3;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(source, sx, sy, side, side, 0, 0, size, size);
  if (source.close) source.close();

  let quality = 0.85;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 200000 && quality > 0.4) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}

const photoUrl = (code, player) => `${API}/games/${code}/photo/${player.id}?v=${player.photoV}`;

// Awatar gracza: zdjecie (jesli jest) z malym numerem stanowiska albo sam numer na zlotym kole.
export const Avatar = ({ code, player, size = 40, src }) => {
  const hasPhoto = !!src || (player && player.hasPhoto && code);
  const url = src || (hasPhoto ? photoUrl(code, player) : null);
  const badge = typeof size === 'number' ? Math.max(16, Math.round(size * 0.38)) : 'clamp(14px, 36%, 40px)';
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {url ? (
        <>
          <Box
            component="img"
            src={url}
            alt={player ? `Zdjęcie: ${player.name}` : 'Zdjęcie'}
            sx={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold)', boxShadow: '0 0 14px rgba(var(--accent-rgb),0.5)', display: 'block' }}
          />
          {player && (
            <Box
              component="span"
              sx={{
                position: 'absolute',
                right: -4,
                bottom: -4,
                width: badge,
                height: badge,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: typeof size === 'number' ? Math.max(10, Math.round(size * 0.24)) : 'clamp(0.6rem, 0.9vw, 1rem)',
                color: '#1a1205',
                background: 'linear-gradient(180deg, var(--gold-light), var(--gold-deep))',
                border: '2px solid #050826',
              }}
            >
              {player.seat}
            </Box>
          )}
        </>
      ) : (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: typeof size === 'number' ? Math.round(size * 0.45) : 'clamp(0.9rem, 1.3vw, 1.6rem)',
            color: '#1a1205',
            background: player && player.eliminated ? '#888' : 'linear-gradient(180deg, var(--gold-light), var(--gold-deep))',
          }}
        >
          {player ? player.seat : '?'}
        </Box>
      )}
    </Box>
  );
};

// Wybor zdjecia: aparat (selfie) albo galeria. `onPick(dataUrl)` dostaje gotowy, przeskalowany JPEG.
export const PhotoPicker = ({ onPick, onRemove, hasPhoto, busy, compact = false }) => {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const handle = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // pozwala wybrac to samo zdjecie ponownie
    if (!file) return;
    setError('');
    setWorking(true);
    try {
      const dataUrl = await fileToSquareJpeg(file);
      await onPick(dataUrl);
    } catch (err) {
      setError(err.message || 'Nie udało się przetworzyć zdjęcia.');
    } finally {
      setWorking(false);
    }
  };

  const disabled = busy || working;
  const btnSx = { color: 'var(--ink)', borderColor: 'rgba(var(--accent-rgb),0.5)', background: 'rgba(255,255,255,0.06)', borderRadius: '14px' };

  return (
    <Box>
      <input ref={cameraRef} type="file" accept="image/*" capture="user" onChange={handle} hidden aria-label="Zrób zdjęcie aparatem" />
      <input ref={galleryRef} type="file" accept="image/*" onChange={handle} hidden aria-label="Wybierz zdjęcie z galerii" />
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button variant="outlined" size={compact ? 'small' : 'medium'} onClick={() => cameraRef.current && cameraRef.current.click()} disabled={disabled} sx={btnSx}>
          📷 Aparat
        </Button>
        <Button variant="outlined" size={compact ? 'small' : 'medium'} onClick={() => galleryRef.current && galleryRef.current.click()} disabled={disabled} sx={btnSx}>
          🖼️ Galeria
        </Button>
        {hasPhoto && onRemove && (
          <Button size={compact ? 'small' : 'medium'} onClick={onRemove} disabled={disabled} sx={{ color: '#ff9b9b' }}>
            Usuń
          </Button>
        )}
      </Box>
      {working && <Typography variant="body2" sx={{ textAlign: 'center', color: 'var(--ink-dim)', mt: 1 }}>Przetwarzanie zdjęcia...</Typography>}
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  );
};
