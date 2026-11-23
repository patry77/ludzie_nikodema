import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteTheme } from '../ThemeContext';

const PageTitle = () => {
  const location = useLocation();
  const { preset } = useSiteTheme();

  useEffect(() => {
    const p = location.pathname;
    let title = preset.siteTitle;

    if (p === '/' || p === '/menu') {
      title = preset.menuPageTitle;
    } else if (p.startsWith('/person/')) {
      title = `Twoje losowanie - ${preset.adminEyebrow} ${preset.emoji}`;
    } else if (p === '/mikolajki') {
      title = 'Mikołajki 2026 - dołącz do losowania 🎁';
    } else if (p === '/admin') {
      title = `Panel Administracyjny - ${preset.adminEyebrow} 🔐`;
    } else if (p === '/tvmenu') {
      title = `Menu TV - ${preset.adminEyebrow} 📺`;
    } else if (p === '/archiwum') {
      title = 'Archiwum menu - Ludzie Nikodema 📦';
    } else if (p === '/wiki') {
      title = 'Wiki - Ludzie Nikodema 📚';
    } else if (p === '/wakacje') {
      title = 'Wakacje - Ludzie Nikodema 🏖️';
    }

    document.title = title;
  }, [location.pathname, preset]);

  return null;
};

export default PageTitle;
