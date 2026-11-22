import React, { useEffect, useRef, useState } from 'react';

/**
 * Fades its content up the first time it scrolls into view. Content is shown immediately where
 * IntersectionObserver is unavailable, and the CSS turns the effect off for reduced-motion users.
 */
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const element = ref.current;
    if (visible || !element) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`} style={delay ? { '--reveal-delay': `${delay}ms` } as React.CSSProperties : undefined}>
      {children}
    </div>
  );
};

export default Reveal;
