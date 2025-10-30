export default function PulsingDot() {
  return (
    <div className="relative inline-flex items-center justify-center mr-2">
      <div className="blinking-dot" style={{ 
        width: '8px', 
        height: '8px', 
        backgroundColor: '#AC66DA',
        borderRadius: '50%',
      }} />
    </div>
  );
}

