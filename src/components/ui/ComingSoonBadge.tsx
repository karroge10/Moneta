interface ComingSoonBadgeProps {
  size?: 'sm' | 'md';
}

export default function ComingSoonBadge({ size = 'md' }: ComingSoonBadgeProps) {
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[10px]' 
    : 'px-3 py-1 text-xs';
  
  return (
    <span 
      className={`coming-soon-badge ${sizeClasses} rounded-full font-semibold`}
      style={{ backgroundColor: '#202020', color: '#E7E4E4' }}
    >
      Coming Soon
    </span>
  );
}

