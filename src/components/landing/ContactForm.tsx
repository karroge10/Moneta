"use client";

import { useState } from "react";
import { HeadsetHelp, Mail } from "iconoir-react";

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, category: 'Other', message }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('Contact form error:', err);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <section id="contact" className="py-16 md:py-20 px-6 md:px-8 border-t border-[#2a2a2a] bg-gradient-to-b from-[#1f1f1f] to-background">
        <div className="max-w-xl mx-auto">
          <div className="text-center p-8 text-[#74C648] font-bold text-lg bg-[#74C648]/10 rounded-3xl border border-[#74C648]/20 shadow-xl">
            Thank you! Your message has been sent.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="py-16 md:py-20 px-6 md:px-8 border-t border-[#2a2a2a] bg-gradient-to-b from-[#1f1f1f] to-background">
      <div className="max-w-xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-[#AC66DA]/10 mb-1 border border-[#AC66DA]/20">
            <HeadsetHelp width={28} height={28} strokeWidth={1.5} className="text-[#AC66DA]" />
          </div>
          <h2 className="text-[32px] md:text-[40px] text-[#E7E4E4] font-bold tracking-tight leading-tight">
            Get in Touch
          </h2>
          <p className="text-base text-[#E7E4E4] opacity-70">
            Questions, feedback, or partnership ideas? Send a message below to get a response as soon as possible.
          </p>
        </div>
        
        <div className="w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-[#1a1a1a] p-6 md:p-8 rounded-3xl border border-[#3a3a3a] shadow-xl">
            <div>
              <label className="block text-body font-medium mb-2 text-[#E7E4E4]">Your Email</label>
              <div className="relative">
                <Mail width={20} height={20} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#E7E4E4]/50" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="hello@moneta.app"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-background text-body border border-[#3a3a3a] text-[#E7E4E4] focus:border-[#AC66DA] focus:outline-none transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-body font-medium mb-2 text-[#E7E4E4]">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                placeholder="How can we help you?"
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-background text-body border border-[#3a3a3a] text-[#E7E4E4] focus:border-[#AC66DA] focus:outline-none transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full px-6 py-4 mt-2 rounded-[14px] font-semibold text-white bg-gradient-to-r from-[#AC66DA] to-[#904eb8] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(172,102,218,0.3)]"
            >
              {status === 'sending' ? 'Sending...' : status === 'error' ? 'Try Again' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
