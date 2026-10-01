import { PrivacyPolicy, PageSearch } from 'iconoir-react';
import Link from 'next/link';
import Card from '@/components/ui/Card';

export default function LegalSection() {
  return (
    <Card title="Legal & Policies" showActions={false}>
      <ul className="flex flex-col gap-4">
        <li>
          <LegalLink
            href="/privacy"
            icon={<PrivacyPolicy width={20} height={20} strokeWidth={1.5} />}
            title="Privacy Policy"
            description="How we handle your data"
          />
        </li>
        <li>
          <LegalLink
            href="/terms"
            icon={<PageSearch width={20} height={20} strokeWidth={1.5} />}
            title="Terms of Service"
            description="Our agreement with you"
          />
        </li>
      </ul>
    </Card>
  );
}

function LegalLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-control p-3 transition-colors hover:bg-accent/10">
      <span className="text-muted transition-colors group-hover:text-accent" aria-hidden="true">
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-copy font-semibold text-fg">{title}</span>
        <span className="text-caption text-muted">{description}</span>
      </span>
    </Link>
  );
}
