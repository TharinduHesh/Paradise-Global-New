import React from 'react';
import Hero from '../components/home/Hero';
import ServicesStrip from '../components/home/ServicesStrip';
import ServicesOverview from '../components/home/ServicesOverview';
import FeaturedProperties from '../components/home/FeaturedProperties';
import DestinationsSection from '../components/home/DestinationsSection';
import WhyChooseUs from '../components/home/WhyChooseUs';
import CTABanner from '../components/home/CTABanner';
import Testimonials from '../components/home/Testimonials';
import Reveal from '../components/ui/Reveal';

const Home: React.FC = () => {
  return (
    <>
      <Hero />
      <Reveal><ServicesStrip /></Reveal>
      <Reveal><ServicesOverview /></Reveal>
      <Reveal><FeaturedProperties /></Reveal>
      <Reveal><DestinationsSection /></Reveal>
      <Reveal><WhyChooseUs /></Reveal>
      <Reveal><Testimonials /></Reveal>
      <Reveal><CTABanner /></Reveal>
    </>
  );
};

export default Home;
