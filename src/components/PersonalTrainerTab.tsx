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
  ExerciseItem,
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
  customExercisesBySession?: Record<string, ExerciseItem[]>;
  onAddCustomExercise?: (sessionId: string, exercise: ExerciseItem) => void;
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
  customExercisesBySession = {},
  onAddCustomExercise,
}) => {
  const isGuille = activeUser === 'guille';
  const [activeModule, setActiveModule] = useState<GymModule>('empuje');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('ses_empuje');
  const [expandedExId, setExpandedExId] = useState<string>('emp_1');
  const [showPhysioTipId, setShowPhysioTipId] = useState<string | null>(null);

  // Add custom exercise form state
  const [showAddExerciseForm, setShowAddExerciseForm] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('Pectoral / Espalda / Pierna');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState('10 - 12');
  const [newExWeight, setNewExWeight] = useState('20 kg');

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
      if (selectedDay.sessionVariantId) {
        const matchVariant = WORKOUT_SESSIONS.find(
          (s) => s.id === selectedDay.sessionVariantId
        );
        if (matchVariant) {
          setSelectedSessionId(matchVariant.id);
          return;
        }
      }
      const defaultForModule = WORKOUT_SESSIONS.find((s) => s.type === scheduled);
      if (defaultForModule) setSelectedSessionId(defaultForModule.id);
    }
  }, [
    selectedDay.day,
    isGuille,
    selectedDay.guilleTraining,
    selectedDay.albaTraining,
    selectedDay.sessionVariantId,
  ]);

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

  // All variants available for the chosen module (plus Full Body Express on strength modules)
  const moduleVariants = WORKOUT_SESSIONS.filter(
    (s) =>
      s.type === activeModule ||
      (activeModule !== 'movilidad' && s.id === 'ses_fullbody_express')
  );

  const currentGymSession =
    moduleVariants.find((s) => s.id === selectedSessionId) ||
    moduleVariants[0] ||
    WORKOUT_SESSIONS[0];

  const customExercises = customExercisesBySession[currentGymSession.id] || [];
  const allSessionExercises = [...currentGymSession.exercises, ...customExercises];

  useEffect(() => {
    if (allSessionExercises[0]) {
      setExpandedExId(allSessionExercises[0].id);
    }
  }, [currentGymSession.id]);

  const startTimer = (sec: number) => {
    setTimerSeconds(sec);
    setTimerRunning(true);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCreateExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim() || !onAddCustomExercise) return;
    const ex: ExerciseItem = {
      id: `cust_ex_${Date.now()}`,
      name: newExName.trim(),
      muscleGroup: newExMuscle.trim() || 'General',
      padelTransferNote: 'Ejercicio personalizado añadido a la sesión.',
      sets: Number(newExSets) || 3,
      reps: newExReps.trim() || '10',
      restSeconds: 90,
      targetRir: 'RIR 1-2',
      guilleDefaultWeight: isGuille ? newExWeight : '25 kg',
      albaDefaultWeight: !isGuille ? newExWeight : '10 kg',
      guilleLastSession: 'Nuevo ejercicio',
      albaLastSession: 'Nuevo ejercicio',
      alternatives: [],
    };
    onAddCustomExercise(currentGymSession.id, ex);
    setNewExName('');
    setShowAddExerciseForm(false);
    setExpandedExId(ex.id);
  };

  // Compute total sets completed across the session
  const totalSessionSets = allSessionExercises.reduce(
    (acc, ex) => acc + ex.sets,
    0
  );
  const completedSessionSets = allSessionExercises.reduce((acc, ex) => {
    const list = setProgressMap[`${activeUser}_${ex.id}`] || [];
    return acc + list.filter((s) => s.completed).length;
  }, 0);
  const sessionProgressPct =
    totalSessionSets > 0 ? Math.round((completedSessionSets / totalSessionSets) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ========================================================= */}
      {/* 1. ACTIVE WORKOUT HERO CARD + VARIANTS + REST TIMER       */}
      {/* ========================================================= */}
      <div className="apple-card rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Segmented Session Selector */}
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
                  onClick={() => {
                    setActiveModule(tab.id);
                    const first = WORKOUT_SESSIONS.find((s) => s.type === tab.id);
                    if (first) setSelectedSessionId(first.id);
                  }}
                  className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-white text-slate-900 dark:text-black shadow-sm'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Integrated Performance Rest Timer */}
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900 text-white dark:bg-white/[0.06] dark:border dark:border-white/10 inline-flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  timerRunning ? 'bg-[#30D158] animate-ping' : 'bg-zinc-500'
                }`}
              />
              <span className="font-mono text-sm font-black tracking-tight">
                {formatTimer(timerSeconds)}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => startTimer(60)}
                className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                60s
              </button>
              <button
                type="button"
                onClick={() => startTimer(90)}
                className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                90s
              </button>
              <button
                type="button"
                onClick={() => setTimerRunning((r) => !r)}
                className="w-6 h-6 rounded-full bg-[#30D158] text-black flex items-center justify-center cursor-pointer ml-0.5"
              >
                {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Variant Switcher (Variante A / Variante B / Express 35m) */}
        {moduleVariants.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {moduleVariants.map((variant, vIdx) => {
              const isSelected = currentGymSession.id === variant.id;
              const label =
                variant.variantLabel || `Variante ${vIdx === 0 ? 'A · Base' : 'B'}`;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedSessionId(variant.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-extrabold cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#30D158] text-black'
                      : 'apple-pill-surface text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Session Title & Set Progress Bar */}
        <div className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#30D158] block">
                Enjoy Oviedo · {currentGymSession.durationMin} min · {allSessionExercises.length} ejercicios
              </span>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
                {currentGymSession.title}
              </h1>
            </div>
            <span className="text-xs font-extrabold text-slate-400 shrink-0">
              {completedSessionSets} / {totalSessionSets} series
            </span>
          </div>

          <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#30D158] transition-all duration-500"
              style={{ width: `${sessionProgressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. ACCORDION EXERCISES WITH PERFORMANCE STEPPERS          */}
      {/* ========================================================= */}
      <div className="space-y-2.5">
        {allSessionExercises.map((exercise, idx) => {
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
          const lastRef = isGuille
            ? exercise.guilleLastSession
            : exercise.albaLastSession;

          const setsList: SetProgress[] =
            setProgressMap[progressKey] ||
            Array.from({ length: exercise.sets }, () => ({
              completed: false,
              weight: defaultWeight,
              reps: exercise.reps.includes('-')
                ? exercise.reps.split('-')[1].trim()
                : exercise.reps,
              rir: exercise.targetRir,
            }));

          const completedCount = setsList.filter((s) => s.completed).length;
          const allDone = completedCount === setsList.length;

          return (
            <div
              key={exercise.id}
              className={`apple-card rounded-3xl overflow-hidden transition-all ${
                isExpanded
                  ? 'ring-1 ring-[#30D158]/50'
                  : allDone
                  ? 'opacity-60'
                  : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setExpandedExId(isExpanded ? '' : exercise.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                      allDone
                        ? 'bg-[#30D158] text-black'
                        : isExpanded
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'apple-pill-surface text-slate-400'
                    }`}
                  >
                    {allDone ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                      {displayName}
                    </h3>
                    <p className="text-xs font-medium text-slate-400">
                      {exercise.sets} series × {exercise.reps} · Ant: {lastRef}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                      allDone
                        ? 'bg-[#30D158]/15 text-[#30D158]'
                        : 'apple-pill-surface text-slate-400'
                    }`}
                  >
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
                <div className="px-4 sm:px-5 pb-5 pt-2 space-y-3 border-t border-black/5 dark:border-white/[0.07]">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setShowPhysioTipId(
                          showPhysioTipId === exercise.id ? null : exercise.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-[#30D158]" />
                      <span>Nota biomecánica</span>
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
                        className="px-3 py-1 rounded-full text-xs font-bold apple-pill-surface text-slate-600 dark:text-zinc-300 cursor-pointer"
                      >
                        Cambiar máquina →
                      </button>
                    )}
                  </div>

                  {showPhysioTipId === exercise.id && (
                    <div className="p-3.5 rounded-2xl apple-pill-surface text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                      {exercise.padelTransferNote}
                    </div>
                  )}

                  <div className="space-y-2">
                    {setsList.map((setItem, sIdx) => (
                      <div
                        key={sIdx}
                        className={`p-3 rounded-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 transition-all ${
                          setItem.completed
                            ? 'bg-[#30D158]/10 border border-[#30D158]/30'
                            : 'apple-pill-surface'
                        }`}
                      >
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 w-12 shrink-0 pl-1">
                          S{sIdx + 1}
                        </span>

                        {/* Weight Stepper */}
                        <div className="flex items-center gap-1.5 bg-white dark:bg-[#09090B]/80 px-2 py-1 rounded-xl border border-black/5 dark:border-white/5">
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
                            className="w-7 h-7 rounded-lg apple-pill-surface flex items-center justify-center text-slate-500 dark:text-zinc-300 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="min-w-[76px] text-center text-sm font-extrabold text-slate-900 dark:text-white">
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
                            className="w-7 h-7 rounded-lg apple-pill-surface flex items-center justify-center text-slate-500 dark:text-zinc-300 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Reps Stepper */}
                        <div className="flex items-center gap-1.5 bg-white dark:bg-[#09090B]/80 px-2 py-1 rounded-xl border border-black/5 dark:border-white/5">
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
                            className="w-7 h-7 rounded-lg apple-pill-surface flex items-center justify-center text-slate-500 dark:text-zinc-300 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="min-w-[54px] text-center text-sm font-extrabold text-slate-900 dark:text-white">
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
                            className="w-7 h-7 rounded-lg apple-pill-surface flex items-center justify-center text-slate-500 dark:text-zinc-300 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
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
                                allSessionExercises[idx + 1]
                              ) {
                                setExpandedExId(allSessionExercises[idx + 1].id);
                              }
                            }
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 ${
                            setItem.completed
                              ? 'bg-[#30D158] text-black'
                              : 'bg-slate-900 text-white dark:bg-white dark:text-black'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{setItem.completed ? 'Hecho' : 'Listo'}</span>
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

      {/* ========================================================= */}
      {/* 3. ADD CUSTOM EXERCISE TO SESSION (CLOUD SYNCED)          */}
      {/* ========================================================= */}
      {onAddCustomExercise && (
        <div className="apple-card rounded-3xl p-4">
          {!showAddExerciseForm ? (
            <button
              type="button"
              onClick={() => setShowAddExerciseForm(true)}
              className="w-full py-2 text-xs font-extrabold text-[#30D158] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir ejercicio a esta sesión</span>
            </button>
          ) : (
            <form onSubmit={handleCreateExercise} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Nuevo ejercicio para {currentGymSession.title}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddExerciseForm(false)}
                  className="text-xs text-slate-400 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
              <input
                type="text"
                required
                value={newExName}
                onChange={(e) => setNewExName(e.target.value)}
                placeholder="Nombre del ejercicio (ej. Remo Gironda, Press militar...)"
                className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold apple-pill-surface outline-none"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={newExSets}
                  onChange={(e) => setNewExSets(Number(e.target.value))}
                  placeholder="Series"
                  className="px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                />
                <input
                  type="text"
                  value={newExReps}
                  onChange={(e) => setNewExReps(e.target.value)}
                  placeholder="Reps (ej. 10-12)"
                  className="px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                />
                <input
                  type="text"
                  value={newExWeight}
                  onChange={(e) => setNewExWeight(e.target.value)}
                  placeholder="Peso (ej. 20 kg)"
                  className="px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                />
              </div>
              <input
                type="text"
                value={newExMuscle}
                onChange={(e) => setNewExMuscle(e.target.value)}
                placeholder="Grupo muscular"
                className="w-full px-3 py-2 rounded-xl text-xs font-medium apple-pill-surface outline-none"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-2xl text-xs font-extrabold bg-[#30D158] text-black cursor-pointer"
              >
                Guardar ejercicio en la nube
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
