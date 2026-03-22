'use client';

import { useState, useEffect, useCallback } from 'react';

export default function RummikubTimer() {
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [turnCount, setTurnCount] = useState(1);

  // Bell Sound Logic (Simulating a Desk Bell)
  const playBell = useCallback(() => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create multiple oscillators for a richer "bell" tone
    const frequencies = [880, 1760]; // Root and Octave
    
    frequencies.forEach((freq, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, context.currentTime);
      
      // The "Strike" and "Decay"
      gain.gain.setValueAtTime(index === 0 ? 0.5 : 0.2, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.5);
      
      osc.connect(gain);
      gain.connect(context.destination);
      
      osc.start();
      osc.stop(context.currentTime + 1.5);
    });

    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 0.01));
      }, 10);
    } else if (timeLeft <= 0 && isActive) {
      setIsActive(false);
      setIsTimeUp(true);
      playBell();
    }
    return () => { if (interval) window.clearInterval(interval); };
  }, [isActive, timeLeft, playBell]);

  const handleNext = () => {
    setTimeLeft(60);
    setIsTimeUp(false);
    setIsActive(true);
    setTurnCount(prev => prev + 1);
  };

  const togglePause = () => setIsActive(!isActive);

  const handleReset = () => {
    setIsActive(false);
    setIsTimeUp(false);
    setTimeLeft(60);
    setTurnCount(1);
  };

  return (
    <main className={`flex min-h-screen flex-col items-center justify-center p-6 transition-all duration-700 ${isTimeUp ? 'bg-blue-500' : 'bg-slate-900'} text-white`}>
      
      <div className="text-sm font-mono tracking-[0.3em] mb-4 opacity-40 uppercase">Round {turnCount}</div>
      
      {/* Visual Indicator: Turns Yellow when time is up, no pulse */}
      <div className={`text-8xl font-mono tabular-nums mb-12 transition-colors duration-300 ${isTimeUp ? 'text-yellow-300 scale-110' : 'text-white'}`}>
        {timeLeft.toFixed(2)}
      </div>

      <div className="flex flex-col w-full max-w-sm gap-6">
        <button
          onClick={handleNext}
          className="h-32 bg-blue-600 rounded-3xl text-4xl font-black shadow-xl active:scale-95 transition-all border-4 border-blue-400"
        >
          {isTimeUp ? "NEXT TURN" : (timeLeft === 60 && !isActive ? "START" : "NEXT")}
        </button>

        <div className="flex gap-4">
          <button
            onClick={togglePause}
            disabled={isTimeUp || (timeLeft === 60 && !isActive)}
            className={`flex-1 h-20 rounded-2xl text-xl font-bold transition-all border-2 ${
              isActive 
                ? 'bg-orange-600 border-orange-400' 
                : 'bg-emerald-600 border-emerald-400'
            } disabled:opacity-20`}
          >
            {isActive ? "STOP" : "CONTINUE"}
          </button>
          
          <button
            onClick={handleReset}
            className="flex-1 h-20 bg-slate-800 border-2 border-slate-700 rounded-2xl text-xl font-bold active:scale-95"
          >
            RESET
          </button>
        </div>
      </div>
    </main>
  );
}