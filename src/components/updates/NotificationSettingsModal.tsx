'use client';

import { useEffect, useRef } from 'react';
import { Xmark } from 'iconoir-react';
import NotificationSettingsForm from '@/components/updates/NotificationSettingsForm';
import { NotificationSettings } from '@/types/dashboard';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: NotificationSettings;
  onToggle?: (key: keyof NotificationSettings, enabled: boolean) => void;
}

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  settings,
  onToggle,
}: NotificationSettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          className="w-full max-w-2xl max-h-[94vh] rounded-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 overflow-hidden flex flex-col"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <div
            className="flex items-center justify-between p-6 border-b border-[#3a3a3a]"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <h2 className="text-card-header">Settings</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover-text-purple transition-colors cursor-pointer"
              aria-label="Close"
            >
              <Xmark width={24} height={24} strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 pb-8">
              <NotificationSettingsForm settings={settings} onToggle={onToggle} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
