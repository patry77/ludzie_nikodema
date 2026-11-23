import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const p = location.pathname;
    let title = 'Wigilia 2026 🎄';

    if (p === '/' || p === '/menu') {
      title = 'Menu Wigilijne 2026 🎄';
    } else if (p.startsWith('/person/')) {
      title = 'Twoje losowanie - Mikołajki 2026 🎁';
    } else if (p === '/mikolajki') {
      title = 'Mikołajki 2026 - dołącz do losowania 🎁';
    } else if (p === '/admin') {
      title = 'Panel Administracyjny - Wigilia 2026 🔐';
    } else if (p === '/tvmenu') {
      title = 'Menu TV - Wigilia 2026 📺';
    } else if (p === '/wiki') {
      title = 'Wiki - Ludzie Nikodema 📚';
    } else if (p === '/wakacje') {
      title = 'Wakacje - Ludzie Nikodema 🏖️';
    }

    document.title = title;
  }, [location.pathname]);

  return null;
};

export default PageTitle;
