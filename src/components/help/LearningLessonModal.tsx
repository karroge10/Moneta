'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Xmark, NavArrowRight } from 'iconoir-react';
import type { LearningCenterLesson } from '@/lib/learningCenterLessons';

interface LearningLessonModalProps {
  lesson: LearningCenterLesson | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LearningLessonModal({ lesson, isOpen, onClose }: LearningLessonModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const pointerDownOnOverlay = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !lesson) return null;

  return (
    <>
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-200"
        onMouseDown={() => {
          pointerDownOnOverlay.current = true;
        }}
        onMouseUp={() => {
          if (pointerDownOnOverlay.current) onClose();
          pointerDownOnOverlay.current = false;
        }}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-2xl max-h-[94vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto animate-in zoom-in-95 duration-200"
          style={{ backgroundColor: 'var(--bg-surface)' }}
          onMouseDown={() => {
            pointerDownOnOverlay.current = false;
          }}
        >
          <div className="flex items-center justify-between p-6 border-b border-[#3a3a3a] shrink-0">
            <h2 className="text-card-header pr-4">{lesson.title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 cursor-pointer transition-colors hover:text-[#AC66DA] shrink-0"
              style={{ color: 'var(--text-primary)' }}
              aria-label="Close"
            >
              <Xmark width={24} height={24} strokeWidth={1.5} />
            </button>
          </div>
          <div className="overflow-y-auto p-6 pb-8 flex flex-col gap-6">
            <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
              {lesson.summary}
            </p>
            <div>
              <h3 className="text-body font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Steps
              </h3>
              <ul className="list-disc pl-5 space-y-2 text-body" style={{ color: 'var(--text-secondary)' }}>
                {lesson.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
            <div>
              <Link
                href={lesson.primaryHref}
                onClick={onClose}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-body font-semibold transition-opacity hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: 'var(--accent-purple)', color: 'var(--text-primary)' }}
              >
                {lesson.primaryLabel}
                <NavArrowRight width={16} height={16} strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
