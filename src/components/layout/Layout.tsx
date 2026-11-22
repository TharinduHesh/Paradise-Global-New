import React from 'react';
import { MotionConfig } from 'motion/react';
import Navbar from './Navbar';
import Footer from './Footer';
import Preloader from '../motion/Preloader';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Public site shell. `reducedMotion="user"` makes every motion component honour the visitor's
 * reduced-motion setting (movement is dropped, gentle fades remain).
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <MotionConfig reducedMotion="user">
      <Preloader />
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </MotionConfig>
  );
};

export default Layout;
