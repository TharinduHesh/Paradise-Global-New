/**
 * Images that belong to a page rather than to a record. An empty url means the page uses an image bundled with the site.
 * Admins override these from Website Content; the page falls back to the url here.
 */
export const pageImageDefaults: Record<string, Record<string, { label: string; url: string }>> = {
  home: {
    hero: { label: 'Hero background', url: '' },
    why: { label: 'Why choose us image', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=80' },
    cta: { label: 'Call-to-action banner background', url: 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1920&q=80' },
  },
  about: {
    header: { label: 'Page header background', url: 'https://images.unsplash.com/photo-1526089828737-46cdda0c2d4f?w=1920&q=80' },
    story: { label: 'Our story image', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80' },
    team0: { label: 'Team member 1 photo', url: 'https://images.unsplash.com/photo-1560250097-0dc05888d69a?w=400&q=80' },
    team1: { label: 'Team member 2 photo', url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&q=80' },
    team2: { label: 'Team member 3 photo', url: 'https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=400&q=80' },
    team3: { label: 'Team member 4 photo', url: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80' },
  },
  services: {
    header: { label: 'Page header background', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80' },
  },
  contact: {
    header: { label: 'Page header background', url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1920&q=80' },
  },
  projects: {
    header: { label: 'Page header background', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80' },
  },
};
