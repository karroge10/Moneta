export default function PulsingDot() {
  return (
    <div className="relative inline-flex items-center justify-center ml-2">
      <div className="blinking-dot" style={{ 
        width: '12px', 
        height: '12px', 
        backgroundColor: '#AC66DA',
        borderRadius: '50%',
      }} />
    </div>
  );
}

