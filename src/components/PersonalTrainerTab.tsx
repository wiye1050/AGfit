import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Info,
  Minus,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Timer,
  Trophy,
} from 'lucide-react';
import {
  DayId,
  DayPlan,
  ExerciseItem,
  PadelMatchLog,
  ProfileView,
  RunningLog,
  SetProgress,
  TrainingType,
  UserTrainingHistoryEntry,
} from '../types';
import {
  DIRECTED_CLASSES_CATALOG,
  OUTDOOR_ACTIVITIES_CATALOG,
  RUNNING_TEMPLATES,
  WORKOUT_SESSIONS,
} from '../data/workouts';

interface PersonalTrainerTabProps {
  selectedDay: DayPlan;
  profileView: ProfileView;
  onSyncTrainingToDay: (
    dayId: DayId,
    athlete: 'guille' | 'alba',
    training: TrainingType,
    extraClass?: string,
    customAct?: { name: string; durationMin: number; intensity: 'suave' | 'media' | 'alta' }
  ) => void;
  setProgressMap: Record<string, SetProgress[]>;
  onUpdateSetProgress: (
    exerciseKey: string,
    setIndex: number,
    updater: (prev: SetProgress) => SetProgress,
    defaultRestSec: number
  ) => void;
  swappedExerciseMap: Record<string, number>;
  onSwapExerciseAlternative: (exerciseId: string, maxAlts: number) => void;
  customExercisesBySession: Record<string, ExerciseItem[]>;
  onAddCustomExercise: (sessionId: string, exercise: ExerciseItem) => void;
  padelLogs: PadelMatchLog[];
  onAddPadelLog: (log: Omit<PadelMatchLog, 'id'>) => void;
  runningLogs: RunningLog[];
  onAddRunningLog: (log: Omit<RunningLog, 'id'>) => void;
  trainingHistory: UserTrainingHistoryEntry[];
  onAddTrainingHistory: (entry: Omit<UserTrainingHistoryEntry, 'id'>) => void;
}

type ActiveModuleTab =
  | 'empuje'
  | 'tiron'
  | 'pierna'
  | 'padel'
  | 'running'
  | 'movilidad'
  | 'clase_dirigida'
  | 'otra_actividad'
  | 'progreso';

