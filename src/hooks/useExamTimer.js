import { useEffect, useRef } from 'react';

export function useExamTimer({ attemptId, remainingSeconds, onTick, onTimeUp, isActive = true }) {
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    if (!isActive || !attemptId || remainingSeconds === undefined) return;

    if (remainingSeconds <= 0) {
      if (onTimeUpRef.current) {
        onTimeUpRef.current();
      }
      return;
    }

    const intervalId = setInterval(() => {
      onTick(attemptId, (prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          if (onTimeUpRef.current) {
            onTimeUpRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [attemptId, onTick]);

  const mins = Math.max(0, Math.floor((remainingSeconds || 0) / 60));
  const secs = Math.max(0, (remainingSeconds || 0) % 60);
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isLow = (remainingSeconds || 0) <= 60;

  return { formattedTime, isLow };
}
