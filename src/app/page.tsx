'use client';

import { useState, useEffect, useCallback } from 'react';

type Player = {
  name: string;
  totalScore: number;
};

type RoundRecord = {
  roundNumber: number;
  scores: { [playerName: string]: number };
};

type AppMode = 'SETUP' | 'TIMER' | 'SCORING' | 'HISTORY';

export default function RummikubTournament() {
  // --- STATE ---
  const [mode, setMode] = useState<AppMode>('SETUP');
  const [players, setPlayers] = useState<Player[]>([
    { name: '', totalScore: 0 }, { name: '', totalScore: 0 },
    { name: '', totalScore: 0 }, { name: '', totalScore: 0 }
  ]);
  
  const [history, setHistory] = useState<RoundRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isActive, setIsActive] = useState(false);
  
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [loserPoints, setLoserPoints] = useState<number[]>([0, 0, 0, 0]);

  // --- AUDIO & HAPTICS ---
  const playBell = useCallback(() => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    
    const frequencies = [880, 1760, 440];
    frequencies.forEach((freq, i) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, context.currentTime);
      gain.gain.setValueAtTime(i === 0 ? 0.5 : 0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 1.5);
    });
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
  }, []);

  // --- TIMER EFFECT ---
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 0.01));
      }, 10);
    } else if (timeLeft <= 0 && isActive) {
      setIsActive(false);
      playBell();
    }
    return () => { if (interval) window.clearInterval(interval); };
  }, [isActive, timeLeft, playBell]);

  // --- HANDLERS ---
  const handleStartTournament = () => {
    if (players.every(p => p.name.trim() !== '')) {
      setMode('TIMER');
    }
  };

  const handleNextPlayer = () => {
    setTimeLeft(60);
    setIsActive(true);
    if ('vibrate' in navigator) navigator.vibrate(50);
  };

  const submitScores = () => {
    if (winnerIndex === null) return;
    const newPlayers = [...players];
    let sumOfLoserPoints = 0;
    const currentRoundScores: { [key: string]: number } = {};

    loserPoints.forEach((pts, i) => {
      if (i !== winnerIndex) {
        newPlayers[i].totalScore -= pts;
        sumOfLoserPoints += pts;
        currentRoundScores[players[i].name] = -pts;
      }
    });

    newPlayers[winnerIndex].totalScore += sumOfLoserPoints;
    currentRoundScores[players[winnerIndex].name] = sumOfLoserPoints;

    setHistory([...history, { roundNumber: history.length + 1, scores: currentRoundScores }]);
    setPlayers(newPlayers);
    setLoserPoints([0, 0, 0, 0]);
    setWinnerIndex(null);
    setMode('TIMER');
    setTimeLeft(60);
    setIsActive(false);
  };

  const resetTournament = () => {
    if (confirm("Reset everything? All points and history will be lost.")) {
      setPlayers(players.map(p => ({ ...p, totalScore: 0 })));
      setHistory([]);
      setMode('SETUP');
    }
  };

  const getOverallWinner = () => {
    return [...players].sort((a, b) => b.totalScore - a.totalScore)[0];
  };

  // --- VIEWS ---

  if (mode === 'SETUP') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-slate-900 text-white font-sans">
        <h1 className="text-3xl font-black mb-8 text-blue-400 tracking-tighter uppercase">Rummikub</h1>
        <div className="w-full max-w-xs space-y-3">
          {players.map((p, i) => (
            <input
              key={i}
              placeholder={`Player ${i + 1}`}
              className="w-full p-4 bg-slate-800 rounded-2xl border-2 border-slate-700 focus:border-blue-500 outline-none"
              value={p.name}
              onChange={(e) => {
                const newP = [...players];
                newP[i].name = e.target.value;
                setPlayers(newP);
              }}
            />
          ))}
          <button onClick={handleStartTournament} className="w-full h-16 bg-blue-600 rounded-2xl font-bold text-xl active:scale-95 transition-transform mt-4">
            START
          </button>
        </div>
      </main>
    );
  }

  if (mode === 'SCORING') {
  return (
    <main className="flex min-h-screen flex-col items-center p-6 bg-slate-950 text-white">
      <h2 className="text-2xl font-bold my-8">Who won the round?</h2>
      <div className="grid grid-cols-2 gap-4 w-full max-w-md mb-8">
        {players.map((p, i) => (
          <button 
            key={i} 
            onClick={() => setWinnerIndex(i)}
            className={`p-6 rounded-2xl border-2 font-bold transition-all ${winnerIndex === i ? 'bg-emerald-600 border-white' : 'bg-slate-900 border-slate-800 opacity-60'}`}
          >
            {p.name}
          </button>
        ))}
      </div>
      {winnerIndex !== null && (
        <div className="w-full max-w-md">
          <p className="mb-4 text-center text-slate-400 italic text-sm">Enter points for losers (auto-negative):</p>
          {players.map((p, i) => i !== winnerIndex && (
            <div key={i} className="flex items-center justify-between mb-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <span className="font-bold">{p.name}</span>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-red-400 font-mono">-</span>
                <input 
                  type="number" 
                  inputMode="numeric"
                  className="w-24 p-2 pl-6 bg-slate-800 rounded-xl border border-slate-700 text-center text-xl font-mono text-red-400"
                  placeholder="0"
                  // We show the absolute value in the box, but the "-" span makes it look negative
                  onChange={(e) => {
                    const val = Math.abs(parseInt(e.target.value) || 0);
                    const pts = [...loserPoints];
                    pts[i] = val; // Store as positive absolute for the math in submitScores
                    setLoserPoints(pts);
                  }}
                />
              </div>
            </div>
          ))}
          <button onClick={submitScores} className="w-full h-16 bg-blue-600 rounded-3xl mt-6 font-black text-xl">SUBMIT SCORES</button>
        </div>
      )}
    </main>
  );
}

  if (mode === 'HISTORY') {
    return (
      <main className="flex min-h-screen flex-col items-center p-6 bg-slate-900 text-white">
        <div className="w-full flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-blue-400">HISTORY</h2>
          <button onClick={() => setMode('TIMER')} className="bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold">BACK</button>
        </div>
        <div className="w-full max-w-md overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 text-xs text-slate-500 uppercase">Rd</th>
                {players.map(p => (
                  <th key={p.name} className="py-3 px-1 text-xs text-slate-500 uppercase truncate max-w-[65px]">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-800/50">
                  <td className="py-4 text-slate-500 font-mono text-xs">{row.roundNumber}</td>
                  {players.map(p => (
                    <td key={p.name} className={`py-4 px-1 font-mono text-sm ${row.scores[p.name] > 0 ? 'text-emerald-400 font-bold' : row.scores[p.name] < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {row.scores[p.name] > 0 ? `+${row.scores[p.name]}` : row.scores[p.name]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {history.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800/40 font-bold border-t-2 border-slate-700">
                  <td className="py-4 text-xs text-blue-400 uppercase tracking-tighter">Sum</td>
                  {players.map(p => (
                    <td key={p.name} className={`py-4 px-1 font-mono text-sm ${p.totalScore >= 0 ? 'text-yellow-400' : 'text-red-500'}`}>
                      {p.totalScore}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
          {history.length === 0 && <p className="text-center text-slate-600 mt-10">No rounds played yet.</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 bg-slate-900 text-white">
      {/* Header */}
      <div className="w-full bg-slate-800/80 p-4 rounded-3xl flex justify-between items-center border border-slate-700">
        <div onClick={() => setMode('HISTORY')} className="active:opacity-50 cursor-pointer">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Leading</p>
          <p className="text-lg font-black text-yellow-400">{getOverallWinner().name} • {getOverallWinner().totalScore}</p>
        </div>
        <button onClick={resetTournament} className="text-[10px] font-bold bg-slate-700 px-4 py-2 rounded-xl">RESTART</button>
      </div>

      {/* Timer Section - Pure Countdown */}
      <div className="flex flex-col items-center w-full">
        <div className={`text-[120px] font-mono tabular-nums leading-none tracking-tighter ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {timeLeft.toFixed(1)}
        </div>
      </div>

      {/* Action Buttons Container */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <button onClick={handleNextPlayer} className="h-20 bg-blue-600 rounded-2xl text-2xl font-black active:bg-blue-700 border border-blue-400 transition-colors">
          NEXT PLAYER
        </button>
        <div className="flex gap-3 h-16">
            <button onClick={() => setIsActive(!isActive)} className={`flex-1 rounded-2xl text-lg font-bold transition-colors ${isActive ? 'bg-orange-600' : 'bg-emerald-600'}`}>
                {isActive ? 'STOP' : (timeLeft < 60 ? 'RESUME' : 'START')}
            </button>
            <button onClick={() => { setIsActive(false); setTimeLeft(60); }} className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-2xl text-lg font-bold">
                RESET
            </button>
        </div>
        <div className="flex justify-between px-2 pt-2">
          <button onClick={() => setMode('HISTORY')} className="text-slate-500 font-bold text-xs uppercase tracking-widest active:text-blue-400 transition-colors">History</button>
          <button onClick={() => { setIsActive(false); setMode('SCORING'); }} className="text-slate-500 font-bold text-xs uppercase tracking-widest active:text-emerald-400 transition-colors">Score Round</button>
        </div>
      </div>
    </main>
  );
}