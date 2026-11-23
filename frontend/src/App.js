import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DrawPage from './components/DrawPage';
import PersonPage from './components/PersonPage';
import AdminPage from './components/AdminPage';
import MenuPage from './components/MenuPage';
import TVMenuPage from './components/TVMenuPage';
import WikiPage from './components/WikiPage';
import WakacjePage from './components/WakacjePage';
import EmbedTestPage from './components/EmbedTestPage';
import Navbar from './components/Navbar';
import Snowflakes from './components/Snowflakes';
import Background from './components/Background';
import PageTitle from './components/PageTitle';

function App() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Background />
      <Snowflakes />
      <Router>
        <PageTitle />
        <Navbar />
        <Routes>
          <Route path="/" element={<DrawPage />} />
          <Route path="/person/:linkId" element={<PersonPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/tvmenu" element={<TVMenuPage />} />
          <Route path="/wiki" element={<WikiPage />} />
          <Route path="/wakacje" element={<WakacjePage />} />
          <Route path="/embedtest" element={<EmbedTestPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
