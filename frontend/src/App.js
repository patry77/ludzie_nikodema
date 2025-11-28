import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DrawPage from './components/DrawPage';
import PersonPage from './components/PersonPage';
import Navbar from './components/Navbar';
import Snowflakes from './components/Snowflakes';
import Background from './components/Background';

function App() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <Background />
      <Snowflakes />
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<DrawPage />} />
          <Route path="/person/:linkId" element={<PersonPage />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;

