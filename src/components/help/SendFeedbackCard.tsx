'use client';

import { useState, useRef, useEffect } from 'react';
import { Mail, WarningTriangle, InfoCircle, NavArrowDown } from 'iconoir-react';
import Card from '@/components/ui/Card';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';

export default function SendFeedbackCard() {
  const [email, setEmail] = useState('egorkabantsov@gmail.com');
  const [category, setCategory] = useState('Bug Report');
  const [message, setMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categoryOptions = ['Bug Report', 'Feature Request', 'Other'];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Feedback submitted:', { email, category, message });
    // TODO: Implement actual form submission
    setMessage('');
  };

  return (
    <Card 
      title="Send Feedback"
      showActions={false}
      customHeader={
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-card-header">Send Feedback</h2>
          <ComingSoonBadge />
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          className="w-full px-6 py-3 rounded-full text-body font-semibold transition-colors cursor-pointer hover:opacity-90"
          style={{ backgroundColor: 'var(--accent-purple)', color: '#E7E4E4' }}
        >
          Send Message
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

