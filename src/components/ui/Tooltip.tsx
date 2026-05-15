'use client';

import { useState, useRef, useEffect, cloneElement, isValidElement, type ReactElement, type MutableRefObject } from 'react';

interface TooltipProps {
  content: string;
  children: ReactElement;
  className?: string;
}

export default function Tooltip({ content, children, className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isHoveringTooltipRef = useRef(false);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      
      requestAnimationFrame(() => {
        if (!triggerRef.current || !tooltipRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let top = triggerRect.bottom + 8;
        let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;

        
        if (left < 8) {
          left = 8;
        } else if (left + tooltipRect.width > viewportWidth - 8) {
          left = viewportWidth - tooltipRect.width - 8;
        }

        
        if (top + tooltipRect.height > viewportHeight - 8) {
          top = triggerRect.top - tooltipRect.height - 8;
        }

        setPosition({ top, left });
      });
    }
  }, [isVisible]);

  const handleMouseEnter = () => {
    setIsVisible(true);
    isHoveringTooltipRef.current = false;
  };

  const handleMouseLeave = () => {
    
    setTimeout(() => {
      if (!isHoveringTooltipRef.current) {
        setIsVisible(false);
      }
    }, 100);
  };

  const handleTooltipMouseEnter = () => {
    isHoveringTooltipRef.current = true;
    setIsVisible(true);
  };

  const handleTooltipMouseLeave = () => {
    isHoveringTooltipRef.current = false;
    setIsVisible(false);
  };

  const childWithProps = isValidElement(children)
    ? cloneElement(
        children,
        Object.assign(
          {},
          children.props as Record<string, unknown>,
          {
            ref: (node: HTMLElement | null) => {
              triggerRef.current = node;
              const childRef = (children as ReactElement & { ref?: React.Ref<HTMLElement> }).ref;
              if (childRef) {
                if (typeof childRef === 'function') {
                  childRef(node);
                } else if (typeof childRef === 'object' && childRef !== null && 'current' in childRef) {
                  const mutable = childRef as MutableRefObject<HTMLElement | null>;
                  // Merging into an object ref requires updating `.current` (React-supported pattern).
                  // eslint-disable-next-line react-hooks/immutability -- ref merge callback
                  mutable.current = node;
                }
              }
            },
            onMouseEnter: handleMouseEnter,
            onMouseLeave: handleMouseLeave,
            className: `${((children.props as { className?: string }).className || '')} ${className}`.trim(),
          }
        )
      )
    : children;

  return (
    <>
      {childWithProps}
      {isVisible && content && (
        <div
          ref={tooltipRef}
          className="tooltip-surface fixed z-50 max-w-xs wrap-break-word select-text"
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            fontSize: '14px',
            lineHeight: '1.4',
            cursor: 'text',
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}

