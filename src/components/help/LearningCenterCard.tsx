'use client';

import { useState } from 'react';
import { Book, Spark, Wallet, Heart, Reports, Crown, HelpCircle, InfoCircle } from 'iconoir-react';
import Card from '@/components/ui/Card';
import ComingSoonBadge from '@/components/ui/ComingSoonBadge';

interface Lesson {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ width?: number; height?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  completed?: boolean;
}

const lessons: Lesson[] = [
  {
    id: '1',
    title: 'Getting Started',
    description: 'Learn the basics to make the most of your experience.',
    icon: Spark,
    completed: false
  },
  {
    id: '2',
    title: 'Managing Finances',
    description: 'Take control of your income, expenses, and financial goals.',
    icon: Wallet,
    completed: false
  },
  {
    id: '3',
    title: 'Financial Health & Insights',
    description: 'Discover how to improve your financial well-being.',
    icon: Heart,
    completed: false
  },
  {
    id: '4',
    title: 'Statistics & Analysis',
    description: 'Understand your progress with powerful statistics and insights.',
    icon: Reports,
    completed: false
  },
  {
    id: '5',
    title: 'Advanced Tools',
    description: 'Learn to use premium features effectively.',
    icon: Crown,
    completed: false
  },
  {
    id: '6',
    title: 'Support & Troubleshooting',
    description: 'Resolve issues and find answers to common questions.',
    icon: HelpCircle,
    completed: false
  }
];

export default function LearningCenterCard() {
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  const toggleLesson = (lessonId: string) => {
    setCompletedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  return (
    <Card 
      title="Learning Center"
      showActions={false}
      customHeader={
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-card-header">Learning Center</h2>
          <ComingSoonBadge />
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-4 auto-rows-fr">
        {lessons.map((lesson) => {
          const isCompleted = completedLessons.has(lesson.id);
          const IconComponent = lesson.icon;
          const iconColor = isCompleted ? 'var(--accent-purple)' : 'var(--text-primary)';
          const textColor = isCompleted ? 'var(--accent-purple)' : 'var(--text-primary)';

          return (
            <div
              key={lesson.id}
              onClick={() => toggleLesson(lesson.id)}
              className="flex flex-col items-center h-full p-4 rounded-[30px] cursor-pointer transition-colors hover:opacity-90"
              style={{ backgroundColor: '#202020' }}
            >
              {/* Title - Always at top with fixed height */}
              <h3 
                className="text-body font-semibold text-center shrink-0 mb-3 min-h-12 flex items-start justify-center"
                style={{ color: textColor }}
              >
                <span className="line-clamp-2">{lesson.title}</span>
              </h3>

              {/* Book Icon with Subject Icon Overlay - Always in middle */}
              <div className="relative flex items-center justify-center flex-1 w-full min-h-20">
                <Book
                  width={64}
                  height={64}
                  strokeWidth={1.5}
                  style={{ color: iconColor }}
                />
                <div className="absolute">
                  <IconComponent
                    width={32}
                    height={32}
                    strokeWidth={1.5}
                    style={{ color: iconColor }}
                  />
                </div>
              </div>

              {/* Description - Always at bottom with fixed height */}
              <p 
                className="text-helper text-center shrink-0 mt-3 min-h-10 flex items-end justify-center"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span className="line-clamp-2">{lesson.description}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Info Text */}
      <div className="flex items-start gap-2 mt-6">
        <InfoCircle 
          width={16} 
          height={16} 
          strokeWidth={1.5}
          className="shrink-0 mt-0.5"
          style={{ color: 'var(--text-secondary)' }}
        />
        <p className="text-helper" style={{ color: 'var(--text-secondary)' }}>
          Use these learning guides to improve your financial knowledge!
        </p>
      </div>
    </Card>
  );
}

