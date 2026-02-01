'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Mail, WarningTriangle, InfoCircle, NavArrowDown } from 'iconoir-react';
import Card from '@/components/ui/Card';

export default function SendFeedbackCard() {
  const { user } = useUser();
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('Bug Report');
  const [message, setMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categoryOptions = ['Bug Report', 'Feature Request', 'Other'];

  useEffect(() => {
    setEmail(user?.primaryEmailAddress?.emailAddress ?? '');
  }, [user?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, category, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? 'Failed to send feedback');
        return;
      }
      setSuccess(true);
      setMessage('');
    } catch {
      setError('Failed to send feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card 
      title="Send Feedback"
      showActions={false}
      customHeader={
        <div className="mb-4">
          <h2 className="text-card-header">Send Feedback</h2>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {success && (
          <p className="text-body" style={{ color: 'var(--accent-green)' }}>
            Thank you! Your feedback has been saved.
          </p>
        )}
        {error && (
          <p className="text-body" style={{ color: 'var(--error)' }}>
            {error}
          </p>
        )}
        {/* Email Input */}
        <div>
          <label className="block text-body font-medium mb-2">Your Email</label>
          <div className="relative">
            <Mail 
              width={20} 
              height={20} 
              strokeWidth={1.5}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        {/* Category Dropdown */}
        <div>
          <label className="block text-body font-medium mb-2">Category</label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors text-left"
              style={{ color: 'var(--text-primary)' }}
            >
              <WarningTriangle 
                width={20} 
                height={20} 
                strokeWidth={1.5}
                style={{ color: 'var(--text-secondary)' }}
              />
              <span className="flex-1">{category}</span>
              <NavArrowDown width={16} height={16} strokeWidth={2} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 right-0 rounded-2xl shadow-lg overflow-hidden z-10" style={{ backgroundColor: 'var(--bg-surface)' }}>
                {categoryOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setCategory(option);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-3 hover-text-purple transition-colors text-body cursor-pointer"
                    style={{ 
                      backgroundColor: 'transparent',
                      color: category === option ? 'var(--accent-purple)' : 'var(--text-primary)' 
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Textarea */}
        <div>
          <label className="block text-body font-medium mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue or feedback"
            rows={6}
            className="w-full px-4 py-2 rounded-xl bg-[#202020] text-body border border-[#3a3a3a] focus:border-[#AC66DA] focus:outline-none transition-colors resize-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 rounded-full text-body font-semibold transition-colors cursor-pointer hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#E7E4E4', color: '#202020' }}
        >
          {isSubmitting ? 'Sending…' : 'Send Message'}
        </button>

        {/* Info Text */}
        <div className="flex items-start gap-2 mt-2">
          <InfoCircle 
            width={16} 
            height={16} 
            strokeWidth={1.5}
            className="shrink-0 mt-0.5"
            style={{ color: 'var(--text-secondary)' }}
          />
          <p className="text-helper" style={{ color: 'var(--text-secondary)' }}>
            Our support team is available Monday to Friday, 9 AM - 5 PM. Priority Support is available to Ultimate users.
          </p>
        </div>
      </form>
    </Card>
  );
}

