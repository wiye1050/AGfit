import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Info,
  Minus,
  Pause,
  Play,
  Plus,
} from 'lucide-react';
import {
  DayPlan,
  SetProgress,
} from '../types';
import { WORKOUT_SESSIONS } from '../data/workouts';

interface PersonalTrainerTabProps {
  selectedDay: DayPlan;
  activeUser: 'guille' | 'alba';
  setProgressMap: Record<string, SetProgress[]>;
  onUpdateSetProgress: (
    exerciseKey: string,
    setIndex: number,
    updater: (prev: SetProgress) => SetProgress,
    defaultRestSec: number
  ) => void;
  swappedExerciseMap: Record<string, number>;
  onSwapExerciseAlternative: (exerciseId: string, maxAlts: number) => void;
}

type GymModule = 'empuje' | 'tiron' | 'pierna' | 'movilidad';

function adjustWeightText(current: string, delta: number): string {
  const match = current.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) {
    return `${Math.max(2.5, 20 + delta)} kg`;
  }
  const num = parseFloat(match[1].replace(',', '.'));
  const next = Math.max(0, Math.round((num + delta) * 10) / 10);
  return current.replace(match[1], String(next));
}

function adjustRepsText(current: string, delta: number): string {
  const match = current.match(/(\d+)/g);
  if (!match || match.length === 0) {
    return String(Math.max(1, 10 + delta));
  }
  const base = parseInt(match[match.length - 1], 10);
  return String(Math.max(1, base + delta));
}

function playTimerFinishBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 987.77;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    if ('vibrate' in navigator) navigator.vibrate([180, 80, 180]);
  } catch {
    // ignore
  }
}

