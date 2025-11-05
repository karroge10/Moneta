import Card from '@/components/ui/Card';

export default function LevelUpCard() {
  return (
    <Card 
      title=""
      showActions={false}
      customHeader={<div style={{ display: 'none' }}></div>}
      className="level-up-card"
    >
      <div className="flex flex-col justify-center flex-1" style={{ gap: '16px', minHeight: 0, overflow: 'auto' }}>
        <span className="text-body font-semibold">Level Up Your Finance Game!</span>
        <button 
          style={{ 
            padding: '8px 16px',
            borderRadius: '9999px',
            background: 'var(--text-primary)',
            color: '#282828',
            fontFamily: 'inherit',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
            alignSelf: 'flex-start'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Upgrade to Premium
        </button>
      </div>
    </Card>
  );
}

