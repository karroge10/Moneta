'use client';

import { useEffect, useState, useRef } from 'react';
import { CheckCircle, Xmark, RefreshDouble } from 'iconoir-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const onCloseRef = useRef(onClose);

  // Keep onClose ref updated
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Trigger entrance animation
  useEffect(() => {
    // Small delay to trigger CSS animation
    const timeout = setTimeout(() => {
      setIsMounted(true);
    }, 10);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimatingOut(true);
      setTimeout(() => {
        onCloseRef.current();
      }, 300); // Match animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  const typeStyles: Record<ToastType, { accentColor: string; borderColor: string; iconBg: string }> = {
    success: {
      accentColor: '#74C648',
      borderColor: 'var(--accent-purple)', // Changed to purple border
      iconBg: 'rgba(116, 198, 72, 0.1)',
    },
    error: {
      accentColor: 'var(--error)',
      borderColor: 'var(--accent-purple)', // Changed to purple border
      iconBg: 'rgba(217, 63, 63, 0.1)',
    },
    info: {
      accentColor: 'var(--accent-purple)',
      borderColor: 'var(--accent-purple)',
      iconBg: 'rgba(172, 102, 218, 0.1)',
    },
  };

  const styles = typeStyles[type];

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle width={20} height={20} strokeWidth={1.5} />;
      case 'error':
        return <Xmark width={20} height={20} strokeWidth={1.5} />;
      case 'info':
        return <RefreshDouble width={20} height={20} strokeWidth={1.5} />;
      default:
        return <CheckCircle width={20} height={20} strokeWidth={1.5} />;
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 shadow-lg transition-all duration-300 ease-out ${
        isAnimatingOut 
          ? 'translate-y-2 opacity-0 scale-95' 
          : isMounted 
            ? 'translate-y-0 opacity-100 scale-100' 
            : 'translate-y-8 opacity-0 scale-95'
      }`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-card)',
        border: `1px solid ${styles.borderColor}`,
        color: 'var(--text-primary)',
        minWidth: '280px',
        maxWidth: '400px',
        transformOrigin: 'bottom right',
      }}
    >
      <div 
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ 
          backgroundColor: styles.iconBg,
          color: styles.accentColor 
        }}
      >
        {renderIcon()}
      </div>
      <p className="flex-1 text-body font-medium">{message}</p>
      <button
        onClick={() => {
          setIsAnimatingOut(true);
          setTimeout(() => {
            onClose();
          }, 300);
        }}
        className="shrink-0 p-1 rounded-full hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Close"
      >
        <Xmark width={16} height={16} strokeWidth={1.5} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: ToastType }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
