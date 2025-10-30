import Card from '@/components/ui/Card';
import PulsingDot from '@/components/ui/PulsingDot';
import { NavArrowRight } from 'iconoir-react';

interface UpdateCardProps {
  date: string;
  message: string;
  highlight: string;
  link: string;
}

export default function UpdateCard({ date, message, highlight, link }: UpdateCardProps) {
  return (
    <Card 
      title="Update"
      customHeader={
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center">
            <h2 className="text-card-header">Update</h2>
            <PulsingDot />
          </div>
        </div>
      }
    >
      <div className="text-helper mb-2">{date}</div>
      <div className="text-body mb-4">
        {message.split(highlight).map((part, idx) => (
          <span key={idx}>
            {part}
            {idx === 0 && <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{highlight}</span>}
          </span>
        ))}
      </div>
      <div className="text-helper flex items-center gap-1 cursor-pointer hover:text-accent-purple transition-colors">
        {link} <NavArrowRight width={14} height={14} />
      </div>
    </Card>
  );
}

