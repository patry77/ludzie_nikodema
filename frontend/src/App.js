import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';
import DrawPage from './components/DrawPage';
import PersonPage from './components/PersonPage';
import AdminPage from './components/AdminPage';
import MenuPage from './components/MenuPage';
import TVMenuPage from './components/TVMenuPage';
import WikiPage from './components/WikiPage';
import WakacjePage from './components/WakacjePage';
import EmbedTestPage from './components/EmbedTestPage';
import MikolajkiPage from './components/MikolajkiPage';
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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="min-h-screen relative overflow-hidden">
        <Background />
        <Snowflakes />
        <Router>
          <Shell />
        </Router>
      </div>
    </ThemeProvider>
  );
}

export default App;
