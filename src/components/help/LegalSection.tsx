'use client';

import { PrivacyPolicy, PageSearch } from 'iconoir-react';
import Card from '@/components/ui/Card';
import Link from 'next/link';

export default function LegalSection() {
  return (
    <Card 
      title="Legal & Policies"
      showActions={false}
      customHeader={
        <div className="mb-4">
          <h2 className="text-card-header">Legal & Policies</h2>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Link 
          href="/privacy" 
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#AC66DA]/10 transition-colors group cursor-pointer"
        >
          <PrivacyPolicy className="text-helper group-hover:text-[#AC66DA] transition-colors" width={20} height={20} strokeWidth={1.5} />
          <div className="flex flex-col">
            <span className="text-body font-semibold group-hover:text-[#E7E4E4]">Privacy Policy</span>
            <span className="text-[10px] text-helper">How we handle your data</span>
          </div>
        </Link>

        <Link 
          href="/terms" 
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#AC66DA]/10 transition-colors group cursor-pointer"
        >
          <PageSearch className="text-helper group-hover:text-[#AC66DA] transition-colors" width={20} height={20} strokeWidth={1.5} />
          <div className="flex flex-col">
            <span className="text-body font-semibold group-hover:text-[#E7E4E4]">Terms of Service</span>
            <span className="text-[10px] text-helper">Our agreement with you</span>
          </div>
        </Link>
      </div>
    </Card>
  );
}
