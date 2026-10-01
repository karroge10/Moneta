import Navbar from "./landing/Navbar";
import Hero from "./landing/Hero";
import Features from "./landing/Features";
import About from "./landing/About";
import ContactForm from "./landing/ContactForm";
import Footer from "./landing/Footer";

/** Marketing page. Server rendered; only the navbar, hero buttons and contact form hydrate. */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-accent/30 selection:text-fg">
      <Navbar />

      <main>
        <Hero />
        <Features />
        <About />
        <ContactForm />
      </main>

      <Footer />
    </div>
  );
}