const MODULE_LABELS: Record<ActiveModuleTab, string> = {
  empuje: '🏋️ Empuje (Pecho, Hombro, Tríceps)',
  tiron: '💪 Tirón (Espalda, Bíceps, Core)',
  pierna: '🦵 Pierna & Glúteo',
  padel: '🎾 Partido de Pádel',
  running: '🏃 Running Oviedo',
  movilidad: '🧘 Movilidad & Fisio Pádel',
  clase_dirigida: '🧘‍♀️ Clases Dirigidas Enjoy',
  otra_actividad: '⛰️ Ruta / Otro Deporte',
  progreso: '🏆 Historial y Récords',
};

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
  profileView,
  onSyncTrainingToDay,
  setProgressMap,
  onUpdateSetProgress,
  swappedExerciseMap,
  onSwapExerciseAlternative,
  padelLogs,
  onAddPadelLog,
  runningLogs,
  onAddRunningLog,
  trainingHistory,
  onAddTrainingHistory,
}) => {
  const activeAthlete: 'guille' | 'alba' =
    profileView === 'alba' ? 'alba' : 'guille';

  const [activeModule, setActiveModule] = useState<ActiveModuleTab>('empuje');
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [expandedExId, setExpandedExId] = useState<string>('emp_1');
  const [showPhysioTipId, setShowPhysioTipId] = useState<string | null>(null);

  // Dynamic Island Timer
  const [timerSeconds, setTimerSeconds] = useState<number>(90);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Padel / Running / Outdoor minimal state
  const [padelDuration, setPadelDuration] = useState<60 | 90 | 120>(90);
  const [padelScore, setPadelScore] = useState('6-4 / 6-3');
  const [runDistanceKm, setRunDistanceKm] = useState(7.5);
  const [runDurationMin, setRunDurationMin] = useState(42);
  const [outdoorName, setOutdoorName] = useState(OUTDOOR_ACTIVITIES_CATALOG[0].name);
  const [outdoorDurationMin, setOutdoorDurationMin] = useState(120);
  const [outdoorIntensity, setOutdoorIntensity] = useState<'suave' | 'media' | 'alta'>('media');

  // Auto-select today's scheduled workout for the athlete
  useEffect(() => {
    const scheduled =
      activeAthlete === 'guille'
        ? selectedDay.guilleTraining
        : selectedDay.albaTraining;
    if (scheduled && scheduled !== 'descanso_total') {
      setActiveModule(scheduled as ActiveModuleTab);
    }
  }, [selectedDay.day, activeAthlete, selectedDay.guilleTraining, selectedDay.albaTraining]);

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

  const currentGymSession = WORKOUT_SESSIONS.find((s) => s.type === activeModule);

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
      {/* ========================================================= */}
      {/* 1. COMPACT TOP BAR: ACTIVE WORKOUT + DYNAMIC ISLAND TIMER */}
      {/* ========================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Collapsible Session Switcher Button (Replaces 9-button horizontal wall!) */}
        <button
          type="button"
          onClick={() => setShowSessionPicker((v) => !v)}
          className="apple-card px-4 py-2.5 rounded-2xl inline-flex items-center gap-2.5 text-left cursor-pointer hover:opacity-90"
        >
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Entreno de {activeAthlete === 'guille' ? '🟢 Guille' : '🔴 Alba'} ({selectedDay.label})
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {MODULE_LABELS[activeModule]}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  showSessionPicker ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        </button>

        {/* iPhone Dynamic Island Rest Timer */}
        <div className="bg-black text-white px-4 py-2.5 rounded-full border border-white/15 shadow-lg inline-flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Timer
              className={`w-4 h-4 ${
                timerRunning ? 'text-[#30D158] animate-spin' : 'text-slate-400'
              }`}
            />
            <span className="font-mono text-base font-black tracking-tight">
              {formatTimer(timerSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => startTimer(60)}
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer"
            >
              60s
            </button>
            <button
              type="button"
              onClick={() => startTimer(90)}
              className="px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer"
            >
              90s
            </button>
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className="w-7 h-7 rounded-full bg-[#30D158] text-black flex items-center justify-center cursor-pointer ml-1"
            >
              {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Session Picker Grid (Only open when user taps to switch workout) */}
      {showSessionPicker && (
        <div className="apple-card rounded-3xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 animate-sheet">
          {(Object.keys(MODULE_LABELS) as ActiveModuleTab[]).map((id) => {
            const active = activeModule === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveModule(id);
                  setShowSessionPicker(false);
                }}
                className={`p-3 rounded-2xl text-xs font-extrabold text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-[#30D158] text-black shadow-sm'
                    : 'bg-slate-100 dark:bg-[#2C2C2E] text-slate-700 dark:text-slate-200'
                }`}
              >
                {MODULE_LABELS[id]}
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ZERO-KEYBOARD GYM WORKOUT (BIG + / - STEPPERS)         */}
      {/* ========================================================= */}
      {currentGymSession && (
        <div className="space-y-3">
          {currentGymSession.exercises.map((exercise, idx) => {
            const isExpanded = expandedExId === exercise.id;
            const altIdx = swappedExerciseMap[exercise.id] || 0;
            const activeAlt =
              altIdx > 0 && exercise.alternatives[altIdx - 1]
                ? exercise.alternatives[altIdx - 1]
                : null;
            const displayName = activeAlt ? activeAlt.name : exercise.name;

            const progressKey = `${activeAthlete}_${exercise.id}`;
            const defaultWeight =
              activeAthlete === 'guille'
                ? exercise.guilleDefaultWeight
                : exercise.albaDefaultWeight;
            const lastNote =
              activeAthlete === 'guille'
                ? exercise.guilleLastSession
                : exercise.albaLastSession;

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
                className={`apple-card rounded-3xl overflow-hidden transition-all ${
                  isExpanded
                    ? 'ring-2 ring-[#30D158]/70 shadow-md'
                    : allDone
                    ? 'opacity-65'
                    : ''
                }`}
              >
                {/* Exercise Accordion Header */}
                <button
                  type="button"
                  onClick={() => setExpandedExId(isExpanded ? '' : exercise.id)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${
                        allDone
                          ? 'bg-[#30D158] text-black'
                          : isExpanded
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                          : 'apple-pill-surface text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {allDone ? '✓' : idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                        {displayName}
                      </h3>
                      <p className="text-xs font-semibold text-slate-400">
                        Meta: {exercise.sets} × {exercise.reps} · Último: {lastNote}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                        allDone
                          ? 'bg-[#30D158]/20 text-[#30D158]'
                          : 'apple-pill-surface text-slate-600 dark:text-slate-300'
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

                {/* Expanded Sets with Big Thumb Steppers (- / +) */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 space-y-3 border-t border-black/5 dark:border-white/5">
                    {/* Machine Swap & Physio Note Row */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShowPhysioTipId(
                            showPhysioTipId === exercise.id ? null : exercise.id
                          )
                        }
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A84FF] cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Nota Fisio Pádel</span>
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold apple-pill-surface text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-[#30D158]" />
                          <span>Máquina ocupada ⇄ Cambiar</span>
                        </button>
                      )}
                    </div>

                    {showPhysioTipId === exercise.id && (
                      <div className="p-3 rounded-2xl bg-[#0A84FF]/10 text-xs font-medium text-[#0A84FF] leading-relaxed">
                        🩺 {exercise.padelTransferNote}
                      </div>
                    )}

                    {/* ZERO-KEYBOARD SET CARDS */}
                    <div className="space-y-2.5">
                      {setsList.map((setItem, sIdx) => (
                        <div
                          key={sIdx}
                          className={`p-3 rounded-2xl flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 transition-all ${
                            setItem.completed
                              ? 'bg-[#30D158]/15 border border-[#30D158]/40'
                              : 'bg-slate-100 dark:bg-[#2C2C2E]'
                          }`}
                        >
                          {/* Set Number */}
                          <span className="text-xs font-extrabold uppercase text-slate-400 w-14 shrink-0">
                            Serie {sIdx + 1}
                          </span>

                          {/* Weight Stepper (-2.5 / +2.5) */}
                          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1C1C1E] px-2 py-1.5 rounded-xl">
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
                              className="w-7 h-7 rounded-lg apple-pill-surface flex items-center justify-center text-slate-600 dark:text-slate-200 active:scale-95 cursor-pointer"
                              aria-label="Bajar peso"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="min-w-[78px] text-center text-sm font-black text-slate-900 dark:text-white">
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
                              className="w-7 h-7 rounded-lg apple-pill-surface flex items-center justify-center text-slate-600 dark:text-slate-200 active:scale-95 cursor-pointer"
                              aria-label="Subir peso"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Reps Stepper (-1 / +1) */}
                          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1C1C1E] px-2 py-1.5 rounded-xl">
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
                              className="w-7 h-7 rounded-lg apple-pill-surface flex items-center justify-center text-slate-600 dark:text-slate-200 active:scale-95 cursor-pointer"
                              aria-label="Menos repeticiones"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="min-w-[56px] text-center text-sm font-black text-slate-900 dark:text-white">
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
                              className="w-7 h-7 rounded-lg apple-pill-surface flex items-center justify-center text-slate-600 dark:text-slate-200 active:scale-95 cursor-pointer"
                              aria-label="Más repeticiones"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Big Thumb "HECHO" Button */}
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
                                // Auto-advance to next exercise if all sets of this exercise are now completed
                                const nextCompletedCount =
                                  setsList.filter((s, i) =>
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
                            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                              setItem.completed
                                ? 'bg-[#30D158] text-black shadow-sm'
                                : 'bg-slate-900 text-white dark:bg-white dark:text-black'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                            <span>{setItem.completed ? 'Hecho' : 'Completar'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Complete Full Session Button at Bottom */}
          <button
            type="button"
            onClick={() => {
              onSyncTrainingToDay(selectedDay.day, activeAthlete, currentGymSession.type);
              onAddTrainingHistory({
                date: `${selectedDay.shortLabel} · Hoy`,
                athlete: activeAthlete,
                type: currentGymSession.type,
                title: currentGymSession.title,
                durationMin: currentGymSession.durationMin,
                kcalBurned:
                  activeAthlete === 'guille'
                    ? currentGymSession.guilleKcalBurn
                    : currentGymSession.albaKcalBurn,
              });
            }}
            className="w-full py-4 rounded-3xl text-sm font-black bg-[#30D158] text-black shadow-md hover:opacity-95 cursor-pointer"
          >
            ✓ Guardar Entreno de Hoy ({currentGymSession.title})
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* PADEL MINIMALIST CARD                                     */}
      {/* ========================================================= */}
      {activeModule === 'padel' && (
        <div className="apple-card rounded-3xl p-6 space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF9F0A]">
              Pádel · Activa Ciclado Alto de Hidratos
            </span>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Partido de Pádel
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([60, 90, 120] as const).map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setPadelDuration(min)}
                className={`py-3.5 rounded-2xl text-sm font-black cursor-pointer ${
                  padelDuration === min
                    ? 'bg-[#FF9F0A] text-black'
                    : 'apple-pill-surface text-slate-500'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>

          <input
            type="text"
            value={padelScore}
            onChange={(e) => setPadelScore(e.target.value)}
            placeholder="Resultado (ej. 6-4 / 6-3)"
            className="w-full px-4 py-3.5 rounded-2xl text-sm font-bold apple-pill-surface"
          />

          <button
            type="button"
            onClick={() => {
              const kcal = Math.round(
                padelDuration * (activeAthlete === 'guille' ? 7.2 : 5.2)
              );
              onAddPadelLog({
                date: `${selectedDay.label}`,
                athlete: activeAthlete,
                durationMin: padelDuration,
                side: 'reves',
                intensityRpe: 8,
                score: padelScore,
                notes: 'Partido completado',
                kcalBurned: kcal,
              });
              onSyncTrainingToDay(selectedDay.day, activeAthlete, 'padel');
            }}
            className="w-full py-4 rounded-2xl text-sm font-black bg-[#FF9F0A] text-black cursor-pointer"
          >
            ✓ Guardar Partido ({selectedDay.label})
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* RUNNING MINIMALIST CARD                                   */}
      {/* ========================================================= */}
      {activeModule === 'running' && (
        <div className="apple-card rounded-3xl p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            {RUNNING_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setRunDistanceKm(tpl.defaultDistanceKm);
                  setRunDurationMin(tpl.defaultDurationMin);
                }}
                className="px-3.5 py-2 rounded-2xl text-xs font-extrabold apple-pill-surface hover:opacity-80 cursor-pointer"
              >
                🏃 {tpl.name.split('(')[0]} ({tpl.defaultDistanceKm}km)
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 block">Distancia</span>
                <span className="text-2xl font-black">{runDistanceKm} km</span>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setRunDistanceKm((d) => Math.round((d + 0.5) * 10) / 10)}
                  className="w-8 h-8 rounded-lg apple-pill-surface flex items-center justify-center font-bold cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRunDistanceKm((d) => Math.max(1, Math.round((d - 0.5) * 10) / 10))
                  }
                  className="w-8 h-8 rounded-lg apple-pill-surface flex items-center justify-center font-bold cursor-pointer"
                >
                  −
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 block">Tiempo</span>
                <span className="text-2xl font-black">{runDurationMin} min</span>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setRunDurationMin((m) => m + 5)}
                  className="w-8 h-8 rounded-lg apple-pill-surface flex items-center justify-center font-bold cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setRunDurationMin((m) => Math.max(5, m - 5))}
                  className="w-8 h-8 rounded-lg apple-pill-surface flex items-center justify-center font-bold cursor-pointer"
                >
                  −
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const kcal = Math.round(
                runDistanceKm * (activeAthlete === 'guille' ? 85 : 53) * 1.03
              );
              onAddRunningLog({
                date: selectedDay.label,
                athlete: activeAthlete,
                templateId: 'zona2',
                distanceKm: runDistanceKm,
                durationMin: runDurationMin,
                rpe: 7,
                notes: `${runDistanceKm} km en ${runDurationMin} min`,
                kcalBurned: kcal,
              });
              onSyncTrainingToDay(selectedDay.day, activeAthlete, 'running');
            }}
            className="w-full py-4 rounded-2xl text-sm font-black bg-[#0A84FF] text-white cursor-pointer"
          >
            ✓ Guardar Carrera ({selectedDay.label})
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* CLASES DIRIGIDAS ENJOY                                    */}
      {/* ========================================================= */}
      {activeModule === 'clase_dirigida' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DIRECTED_CLASSES_CATALOG.map((cls) => {
            const isSelected = selectedDay.albaDirectedClass === cls.name;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() =>
                  onSyncTrainingToDay(
                    selectedDay.day,
                    activeAthlete,
                    'clase_dirigida',
                    cls.name
                  )
                }
                className={`apple-card rounded-3xl p-5 text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected ? 'ring-2 ring-[#FF2D55]' : ''
                }`}
              >
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {cls.name}
                  </h4>
                  <p className="text-xs font-semibold text-slate-400">
                    {cls.durationMin} min · ~
                    {activeAthlete === 'guille' ? cls.guilleKcal : cls.albaKcal} kcal
                  </p>
                </div>
                <span className="px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-[#FF2D55] text-white">
                  {isSelected ? '✓ Activa' : 'Elegir'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* OTRA ACTIVIDAD / OUTDOOR ASTURIAS                         */}
      {/* ========================================================= */}
      {activeModule === 'otra_actividad' && (
        <div className="apple-card rounded-3xl p-6 space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Ruta, Escalada, Fútbol u otro deporte
          </h3>
          <div className="flex flex-wrap gap-2">
            {OUTDOOR_ACTIVITIES_CATALOG.map((act) => (
              <button
                key={act.id}
                type="button"
                onClick={() => {
                  setOutdoorName(act.name);
                  setOutdoorDurationMin(act.defaultDurationMin);
                  setOutdoorIntensity(act.defaultIntensity);
                }}
                className={`px-3.5 py-2 rounded-full text-xs font-extrabold cursor-pointer ${
                  outdoorName === act.name
                    ? 'bg-[#30D158] text-black'
                    : 'apple-pill-surface text-slate-500'
                }`}
              >
                {act.name.split('(')[0]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              onSyncTrainingToDay(
                selectedDay.day,
                activeAthlete,
                'otra_actividad',
                undefined,
                {
                  name: outdoorName,
                  durationMin: outdoorDurationMin,
                  intensity: outdoorIntensity,
                }
              )
            }
            className="w-full py-4 rounded-2xl text-sm font-black bg-[#30D158] text-black cursor-pointer"
          >
            ✓ Asignar {outdoorName.split('(')[0]} a {selectedDay.label}
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* RÉCORDS Y RESUMEN                                         */}
      {/* ========================================================= */}
      {activeModule === 'progreso' && (
        <div className="apple-card rounded-3xl p-5 space-y-3">
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FF9F0A]" />
            <span>Historial Reciente</span>
          </h3>
          {trainingHistory.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] text-xs"
            >
              <div>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {h.title}
                </span>
                <p className="text-slate-400">
                  {h.athlete.toUpperCase()} · {h.date}
                </p>
              </div>
              <span className="font-black text-[#30D158]">{h.kcalBurned} kcal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
