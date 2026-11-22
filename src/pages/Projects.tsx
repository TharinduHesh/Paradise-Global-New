import React, { useState } from 'react';
import { MapPin, Calendar, CheckCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Badge from '../components/ui/Badge';
import { EASE_INOUT, EASE_LUXE } from '../lib/motion';
import CTABanner from '../components/home/CTABanner';
import { useCatalogue, viewProject } from '../lib/catalogue';
import { usePageImage } from '../lib/siteContent';

type FilterType = 'all' | 'completed' | 'ongoing' | 'upcoming';

const statusBadge: Record<string, 'gold' | 'green' | 'beige'> = {
  completed: 'green',
  ongoing: 'gold',
  upcoming: 'beige',
};

const Projects: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const projects = useCatalogue<Record<string, unknown>>('project').map(viewProject);
  const headerImage = usePageImage('projects', 'header');

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);

  return (
    <>
      <title>Projects — Paradise Global Leisures</title>

      <div className="relative pt-32 pb-20 bg-navy-900 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url('${headerImage}')` }} />
        <div className="relative container-custom text-center">
          <p className="text-gold-400 text-sm font-medium uppercase tracking-widest mb-3">Our Work</p>
          <h1 className="font-serif text-white text-4xl md:text-5xl font-bold mb-4">Portfolio & Projects</h1>
          <div className="gold-divider" />
          <p className="text-white/70 text-lg mt-5 max-w-2xl mx-auto">
            A showcase of our completed, ongoing, and upcoming projects across Sri Lanka's Southern Coast.
          </p>
        </div>
      </div>

      <section className="section-padding bg-beige-50">
        <div className="container-custom">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {(['all', 'completed', 'ongoing', 'upcoming'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`relative px-5 py-2 rounded-md text-sm font-semibold capitalize transition-colors duration-300 ${filter === f ? 'text-white' : 'bg-white border border-beige-200 text-navy-600 hover:border-gold-300'}`}
              >
                {filter === f && <motion.span layoutId="project-filter" aria-hidden="true" className="absolute inset-0 rounded-md bg-navy-900 shadow-navy" transition={{ type: 'spring', stiffness: 380, damping: 34 }} />}
                <span className="relative">{f === 'all' ? 'All Projects' : f.charAt(0).toUpperCase() + f.slice(1)}</span>
              </button>
            ))}
          </div>

          {/* Projects Grid */}
          <div data-motion="manual" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
            {filtered.map((project, index) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.75, ease: EASE_LUXE, delay: Math.min(index, 8) * 0.06 } }}
                exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.3, ease: EASE_INOUT } }}
                transition={{ layout: { duration: 0.6, ease: EASE_LUXE } }}
                className="lux-card group bg-white rounded-sm shadow-card overflow-hidden border border-beige-200"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="lux-zoom w-full h-full object-cover"
                  />
                  <span aria-hidden="true" className="lux-rule absolute inset-x-0 bottom-0 h-0.5 bg-gold-gradient" />
                  <div className="absolute top-3 right-3">
                    <Badge variant={statusBadge[project.status]} size="md">
                      {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-gold-600 text-xs uppercase tracking-widest font-medium mb-2">{project.type}</p>
                  <h3 className="font-serif font-semibold text-navy-900 text-xl mb-2 group-hover:text-gold-600 transition-colors">
                    {project.title}
                  </h3>
                  <div className="flex items-center gap-4 text-navy-500 text-xs mb-3">
                    <span className="flex items-center gap-1"><MapPin size={12} className="text-gold-500" />{project.location}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} className="text-gold-500" />{project.year}</span>
                  </div>
                  <p className="text-navy-500 text-sm leading-relaxed mb-4">{project.description}</p>
                  {project.area && (
                    <div className="flex items-center gap-2 text-sm text-navy-600 pt-4 border-t border-beige-200">
                      <CheckCircle size={14} className="text-gold-500" />
                      <span>{project.area}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <CTABanner />
    </>
  );
};

export default Projects;