export const PersonalTrainerTab: React.FC<PersonalTrainerTabProps> = ({
  selectedDay,
  activeUser,
  setProgressMap,
  onUpdateSetProgress,
  swappedExerciseMap,
  onSwapExerciseAlternative,
}) => {
  const isGuille = activeUser === 'guille';
  const [activeModule, setActiveModule] = useState<GymModule>('empuje');
  const [expandedExId, setExpandedExId] = useState<string>('emp_1');
  const [showPhysioTipId, setShowPhysioTipId] = useState<string | null>(null);

  const [timerSeconds, setTimerSeconds] = useState<number>(90);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    const scheduled = isGuille ? selectedDay.guilleTraining : selectedDay.albaTraining;
    if (
      scheduled === 'empuje' ||
      scheduled === 'tiron' ||
      scheduled === 'pierna' ||
      scheduled === 'movilidad'
    ) {
      setActiveModule(scheduled);
    }
  }, [selectedDay.day, isGuille, selectedDay.guilleTraining, selectedDay.albaTraining]);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          playTimerFinishBeep();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const currentGymSession =
    WORKOUT_SESSIONS.find((s) => s.type === activeModule) || WORKOUT_SESSIONS[0];

  useEffect(() => {
    if (currentGymSession && currentGymSession.exercises[0]) {
      setExpandedExId(currentGymSession.exercises[0].id);
    }
  }, [activeModule, currentGymSession]);

  const startTimer = (sec: number) => {
    setTimerSeconds(sec);
    setTimerRunning(true);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Routine Selector + Rest Timer */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs">
          {(
            [
              { id: 'empuje', label: 'Empuje' },
              { id: 'tiron', label: 'Tirón' },
              { id: 'pierna', label: 'Pierna' },
              { id: 'movilidad', label: 'Movilidad' },
            ] as Array<{ id: GymModule; label: string }>
          ).map((tab) => {
            const active = activeModule === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveModule(tab.id)}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Clean Rest Timer */}
        <div className="apple-card px-3.5 py-1.5 rounded-full inline-flex items-center gap-2.5">
          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
            {formatTimer(timerSeconds)}
          </span>
          <div className="flex items-center gap-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => startTimer(60)}
              className="px-2 py-0.5 rounded-full apple-pill-surface text-slate-500 cursor-pointer"
            >
              60s
            </button>
            <button
              type="button"
              onClick={() => startTimer(90)}
              className="px-2 py-0.5 rounded-full apple-pill-surface text-slate-500 cursor-pointer"
            >
              90s
            </button>
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className="w-6 h-6 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black flex items-center justify-center cursor-pointer ml-0.5"
            >
              {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Accordion Exercises */}
      <div className="space-y-2.5">
        {currentGymSession.exercises.map((exercise, idx) => {
          const isExpanded = expandedExId === exercise.id;
          const altIdx = swappedExerciseMap[exercise.id] || 0;
          const activeAlt =
            altIdx > 0 && exercise.alternatives[altIdx - 1]
              ? exercise.alternatives[altIdx - 1]
              : null;
          const displayName = activeAlt ? activeAlt.name : exercise.name;

          const progressKey = `${activeUser}_${exercise.id}`;
          const defaultWeight = isGuille
            ? exercise.guilleDefaultWeight
            : exercise.albaDefaultWeight;

          const setsList: SetProgress[] =
            setProgressMap[progressKey] ||
            Array.from({ length: exercise.sets }, () => ({
              completed: false,
              weight: defaultWeight,
              reps: exercise.reps.includes('-')
                ? exercise.reps.split('-')[1]
                : exercise.reps,
              rir: exercise.targetRir,
            }));

          const completedCount = setsList.filter((s) => s.completed).length;
          const allDone = completedCount === setsList.length;

          return (
            <div
              key={exercise.id}
              className={`apple-card rounded-2xl overflow-hidden transition-opacity ${
                allDone && !isExpanded ? 'opacity-55' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedExId(isExpanded ? '' : exercise.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      allDone
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'apple-pill-surface text-slate-500'
                    }`}
                  >
                    {allDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {displayName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {exercise.sets} series × {exercise.reps}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-medium text-slate-400">
                    {completedCount}/{setsList.length}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 sm:px-5 pb-5 pt-2 space-y-3 border-t border-black/5 dark:border-white/5">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setShowPhysioTipId(
                          showPhysioTipId === exercise.id ? null : exercise.id
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Nota técnica</span>
                    </button>

                    {exercise.alternatives.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onSwapExerciseAlternative(
                            exercise.id,
                            exercise.alternatives.length
                          )
                        }
                        className="text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                      >
                        Cambiar variante →
                      </button>
                    )}
                  </div>

                  {showPhysioTipId === exercise.id && (
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {exercise.padelTransferNote}
                    </div>
                  )}

                  <div className="space-y-2">
                    {setsList.map((setItem, sIdx) => (
                      <div
                        key={sIdx}
                        className={`p-2.5 rounded-xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 transition-all ${
                          setItem.completed
                            ? 'bg-black/[0.04] dark:bg-white/[0.08]'
                            : 'bg-slate-100 dark:bg-[#2C2C2E]'
                        }`}
                      >
                        <span className="text-xs font-medium text-slate-400 w-12 shrink-0 pl-1">
                          S{sIdx + 1}
                        </span>

                        {/* Weight Stepper */}
                        <div className="flex items-center gap-1 bg-white dark:bg-[#1C1C1E] px-1.5 py-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSetProgress(
                                progressKey,
                                sIdx,
                                (prev) => ({
                                  ...prev,
                                  weight: adjustWeightText(prev.weight, -2.5),
                                }),
                                exercise.restSeconds
                              )
                            }
                            className="w-6 h-6 rounded apple-pill-surface flex items-center justify-center text-slate-500 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="min-w-[72px] text-center text-xs font-bold text-slate-900 dark:text-white">
                            {setItem.weight}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSetProgress(
                                progressKey,
                                sIdx,
                                (prev) => ({
                                  ...prev,
                                  weight: adjustWeightText(prev.weight, 2.5),
                                }),
                                exercise.restSeconds
                              )
                            }
                            className="w-6 h-6 rounded apple-pill-surface flex items-center justify-center text-slate-500 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Reps Stepper */}
                        <div className="flex items-center gap-1 bg-white dark:bg-[#1C1C1E] px-1.5 py-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSetProgress(
                                progressKey,
                                sIdx,
                                (prev) => ({
                                  ...prev,
                                  reps: adjustRepsText(prev.reps, -1),
                                }),
                                exercise.restSeconds
                              )
                            }
                            className="w-6 h-6 rounded apple-pill-surface flex items-center justify-center text-slate-500 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="min-w-[52px] text-center text-xs font-bold text-slate-900 dark:text-white">
                            {setItem.reps} reps
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSetProgress(
                                progressKey,
                                sIdx,
                                (prev) => ({
                                  ...prev,
                                  reps: adjustRepsText(prev.reps, 1),
                                }),
                                exercise.restSeconds
                              )
                            }
                            className="w-6 h-6 rounded apple-pill-surface flex items-center justify-center text-slate-500 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Complete Set Button */}
                        <button
                          type="button"
                          onClick={() => {
                            const nextDone = !setItem.completed;
                            onUpdateSetProgress(
                              progressKey,
                              sIdx,
                              (prev) => ({ ...prev, completed: nextDone }),
                              exercise.restSeconds
                            );
                            if (nextDone) {
                              startTimer(exercise.restSeconds);
                              const nextCompletedCount = setsList.filter((s, i) =>
                                i === sIdx ? nextDone : s.completed
                              ).length;
                              if (
                                nextCompletedCount === setsList.length &&
                                currentGymSession.exercises[idx + 1]
                              ) {
                                setExpandedExId(currentGymSession.exercises[idx + 1].id);
                              }
                            }
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            setItem.completed
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                              : 'apple-pill-surface text-slate-400'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
