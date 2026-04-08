'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Spark,
  Wallet,
  Heart,
  Reports,
  Settings,
  HelpCircle,
  InfoCircle,
  NavArrowRight,
  CheckCircle,
} from 'iconoir-react';
import Card from '@/components/ui/Card';
import { learningCenterLessons, type LearningCenterLesson } from '@/lib/learningCenterLessons';
import LearningLessonModal from '@/components/help/LearningLessonModal';
import { useAuthReadyForApi } from '@/hooks/useAuthReadyForApi';

const LESSON_ICONS = {
  '1': Spark,
  '2': Wallet,
  '3': Heart,
  '4': Reports,
  '5': Settings,
  '6': HelpCircle,
} as const;

export default function LearningCenterCard() {
  const authReady = useAuthReadyForApi();
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [activeLesson, setActiveLesson] = useState<LearningCenterLesson | null>(null);

  useEffect(() => {
    if (!authReady) {
      setProgressLoaded(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/learning-progress');
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { completedLessonIds?: unknown };
        const ids = data.completedLessonIds;
        if (Array.isArray(ids)) {
          setCompletedIds(new Set(ids.filter((x): x is string => typeof x === 'string')));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setProgressLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  const markLessonViewed = useCallback(
    async (lessonId: string) => {
      if (!authReady) return;
      try {
        const res = await fetch('/api/learning-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId }),
        });
        if (res.ok) {
          setCompletedIds((prev) => new Set(prev).add(lessonId));
        }
      } catch {
        /* ignore */
      }
    },
    [authReady],
  );

  useEffect(() => {
    if (!activeLesson || !authReady) return;
    void markLessonViewed(activeLesson.id);
  }, [activeLesson, authReady, markLessonViewed]);

  const openLesson = useCallback((lesson: LearningCenterLesson) => {
    setActiveLesson(lesson);
  }, []);

  const closeModal = useCallback(() => {
    setActiveLesson(null);
  }, []);

  const completedCount = completedIds.size;
  const total = learningCenterLessons.length;

  return (
    <>
      <Card title="Learning Center" showActions={false}>
        <p className="text-helper mb-4" style={{ color: 'var(--text-secondary)' }}>
          Open a lesson to read the steps and quick links. Opening a lesson saves it as complete on your account (
          {!progressLoaded ? '…' : `${completedCount}/${total}`} done).
        </p>

        <div className="flex flex-col gap-3">
          {learningCenterLessons.map((lesson) => {
            const IconComponent = LESSON_ICONS[lesson.id as keyof typeof LESSON_ICONS] ?? HelpCircle;
            const isComplete = completedIds.has(lesson.id);
            const iconColor = isComplete ? 'var(--accent-purple)' : 'var(--text-primary)';

            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => openLesson(lesson)}
                className="w-full text-left rounded-[30px] border border-[#3a3a3a] px-4 py-4 flex items-center gap-3 cursor-pointer transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--bg-primary)' }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${isComplete ? '#AC66DA' : '#E7E4E4'}1a`,
                    border: '1px solid rgba(231, 228, 228, 0.1)',
                  }}
                >
                  <IconComponent width={22} height={22} strokeWidth={1.5} style={{ color: iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-body font-semibold text-wrap-safe wrap-break-word flex items-center gap-2">
                    {lesson.title}
                    {isComplete && (
                      <CheckCircle
                        width={18}
                        height={18}
                        strokeWidth={1.5}
                        style={{ color: 'var(--accent-green)', flexShrink: 0 }}
                      />
                    )}
                  </div>
                  <p className="text-helper mt-1 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {lesson.summary}
                  </p>
                </div>
                <NavArrowRight width={20} height={20} strokeWidth={1.5} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2 mt-6">
          <InfoCircle
            width={16}
            height={16}
            strokeWidth={1.5}
            className="shrink-0 mt-0.5"
            style={{ color: 'var(--text-secondary)' }}
          />
          <p className="text-helper" style={{ color: 'var(--text-secondary)' }}>
            {authReady
              ? 'Progress is saved to your account when you open a lesson.'
              : 'Sign in to save lesson progress across devices.'}
          </p>
        </div>
      </Card>

      <LearningLessonModal lesson={activeLesson} isOpen={activeLesson !== null} onClose={closeModal} />
    </>
  );
}
