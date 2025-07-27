
import React, { useState, useEffect } from 'react';

const LiveInfo: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  return (
    <div className="absolute top-4 right-6 text-right z-10">
      <p className="text-xl font-semibold text-gray-700">{currentTime.toLocaleTimeString()}</p>
    </div>
  );
};

export default LiveInfo;
