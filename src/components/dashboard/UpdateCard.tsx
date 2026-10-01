import Link from 'next/link';
import Card from '@/components/ui/Card';
import PulsingDot from '@/components/ui/PulsingDot';
import CardFooterLink from '@/components/dashboard/CardFooterLink';

interface UpdateCardProps {
  date: string;
  message: string;
  /** Part of `message` shown in green. */
  highlight: string;
  link: string;
  linkHref?: string;
  isUnread?: boolean;
}

export default function UpdateCard({ date, message, highlight, link, linkHref }: UpdateCardProps) {
  const parts = highlight ? message.split(highlight) : [message];

  return (
    <Card
      title="Update"
      customHeader={
        <Link href="/notifications" className="mb-4 flex items-center gap-3 transition-colors hover-text-purple">
          <PulsingDot />
          <h2 className="text-card-header">Update</h2>
        </Link>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <div className="text-helper mb-2">{date}</div>
          <p className="text-body text-wrap-safe mb-4 break-words">
            {parts.map((part, idx) => (
              <span key={idx}>
                {part}
                {idx === 0 && parts.length > 1 && <span className="font-semibold text-positive">{highlight}</span>}
              </span>
            ))}
          </p>
        </div>
        {linkHref ? (
          <CardFooterLink href={linkHref}>{link}</CardFooterLink>
        ) : (
          <span className="text-helper">{link}</span>
        )}
      </div>
    </Card>
  );
}
