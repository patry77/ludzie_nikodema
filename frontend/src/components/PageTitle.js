import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const PageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    let title = 'Menu Sylwestrowe 2025 🎉';
    
    if (location.pathname === '/') {
      title = 'Menu Sylwestrowe 2025 🎉';
    } else if (location.pathname.startsWith('/person/')) {
      title = 'Twoje losowanie - Sylwester 2025 🎊';
    } else if (location.pathname === '/admin') {
      title = 'Panel Administracyjny - Sylwester 2025 🔐';
    } else if (location.pathname === '/menu') {
      title = 'Menu Sylwestrowe 2025 🍽️';
    } else if (location.pathname === '/tvmenu') {
      title = 'Menu TV - Sylwester 2025 📺';
    } else if (location.pathname === '/wiki') {
      title = 'Wiki - Ludzie Nikodema 📚';
    }
    
    document.title = title;
  }, [location.pathname]);

  return null;
};

export default PageTitle;

