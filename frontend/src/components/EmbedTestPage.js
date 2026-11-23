import React, { useEffect, useState } from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';

const EmbedTestPage = () => {
  const [debugInfo, setDebugInfo] = useState({
    scriptLoaded: false,
    airbnbAvailable: false,
    embedsAvailable: false,
    error: null,
    logs: []
  });

  useEffect(() => {
    console.log('EmbedTestPage mounted');
    
    const addLog = (message) => {
      console.log(message);
      setDebugInfo(prev => ({
        ...prev,
        logs: [...prev.logs.slice(-9), message] // Keep last 10 logs
      }));
    };

    const checkAirbnb = () => {
      const hasAirbnb = typeof window.Airbnb !== 'undefined';
      const hasEmbeds = hasAirbnb && typeof window.Airbnb.Embeds !== 'undefined';
      const scriptElement = document.querySelector('script[src*="airbnb_jssdk"]');
      
      addLog(`Checking: script=${!!scriptElement}, Airbnb=${hasAirbnb}, Embeds=${hasEmbeds}`);
      
      setDebugInfo(prev => ({
        ...prev,
        scriptLoaded: !!scriptElement,
        airbnbAvailable: hasAirbnb,
        embedsAvailable: hasEmbeds
      }));

      if (hasEmbeds) {
        try {
          window.Airbnb.Embeds.init();
          addLog('Airbnb embeds initialized successfully');
        } catch (error) {
          addLog(`Error initializing: ${error.message}`);
          setDebugInfo(prev => ({ ...prev, error: error.message }));
        }
      }
    };

    // Remove any existing script first
    const existingScript = document.querySelector('script[src*="airbnb_jssdk"]');
    if (existingScript) {
      addLog('Removing existing script');
      existingScript.remove();
    }

    // Load script manually
    addLog('Creating new script element');
    const script = document.createElement('script');
    script.src = 'https://www.airbnb.com/embeddable/airbnb_jssdk';
    script.async = false; // Load synchronously
    
    script.onload = () => {
      addLog('Script onload fired');
      setDebugInfo(prev => ({ ...prev, scriptLoaded: true }));
      
      // Wait a bit for Airbnb object to be available
      setTimeout(() => {
        addLog('Checking for Airbnb object after delay');
        checkAirbnb();
        
        // Keep checking periodically
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          checkAirbnb();
          if (window.Airbnb && window.Airbnb.Embeds) {
            addLog('Airbnb object found!');
            clearInterval(checkInterval);
          } else if (attempts > 20) {
            addLog('Giving up after 20 attempts');
            clearInterval(checkInterval);
          }
        }, 500);
      }, 1000);
    };
    
    script.onerror = (error) => {
      addLog(`Script load error: ${error}`);
      setDebugInfo(prev => ({ 
        ...prev, 
        error: 'Failed to load script. Check Network tab for CORS/404 errors.' 
      }));
    };
    
    addLog('Appending script to head');
    document.head.appendChild(script);
    
    // Also check periodically in case script loads but object doesn't appear
    let attempts = 0;
    const periodicCheck = setInterval(() => {
      attempts++;
      checkAirbnb();
      if (window.Airbnb && window.Airbnb.Embeds) {
        addLog('Airbnb found via periodic check');
        clearInterval(periodicCheck);
      } else if (attempts > 30) {
        addLog('Periodic check timeout');
        clearInterval(periodicCheck);
      }
    }, 1000);

    // Initial check
    setTimeout(checkAirbnb, 100);

    return () => {
      clearInterval(periodicCheck);
    };
  }, []);

  // Embed code without script tag (script is loaded separately)
  const embedCode = `<div class="airbnb-embed-frame" data-id="18145654" data-view="home" data-hide-price="true" style="width: 450px; height: 300px; margin: auto;"><a href="https://www.airbnb.pl/rooms/18145654?check_in=2026-08-01&amp;check_out=2026-08-08&amp;guests=1&amp;adults=12&amp;s=66&amp;source=embed_widget" rel="nofollow">Zobacz w Airbnb</a><a href="https://www.airbnb.pl/rooms/18145654?check_in=2026-08-01&amp;check_out=2026-08-08&amp;guests=1&amp;adults=12&amp;s=66&amp;source=embed_widget" rel="nofollow">Dom · Xagħra · ★4,84 · 6 sypialni · 9&nbsp;łóżek · 7 łazienek</a></div>`;

  return (
    <Container maxWidth="lg" className="py-8">
      <Paper elevation={5} className="p-8">
        <Typography variant="h4" className="mb-4 text-center">
          Test Embedu Airbnb
        </Typography>
        <Typography variant="body1" className="mb-6 text-center text-gray-600">
          Poniżej znajduje się embed Airbnb bez żadnych dodatkowych manipulacji React
        </Typography>
        
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
            padding: 4,
            backgroundColor: '#f5f5f5',
          }}
          dangerouslySetInnerHTML={{
            __html: embedCode
          }}
        />

        <Box className="mt-8 p-4 bg-gray-100 rounded">
          <Typography variant="h6" className="mb-2">
            Informacje debugowania:
          </Typography>
          <Typography variant="body2" className="font-mono text-sm">
            Airbnb script loaded: {debugInfo.scriptLoaded ? 'Tak' : 'Nie'}
          </Typography>
          <Typography variant="body2" className="font-mono text-sm">
            window.Airbnb: {debugInfo.airbnbAvailable ? 'Tak' : 'Nie'}
          </Typography>
          <Typography variant="body2" className="font-mono text-sm">
            window.Airbnb.Embeds: {debugInfo.embedsAvailable ? 'Tak' : 'Nie'}
          </Typography>
          {debugInfo.error && (
            <Typography variant="body2" className="font-mono text-sm text-red-600 mt-2">
              Błąd: {debugInfo.error}
            </Typography>
          )}
          <Box className="mt-4">
            <Typography variant="subtitle2" className="mb-2 font-bold">
              Logi:
            </Typography>
            {debugInfo.logs.map((log, idx) => (
              <Typography key={idx} variant="body2" className="font-mono text-xs text-gray-600">
                {log}
              </Typography>
            ))}
          </Box>
          <Typography variant="body2" className="text-sm mt-4 text-gray-600">
            Sprawdź konsolę przeglądarki (F12) i zakładkę Network dla szczegółowych logów.
            <br />
            Sprawdź czy skrypt airbnb_jssdk ładuje się poprawnie (status 200).
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default EmbedTestPage;
