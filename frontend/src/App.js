import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { SiteThemeProvider } from './ThemeContext';
import DrawPage from './components/DrawPage';
import PersonPage from './components/PersonPage';
import AdminPage from './components/AdminPage';
import MenuPage from './components/MenuPage';
import TVMenuPage from './components/TVMenuPage';
import WikiPage from './components/WikiPage';
import WakacjePage from './components/WakacjePage';
import EmbedTestPage from './components/EmbedTestPage';
import MikolajkiPage from './components/MikolajkiPage';
import ArchivePage from './components/ArchivePage';
import Navbar from './components/Navbar';
import Snowflakes from './components/Snowflakes';
import Background from './components/Background';
import PageTitle from './components/PageTitle';

// Strony ze starym, jasnym wygladem dostaja delikatniejsze naroza (patrz index.css)
const LEGACY_PATHS = ['/admin', '/wakacje', '/wiki', '/embedtest'];

const Shell = () => {
  const { pathname } = useLocation();
  const isTv = pathname === '/tvmenu';
  const isLegacy = LEGACY_PATHS.includes(pathname);

  return (
    <>
      <PageTitle />
      {!isTv && <Navbar />}
      <main className={isLegacy ? 'legacy-surface' : ''}>
        <Routes>
          <Route path="/" element={<DrawPage />} />
          <Route path="/person/:linkId" element={<PersonPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/tvmenu" element={<TVMenuPage />} />
          <Route path="/mikolajki" element={<MikolajkiPage />} />
          <Route path="/archiwum" element={<ArchivePage />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/wakacje" element={<WakacjePage />} />
          <Route path="/embedtest" element={<EmbedTestPage />} />
        </Routes>
      </main>
    </>
  );
};

function App() {
  return (
    <SiteThemeProvider>
      <CssBaseline />
      <div className="min-h-screen relative overflow-hidden">
        <Background />
        <Snowflakes />
        <Router>
          <Shell />
        </Router>
      </div>
    </SiteThemeProvider>
  );
}

export default App;
