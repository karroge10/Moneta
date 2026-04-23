"use client";

import Navbar from "./landing/Navbar";
import Hero from "./landing/Hero";
import Features from "./landing/Features";
import About from "./landing/About";
import ContactForm from "./landing/ContactForm";
import Footer from "./landing/Footer";
import { useLandingScroll } from "@/hooks/useLandingScroll";

export default function LandingPage() {
  const { isScrolled, activeSection, handleNavClick } = useLandingScroll();

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-[#AC66DA]/30 selection:text-[#E7E4E4]">
      <Navbar 
        isScrolled={isScrolled} 
        activeSection={activeSection} 
        onNavClick={handleNavClick} 
      />
      
      <main>
        <Hero />
        <Features />
        <About />
        <ContactForm />
      </main>

      <Footer onNavClick={handleNavClick} />
    </div>
  );
}