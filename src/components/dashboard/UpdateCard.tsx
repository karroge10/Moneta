import Card from '@/components/ui/Card';
import PulsingDot from '@/components/ui/PulsingDot';
import PlaceholderDataBadge from '@/components/ui/PlaceholderDataBadge';
import { NavArrowRight } from 'iconoir-react';
import Link from 'next/link';

interface UpdateCardProps {
  date: string;
  message: string;
  highlight: string;
  link: string;
  linkHref?: string;
}

export default function UpdateCard({ date, message, highlight, link, linkHref }: UpdateCardProps) {
  return (
    <Card 
      title="Update"
      customHeader={
        <Link href="/notifications" className="mb-4 flex items-center justify-between hover-text-purple transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <PulsingDot />
            <h2 className="text-card-header">Update</h2>
            <PlaceholderDataBadge />
          </div>
        </Link>
      }
    >
      <div className="flex flex-col flex-1 min-h-0 blur-sm" style={{ filter: 'blur(2px)' }}>
        <div className="flex-1 min-h-0">
          <div className="text-helper mb-2">{date}</div>
          <div className="text-body mb-4 text-wrap-safe break-words">
            {message.split(highlight).map((part, idx) => (
              <span key={idx}>
                {part}
                {idx === 0 && <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{highlight}</span>}
              </span>
            ))}
          </div>
        </div>
        {linkHref ? (
          <Link href={linkHref} className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors flex-wrap">
            <span className="text-wrap-safe break-words">{link}</span> <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" />
          </Link>
        ) : (
          <div className="text-helper flex items-center gap-1 cursor-pointer group hover-text-purple transition-colors flex-wrap">
            <span className="text-wrap-safe break-words">{link}</span> <NavArrowRight width={14} height={14} className="stroke-current transition-colors flex-shrink-0" />
          </div>
        )}
      </div>
    </Card>
  );
}

