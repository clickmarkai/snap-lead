import { useState, useEffect } from 'react';

interface UseTypingAnimationOptions {
  text: string;
  speed?: number; // milliseconds per character
  startDelay?: number; // delay before starting animation
}

export const useTypingAnimation = ({ 
  text, 
  speed = 50, 
  startDelay = 0 
}: UseTypingAnimationOptions) => {
  const [displayText, setDisplayText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!text || text.trim() === '') {
      setDisplayText('');
      setIsComplete(true);
      setHasStarted(false);
      return;
    }

    setDisplayText('');
    setIsComplete(false);
    setHasStarted(false);

    let typeInterval: NodeJS.Timeout;
    
    // Start animation after delay
    const startTimeout = setTimeout(() => {
      setHasStarted(true);
      let currentIndex = 0;

      typeInterval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsComplete(true);
          clearInterval(typeInterval);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(startTimeout);
      if (typeInterval) {
        clearInterval(typeInterval);
      }
    };
  }, [text, speed, startDelay]);

  return {
    displayText,
    isComplete,
    hasStarted
  };
}; 