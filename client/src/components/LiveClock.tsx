import React, { useState, useEffect } from 'react';

interface LiveClockProps {
  className?: string;
}

const LiveClock: React.FC<LiveClockProps> = ({ className = 'w-7 h-7' }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  // Calculate angles for clock hands
  const secondAngle = (seconds / 60) * 360;
  const minuteAngle = (minutes / 60) * 360 + (seconds / 60) * 6;
  const hourAngle = (hours / 12) * 360 + (minutes / 60) * 30;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Clock circle */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      
      {/* Hour markers */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
        <line
          key={angle}
          x1="12"
          y1="3.5"
          x2="12"
          y2="4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
      
      {/* Hour hand */}
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        transform={`rotate(${hourAngle} 12 12)`}
        style={{ transition: 'transform 0.5s ease-in-out' }}
      />
      
      {/* Minute hand */}
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        transform={`rotate(${minuteAngle} 12 12)`}
        style={{ transition: 'transform 0.5s ease-in-out' }}
      />
      
      {/* Second hand - thin and distinct */}
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="4"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        transform={`rotate(${secondAngle} 12 12)`}
        style={{ transition: 'transform 0.05s linear' }}
        opacity="0.9"
      />
      
      {/* Center dot */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
};

export default LiveClock;
