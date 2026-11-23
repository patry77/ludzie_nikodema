import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { SiteThemeProvider } from './ThemeContext';

import PersonPage from './components/PersonPage';
import AdminPage from './components/AdminPage';
import MenuPage from './components/MenuPage';
import TVMenuPage from './components/TVMenuPage';
import WikiPage from './components/WikiPage';
import WakacjePage from './components/WakacjePage';
import EmbedTestPage from './components/EmbedTestPage';
import MikolajkiPage from './components/MikolajkiPage';
import ArchivePage from './components/ArchivePage';
import TeleturniejPage from './components/TeleturniejPage';
import { QuizHubPage, HostPage, TvPage, PlayerPage, JoinCodePage, TestConsolePage } from './quiz/QuizPages';
import Navbar from './components/Navbar';
import Snowflakes from './components/Snowflakes';
import Background from './components/Background';
import PageTitle from './components/PageTitle';

// Strony ze starym, jasnym wygladem dostaja delikatniejsze naroza (patrz index.css)
const LEGACY_PATHS = ['/admin', '/wakacje', '/wiki', '/embedtest'];

const Shell = () => {
  const { pathname } = useLocation();
  // Widok TV i telefon uczestnika działają jak osobne aplikacje - bez górnej nawigacji
  const segments = pathname.split('/').filter(Boolean);
  const isQuizScreen = segments[0] === 'teleturniej' && segments[1] === 'gra' && (segments.length === 3 || segments[3] === 'tv');
  const isTv = pathname === '/tvmenu' || isQuizScreen;
  const isLegacy = LEGACY_PATHS.includes(pathname);

  return (
    <>
      <PageTitle />
      {!isTv && <Navbar />}
      <main className={isLegacy ? 'legacy-surface' : ''}>
        <Routes>
          <Route path="/" element={<MenuPage />} />
          <Route path="/person/:linkId" element={<PersonPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/menu" element={<Navigate to="/" replace />} />
          <Route path="/tvmenu" element={<TVMenuPage />} />
          <Route path="/mikolajki" element={<MikolajkiPage />} />
          <Route path="/teleturniej" element={<TeleturniejPage />} />
          <Route path="/teleturniej/gry" element={<QuizHubPage />} />
          <Route path="/teleturniej/dolacz" element={<JoinCodePage />} />
          <Route path="/teleturniej/gra/:code" element={<PlayerPage />} />
          <Route path="/teleturniej/gra/:code/tv" element={<TvPage />} />
          <Route path="/teleturniej/gra/:code/prowadzacy" element={<HostPage />} />
          <Route path="/teleturniej/gra/:code/test" element={<TestConsolePage />} />
          <Route path="/archiwum" element={<ArchivePage />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/wakacje" element={<WakacjePage />} />
          <Route path="/embedtest" element={<EmbedTestPage />} />
        </Routes>
      </main>
    </>
  );
};

// Router jest nad dostawca motywu, bo motyw zalezy od aktualnej trasy (/teleturniej ma wlasny)
function App() {
  return (
    <Router>
      <SiteThemeProvider>
        <CssBaseline />
        <div className="min-h-screen relative overflow-hidden">
          <Background />
          <Snowflakes />
          <Shell />
        </div>
      </SiteThemeProvider>
    </Router>
  );
}

export default App;
