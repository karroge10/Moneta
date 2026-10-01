'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { apiFetch } from '@/lib/api-client';
import { API, queryKeys } from '@/lib/query-keys';
import { cx } from '@/components/ui/cx';

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
  const queryClient = useQueryClient();
  const [activeLesson, setActiveLesson] = useState<LearningCenterLesson | null>(null);

  const progressQuery = useQuery({
    queryKey: queryKeys.learningProgress.all,
    queryFn: () => apiFetch<{ completedLessonIds?: unknown }>(API.learningProgress),
    select: toCompletedIds,
    enabled: authReady,
  });

  const markViewed = useMutation({
    mutationFn: (lessonId: string) => apiFetch(API.learningProgress, { method: 'POST', body: { lessonId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.learningProgress.all }),
  });

  const completedIds = progressQuery.data ?? EMPTY_IDS;
  const progressLoaded = !authReady || !progressQuery.isPending;

  const openLesson = (lesson: LearningCenterLesson) => {
    setActiveLesson(lesson);
    if (authReady && !completedIds.has(lesson.id)) markViewed.mutate(lesson.id);
  };

  const closeModal = () => setActiveLesson(null);

  const completedCount = completedIds.size;
  const total = learningCenterLessons.length;

  return (
    <>
      <Card title="Learning Center" showActions={false}>
        <p className="mb-4 text-ui text-secondary text-pretty">
          Open a lesson to read the steps and quick links.{' '}
          <span className="tabular-nums">{progressLoaded ? `${completedCount} of ${total} done.` : 'Loading progress…'}</span>
        </p>

        <div className="flex flex-col gap-3">
          {learningCenterLessons.map((lesson) => {
            const IconComponent = LESSON_ICONS[lesson.id as keyof typeof LESSON_ICONS] ?? HelpCircle;
            const isComplete = completedIds.has(lesson.id);

            return (
              <button
                key={lesson.id}
                type="button"
                onClick={() => openLesson(lesson)}
                aria-haspopup="dialog"
                className="flex w-full items-center gap-3 rounded-panel border border-line bg-surface-0 p-4 text-left transition-colors hover:border-line-strong focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div
                  className={cx(
                    'flex size-12 shrink-0 items-center justify-center rounded-full border border-fg/10',
                    isComplete ? 'bg-accent/10 text-accent' : 'bg-fg/10 text-fg',
                  )}
                  aria-hidden="true"
                >
                  <IconComponent width={22} height={22} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-copy font-semibold wrap-break-word">
                    {lesson.title}
                    {isComplete && (
                      <>
                        <CheckCircle width={18} height={18} strokeWidth={1.5} className="shrink-0 text-positive" aria-hidden="true" />
                        <span className="sr-only">(completed)</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-ui text-secondary">{lesson.summary}</p>
                </div>
                <NavArrowRight width={20} height={20} strokeWidth={1.5} className="shrink-0 text-secondary" aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="flex items-start gap-2 mt-6">
          <InfoCircle width={16} height={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-secondary" aria-hidden="true" />
          <p className="text-ui text-secondary">
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

const EMPTY_IDS: ReadonlySet<string> = new Set();

function toCompletedIds(data: { completedLessonIds?: unknown }): ReadonlySet<string> {
  const ids = Array.isArray(data.completedLessonIds) ? data.completedLessonIds : [];
  const lessonIds = ids.filter((x): x is string => typeof x === 'string');
  return new Set(lessonIds);
}
