'use client';

import { NavArrowRight } from 'iconoir-react';
import Dialog from '@/components/ui/Dialog';
import Link from 'next/link';
import type { LearningCenterLesson } from '@/lib/learningCenterLessons';

interface LearningLessonModalProps {
  lesson: LearningCenterLesson | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LearningLessonModal({ lesson, isOpen, onClose }: LearningLessonModalProps) {
  if (!lesson) return null;

  const footer = (
    <Link href={lesson.primaryHref} onClick={onClose} className={LINK_BUTTON_CLASS}>
      {lesson.primaryLabel}
      <NavArrowRight width={16} height={16} strokeWidth={1.5} aria-hidden="true" />
    </Link>
  );

  return (
    <Dialog open={isOpen} onClose={onClose} title={lesson.title} size="lg" footer={footer}>
      <div className="flex flex-col gap-6">
        <p className="text-copy text-secondary text-pretty">{lesson.summary}</p>
        <div>
          <h3 className="mb-3 text-copy font-semibold text-fg">Steps</h3>
          <ol className="list-decimal space-y-2 pl-5 text-copy text-secondary">
            {lesson.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    </Dialog>
  );
}

// Same look as <Button variant="primary">; a Link is used so the lesson can close the dialog on click.
const LINK_BUTTON_CLASS =
  'btn btn-primary inline-flex h-10 items-center justify-center gap-2 px-5 text-ui font-semibold active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
