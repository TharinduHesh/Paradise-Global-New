import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  // The first page view already has its own entrance animation (e.g. the homepage hero),
  // so the page transition only plays when moving between pages.
  const [route, setRoute] = useState({ path: pathname, navigated: false });
  if (route.path !== pathname) setRoute({ path: pathname, navigated: true });
  const navigated = route.navigated || route.path !== pathname;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {navigated && <div key={`bar-${pathname}`} className="route-bar" aria-hidden="true" />}
      <Navbar />
      <main className="flex-1">
        <div key={pathname} className={navigated ? 'page-enter' : undefined}>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
