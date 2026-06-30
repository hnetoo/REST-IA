import React from 'react';

interface ProgressBarProps {
  percentage: number;
  className?: string;
  barClassName?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, className = '', barClassName = '' }) => {
  const barRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (barRef.current) {
      const clamped = Math.max(0, Math.min(100, percentage));
      barRef.current.style.width = `${clamped}%`;
    }
  }, [percentage]);

  return (
    <div className={`h-full bg-white/5 rounded-full overflow-hidden ${className}`}>
      <div ref={barRef} className={`h-full rounded-full transition-all duration-300 w-0 ${barClassName}`} />
    </div>
  );
};

export default ProgressBar;
