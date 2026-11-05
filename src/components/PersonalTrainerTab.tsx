import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Award,
  Check,
  Clock,
  Dumbbell,
  Flame,
  HeartPulse,
  Lock,
  Mountain,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  Unlock,
  Volume2,
  Zap,
} from 'lucide-react';
import {
  DayId,
  DayPlan,
  ExerciseItem,
  PadelMatchLog,
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
  | 'movilidad'
  | 'padel'
  | 'running'
  | 'clase_dirigida'
  | 'otra_actividad'
  | 'progreso';

function playTimerFinishBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };
    playTone(880, 0, 0.18);
    playTone(1046.5, 0.22, 0.18);
    playTone(1318.5, 0.44, 0.32);
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 250]);
    }
  } catch {
    // AudioContext blocked or unsupported
  }
}

export const PersonalTrainerTab: React.FC<PersonalTrainerTabProps> = ({
  selectedDay,
  onSyncTrainingToDay,
  setProgressMap,
  onUpdateSetProgress,
  swappedExerciseMap,
  onSwapExerciseAlternative,
  customExercisesBySession,
  onAddCustomExercise,
  padelLogs,
  onAddPadelLog,
  runningLogs,
  onAddRunningLog,
  trainingHistory,
  onAddTrainingHistory,
}) => {
  const [activeAthlete, setActiveAthlete] = useState<'guille' | 'alba'>('guille');
  const [activeModule, setActiveModule] = useState<ActiveModuleTab>('empuje');

  // Rest Timer State
  const [timerSeconds, setTimerSeconds] = useState<number>(90);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [autoStartTimer, setAutoStartTimer] = useState<boolean>(true);
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Add Custom Exercise Modal State
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('Pectoral / Hombro');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState('10 - 12');
  const [newExWeight, setNewExWeight] = useState('20 kg');
  const [newExNote, setNewExNote] = useState('Controlar fase excéntrica 2 segundos.');

  // Padel Match Form State
  const [padelDuration, setPadelDuration] = useState<60 | 90 | 120>(90);
  const [padelSide, setPadelSide] = useState<'reves' | 'drive'>('reves');
  const [padelRpe, setPadelRpe] = useState(8);
  const [padelScore, setPadelScore] = useState('6-4 / 6-3');
  const [padelNotes, setPadelNotes] = useState('Buena activación de manguito rotador previa; sin sobrecarga en gemelo.');
  const [padelWarmupChecks, setPadelWarmupChecks] = useState<Record<number, boolean>>({});

  // Running Form State
  const [runTemplateId, setRunTemplateId] = useState<'zona2' | 'series_padel' | 'tirada_larga'>('zona2');
  const [runDistanceKm, setRunDistanceKm] = useState(7.5);
  const [runDurationMin, setRunDurationMin] = useState(42);
  const [runRpe, setRunRpe] = useState(7);
  const [runNotes, setRunNotes] = useState('Ritmo cómodo constante en Oviedo.');

  // Outdoor / Other Activity Form State
  const [outdoorName, setOutdoorName] = useState(OUTDOOR_ACTIVITIES_CATALOG[0].name);
  const [outdoorDurationMin, setOutdoorDurationMin] = useState(120);
  const [outdoorIntensity, setOutdoorIntensity] = useState<'suave' | 'media' | 'alta'>('media');
  const [outdoorNotes, setOutdoorNotes] = useState('');

  // Timer Effect
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

  // Screen Wake Lock Toggle
  const toggleWakeLock = async () => {
    if (wakeLockActive && wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
      return;
    }
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockActive(true);
      } else {
        setWakeLockActive((v) => !v);
      }
    } catch {
      setWakeLockActive((v) => !v);
    }
  };

  const triggerRestTimer = (seconds: number) => {
    setTimerSeconds(seconds);
    setTimerRunning(true);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentGymSession = WORKOUT_SESSIONS.find((s) => s.type === activeModule);

  const handleSetCheck = (
    exercise: ExerciseItem,
    setIdx: number,
    currentSet: SetProgress
  ) => {
    const key = `${activeAthlete}_${exercise.id}`;
    const nextCompleted = !currentSet.completed;
    onUpdateSetProgress(
      key,
      setIdx,
      (prev) => ({ ...prev, completed: nextCompleted }),
      exercise.restSeconds
    );
    if (nextCompleted && autoStartTimer) {
      triggerRestTimer(exercise.restSeconds);
    }
  };

  const handleCreateCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentGymSession || !newExName.trim()) return;
    const ex: ExerciseItem = {
      id: `custom_ex_${Date.now()}`,
      name: newExName.trim(),
      muscleGroup: newExMuscle.trim(),
      padelTransferNote: newExNote.trim(),
      sets: Number(newExSets) || 3,
      reps: newExReps,
      restSeconds: 90,
      targetRir: 'RIR 1-2',
      guilleDefaultWeight: newExWeight,
      albaDefaultWeight: newExWeight,
      guilleLastSession: 'Nuevo ejercicio añadido',
      albaLastSession: 'Nuevo ejercicio añadido',
      alternatives: [],
    };
    onAddCustomExercise(currentGymSession.id, ex);
    setNewExName('');
    setShowAddExercise(false);
  };

  const handleSaveWorkoutToHistory = () => {
    if (!currentGymSession) return;
    const kcal =
      activeAthlete === 'guille'
        ? currentGymSession.guilleKcalBurn
        : currentGymSession.albaKcalBurn;
    onAddTrainingHistory({
      date: `${selectedDay.shortLabel} · Hoy`,
      athlete: activeAthlete,
      type: currentGymSession.type,
      title: currentGymSession.title,
      durationMin: currentGymSession.durationMin,
      kcalBurned: kcal,
      highlightPr: `Sesión completada en Enjoy Oviedo (${currentGymSession.exercises.length} ejercicios)`,
    });
    onSyncTrainingToDay(selectedDay.day, activeAthlete, currentGymSession.type);
  };

  const handleLogPadelMatch = (e: React.FormEvent) => {
    e.preventDefault();
    const baseRate = activeAthlete === 'guille' ? 7.1 : 5.2;
    const intensityMultiplier = 0.8 + padelRpe * 0.03;
    const kcalBurned = Math.round(padelDuration * baseRate * intensityMultiplier);

    onAddPadelLog({
      date: `${selectedDay.label} · Hoy`,
      athlete: activeAthlete,
      durationMin: padelDuration,
      side: padelSide,
      intensityRpe: padelRpe,
      score: padelScore,
      notes: padelNotes,
      kcalBurned,
    });

    onAddTrainingHistory({
      date: `${selectedDay.shortLabel} · Hoy`,
      athlete: activeAthlete,
      type: 'padel',
      title: `Partido de Pádel (${padelDuration} min · ${padelSide.toUpperCase()})`,
      durationMin: padelDuration,
      kcalBurned,
      highlightPr: `Resultado: ${padelScore} · RPE ${padelRpe}/10`,
      notes: padelNotes,
    });

    onSyncTrainingToDay(selectedDay.day, activeAthlete, 'padel');
  };

  const handleLogRunning = (e: React.FormEvent) => {
    e.preventDefault();
    const bodyWeight = activeAthlete === 'guille' ? 85 : 53;
    const kcalBurned = Math.round(runDistanceKm * bodyWeight * 1.03);
    const paceMinPerKm = runDistanceKm > 0 ? runDurationMin / runDistanceKm : 0;
    const paceMin = Math.floor(paceMinPerKm);
    const paceSec = Math.round((paceMinPerKm - paceMin) * 60);
    const paceStr = `${paceMin}:${String(paceSec).padStart(2, '0')} min/km`;

    onAddRunningLog({
      date: `${selectedDay.label} · Hoy`,
      athlete: activeAthlete,
      templateId: runTemplateId,
      distanceKm: runDistanceKm,
      durationMin: runDurationMin,
      rpe: runRpe,
      notes: `${runNotes} (Ritmo medio: ${paceStr})`,
      kcalBurned,
    });

    onAddTrainingHistory({
      date: `${selectedDay.shortLabel} · Hoy`,
      athlete: activeAthlete,
      type: 'running',
      title: `Running Oviedo · ${runDistanceKm} km (${paceStr})`,
      durationMin: runDurationMin,
      kcalBurned,
      highlightPr: `${runDistanceKm} km en ${runDurationMin} min (${paceStr})`,
      notes: runNotes,
    });

    onSyncTrainingToDay(selectedDay.day, activeAthlete, 'running');
  };

  const handleLogOutdoorActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const mult = outdoorIntensity === 'alta' ? 7.8 : outdoorIntensity === 'media' ? 5.8 : 4.2;
    const athleteFactor = activeAthlete === 'guille' ? 1.0 : 0.72;
    const kcalBurned = Math.round(outdoorDurationMin * mult * athleteFactor);

    onAddTrainingHistory({
      date: `${selectedDay.shortLabel} · Hoy`,
      athlete: activeAthlete,
      type: 'otra_actividad',
      title: `${outdoorName} (${outdoorDurationMin} min)`,
      durationMin: outdoorDurationMin,
      kcalBurned,
      highlightPr: `Intensidad ${outdoorIntensity.toUpperCase()} · ${kcalBurned} kcal`,
      notes: outdoorNotes,
    });

    onSyncTrainingToDay(selectedDay.day, activeAthlete, 'otra_actividad', undefined, {
      name: outdoorName,
      durationMin: outdoorDurationMin,
      intensity: outdoorIntensity,
    });
  };

  const calculatedPace = (() => {
    if (!runDistanceKm || runDistanceKm <= 0) return '0:00';
    const ratio = runDurationMin / runDistanceKm;
    const m = Math.floor(ratio);
    const s = Math.round((ratio - m) * 60);
    return `${m}:${String(s).padStart(2, '0')} min/km`;
  })();

  return (
    <div className="space-y-5">
      {/* Top Sticky Gym Bar: Athlete Selector + Rest Timer (60/90/120s) + Screen Wake Lock */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Athlete Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActiveAthlete('guille')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeAthlete === 'guille'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-emerald-400'
              }`}
            >
              🏋️‍♂️ Perfil Entreno GUILLE (85 kg)
            </button>
            <button
              type="button"
              onClick={() => setActiveAthlete('alba')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeAthlete === 'alba'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-rose-400'
              }`}
            >
              🧘‍♀️ Perfil Entreno ALBA (53 kg)
            </button>
          </div>

          <button
            type="button"
            onClick={toggleWakeLock}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              wakeLockActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Evita que la pantalla del móvil se apague mientras entrenas en el Enjoy Oviedo"
          >
            {wakeLockActive ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{wakeLockActive ? 'Pantalla Fija Activa' : 'Mantener Pantalla Encendida'}</span>
          </button>
        </div>

        {/* Integrated Rest Stopwatch / Countdown (60s / 90s / 120s) */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-950 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <Timer
              className={`w-4 h-4 ${
                timerRunning ? 'text-emerald-400 animate-spin' : 'text-slate-400'
              }`}
            />
            <span
              className={`font-mono text-lg font-black tracking-tight ${
                timerSeconds <= 10 && timerRunning
                  ? 'text-rose-500 animate-pulse'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {formatTimer(timerSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {[60, 90, 120].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => triggerRestTimer(sec)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 transition-all cursor-pointer"
              >
                {sec}s
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTimerSeconds((s) => Math.max(0, s + 15))}
              className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              +15s
            </button>
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className={`p-2 rounded-xl text-xs font-bold cursor-pointer ${
                timerRunning
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-500 text-slate-950'
              }`}
              title={timerRunning ? 'Pausar cronómetro' : 'Iniciar cronómetro'}
            >
              {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(90);
              }}
              className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Reiniciar a 90s"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 px-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoStartTimer}
              onChange={(e) => setAutoStartTimer(e.target.checked)}
              className="rounded"
            />
            <span>Auto al marcar [✓]</span>
          </label>
        </div>
      </div>

      {/* Session / Module Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'empuje', label: '1. Empuje (Push)', icon: '🏋️‍♂️' },
          { id: 'tiron', label: '2. Tirón (Pull)', icon: '💪' },
          { id: 'pierna', label: '3. Pierna (Legs)', icon: '🦵' },
          { id: 'padel', label: '4. Partido de Pádel', icon: '🎾' },
          { id: 'running', label: '5. Running Oviedo', icon: '🏃‍♂️' },
          { id: 'movilidad', label: '6. Descanso / Movilidad Pádel', icon: '🧘‍♂️' },
          { id: 'clase_dirigida', label: '7. Clases Dirigidas (Pilates/GAP...)', icon: '🤸‍♀️' },
          { id: 'otra_actividad', label: '8. Otra Actividad / Ruta / Escalada', icon: '⛰️' },
          { id: 'progreso', label: '🏆 Historial & Récords (PRs)', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveModule(tab.id as ActiveModuleTab)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap border transition-all cursor-pointer ${
              activeModule === tab.id
                ? activeAthlete === 'guille'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500 shadow-sm'
                  : 'bg-rose-500 text-white border-rose-500 shadow-sm'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========================================================= */}
      {/* MODULE A: GYM SESSIONS (EMPUJE, TIRÓN, PIERNA, MOVILIDAD) */}
      {/* ========================================================= */}
      {currentGymSession && (
        <div className="space-y-4">
          {/* Session Overview Banner */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  {activeAthlete === 'guille' ? 'Atleta: GUILLE' : 'Atleta: ALBA'}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  ⏱️ ~{currentGymSession.durationMin} min · 🔥 ~
                  {activeAthlete === 'guille'
                    ? currentGymSession.guilleKcalBurn
                    : currentGymSession.albaKcalBurn}{' '}
                  kcal
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                {currentGymSession.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {currentGymSession.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddExercise((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-emerald-500/40 border border-transparent cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                <span>+ Ejercicio</span>
              </button>
              <button
                type="button"
                onClick={handleSaveWorkoutToHistory}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Finalizar Sesión y Sincronizar con {selectedDay.label}</span>
              </button>
            </div>
          </div>

          {/* Physiotherapist Warm-Up Block */}
          <div className="p-4 rounded-2xl bg-teal-500/5 dark:bg-teal-950/25 border border-teal-500/25 space-y-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-teal-600 dark:text-teal-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Activación Específica & Prevención Biomecánica (5-7 min)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {currentGymSession.physioWarmup.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-teal-500/20 text-xs text-slate-700 dark:text-slate-300 font-medium"
                >
                  • {item}
                </div>
              ))}
            </div>
          </div>

          {/* Add Custom Exercise Form */}
          {showAddExercise && (
            <form
              onSubmit={handleCreateCustomExercise}
              className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-emerald-500/40 grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
            >
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Nombre del Ejercicio:
                </label>
                <input
                  type="text"
                  required
                  value={newExName}
                  onChange={(e) => setNewExName(e.target.value)}
                  placeholder="Ej: Aperturas en polea baja"
                  className="w-full px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Series × Reps:
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={newExSets}
                    onChange={(e) => setNewExSets(Number(e.target.value))}
                    className="w-14 px-2 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                  />
                  <input
                    type="text"
                    value={newExReps}
                    onChange={(e) => setNewExReps(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Peso Inicial:
                </label>
                <input
                  type="text"
                  value={newExWeight}
                  onChange={(e) => setNewExWeight(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
              >
                Añadir a Sesión
              </button>
            </form>
          )}

          {/* Exercise Cards */}
          <div className="space-y-3.5">
            {[
              ...currentGymSession.exercises,
              ...(customExercisesBySession[currentGymSession.id] || []),
            ].map((exercise, exIdx) => {
              const altIdx = swappedExerciseMap[exercise.id] || 0;
              const activeAlternative =
                altIdx > 0 && exercise.alternatives[altIdx - 1]
                  ? exercise.alternatives[altIdx - 1]
                  : null;

              const displayTitle = activeAlternative
                ? `${activeAlternative.name} (Alternativa Enjoy)`
                : exercise.name;

              const progressKey = `${activeAthlete}_${exercise.id}`;
              const defaultWeight =
                activeAthlete === 'guille'
                  ? exercise.guilleDefaultWeight
                  : exercise.albaDefaultWeight;
              const lastSessionNote =
                activeAthlete === 'guille'
                  ? exercise.guilleLastSession
                  : exercise.albaLastSession;

              const setsList: SetProgress[] =
                setProgressMap[progressKey] ||
                Array.from({ length: exercise.sets }, () => ({
                  completed: false,
                  weight: defaultWeight,
                  reps: exercise.reps,
                  rir: exercise.targetRir,
                }));

              return (
                <div
                  key={exercise.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-500 text-xs font-black flex items-center justify-center">
                          {exIdx + 1}
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                          {displayTitle}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {exercise.muscleGroup}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        🩺 <strong>Biomecánica Pádel / Fisio:</strong> {exercise.padelTransferNote}
                      </p>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        📈 Sesión anterior ({activeAthlete === 'guille' ? 'Guille' : 'Alba'}):{' '}
                        <span className="underline">{lastSessionNote}</span>
                      </p>
                    </div>

                    {/* Busy Machine Swap Button + Rest Trigger */}
                    <div className="flex items-center gap-2">
                      {exercise.alternatives.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            onSwapExerciseAlternative(
                              exercise.id,
                              exercise.alternatives.length
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 cursor-pointer"
                          title="Si la máquina o banco del Enjoy Oviedo está ocupado, cambia a una variante biomecánica equivalente"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Máquina ocupada ⇄ Alternativa</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => triggerRestTimer(exercise.restSeconds)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40 border border-transparent cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{exercise.restSeconds}s</span>
                      </button>
                    </div>
                  </div>

                  {/* Interactive Sets Table */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                    {setsList.map((setItem, sIdx) => (
                      <div
                        key={sIdx}
                        className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                          setItem.completed
                            ? 'bg-emerald-500/10 border-emerald-500/50'
                            : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                            Serie {sIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSetCheck(exercise, sIdx, setItem)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                              setItem.completed
                                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{setItem.completed ? 'Hecha' : 'Marcar'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-xs">
                          <div>
                            <label className="block text-[10px] text-slate-400">Peso</label>
                            <input
                              type="text"
                              value={setItem.weight}
                              onChange={(e) =>
                                onUpdateSetProgress(
                                  progressKey,
                                  sIdx,
                                  (prev) => ({ ...prev, weight: e.target.value }),
                                  exercise.restSeconds
                                )
                              }
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400">Reps</label>
                            <input
                              type="text"
                              value={setItem.reps}
                              onChange={(e) =>
                                onUpdateSetProgress(
                                  progressKey,
                                  sIdx,
                                  (prev) => ({ ...prev, reps: e.target.value }),
                                  exercise.restSeconds
                                )
                              }
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400">RIR</label>
                            <select
                              value={setItem.rir}
                              onChange={(e) =>
                                onUpdateSetProgress(
                                  progressKey,
                                  sIdx,
                                  (prev) => ({ ...prev, rir: e.target.value }),
                                  exercise.restSeconds
                                )
                              }
                              className="w-full px-1.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 font-bold text-xs"
                            >
                              <option value="RIR 0">RIR 0</option>
                              <option value="RIR 1">RIR 1</option>
                              <option value="RIR 1-2">RIR 1-2</option>
                              <option value="RIR 2">RIR 2</option>
                              <option value="RIR 3">RIR 3</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE B: PARTIDO DE PÁDEL + WARM-UP EN PISTA */}
      {/* ========================================================= */}
      {activeModule === 'padel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pre-Match Express Warmup (8 min) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-amber-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🎾</span>
                <span>Calentamiento Exprés en Pista (8 min Pre-Partido)</span>
              </h3>
              <button
                type="button"
                onClick={() => triggerRestTimer(60)}
                className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 cursor-pointer"
              >
                ⏱️ Timer 60s
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Secuencia de fisioterapia antes del peloteo para activar el manguito rotador, el tendón de Aquiles y la rotación torácica:
            </p>
            <div className="space-y-2">
              {[
                '1. Manguito Rotador 90/90 con banda elástica en verja (2×15 rotaciones externas)',
                '2. Dislocaciones escapulares + 15 Band Pull-Aparts (activación escapular para bandeja)',
                '3. Movilidad de muñeca + 10 extensiones excéntricas suaves con la propia pala',
                '4. Zancadas dinámicas con rotación torácica hacia la pierna adelantada (10/lado)',
                '5. Split-Step reactivos sobre punteras + 6 desplazamientos laterales a cristal (20s)',
              ].map((step, i) => (
                <div
                  key={i}
                  onClick={() =>
                    setPadelWarmupChecks((prev) => ({ ...prev, [i]: !prev[i] }))
                  }
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                    padelWarmupChecks[i]
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{step}</span>
                  <span>{padelWarmupChecks[i] ? '✓ Listo' : '○'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Match Logger + Sync with Carb Cycling */}
          <form
            onSubmit={handleLogPadelMatch}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Registrar Partido de Pádel ({activeAthlete === 'guille' ? 'Guille' : 'Alba'})
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Duración:
                </label>
                <select
                  value={padelDuration}
                  onChange={(e) => setPadelDuration(Number(e.target.value) as 60 | 90 | 120)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                >
                  <option value={60}>60 min</option>
                  <option value={90}>90 min (Estándar)</option>
                  <option value={120}>120 min (Partido largo)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Lado de Pista:
                </label>
                <select
                  value={padelSide}
                  onChange={(e) => setPadelSide(e.target.value as 'reves' | 'drive')}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                >
                  <option value="reves">Revés</option>
                  <option value="drive">Drive / Derecha</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Esfuerzo RPE (1-10):
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={padelRpe}
                  onChange={(e) => setPadelRpe(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Resultado / Marcador:
                </label>
                <input
                  type="text"
                  value={padelScore}
                  onChange={(e) => setPadelScore(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Sensaciones articulares / Notas:
                </label>
                <input
                  type="text"
                  value={padelNotes}
                  onChange={(e) => setPadelNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-amber-500 text-slate-950 hover:bg-amber-400 cursor-pointer"
            >
              Guardar Partido y Activar Ciclado ALTO en {selectedDay.label}
            </button>

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-extrabold uppercase text-slate-400">
                Últimos Partidos Registrados
              </span>
              {padelLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-amber-500">{log.date}</span> ·{' '}
                    <span className="font-semibold">
                      {log.durationMin}m ({log.side.toUpperCase()}) · {log.score}
                    </span>
                    <p className="text-[11px] text-slate-500">{log.notes}</p>
                  </div>
                  <span className="font-extrabold text-emerald-500 shrink-0">
                    🔥 {log.kcalBurned} kcal
                  </span>
                </div>
              ))}
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE C: RUNNING OVIEDO / CINTA */}
      {/* ========================================================= */}
      {activeModule === 'running' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            {RUNNING_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => {
                  setRunTemplateId(tpl.id);
                  setRunDistanceKm(tpl.defaultDistanceKm);
                  setRunDurationMin(tpl.defaultDurationMin);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  runTemplateId === tpl.id
                    ? 'bg-sky-500/10 border-sky-500/50'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    🏃‍♂️ {tpl.name}
                  </h4>
                  <span className="text-xs font-bold text-sky-400">{tpl.targetPace}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tpl.subtitle}</p>
                <p className="text-[11px] text-teal-500 font-semibold mt-1.5">
                  🩺 Fisio Tip: {tpl.physioTip}
                </p>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleLogRunning}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Registrar Sesión de Running ({activeAthlete === 'guille' ? 'Guille' : 'Alba'})
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Distancia (km):
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={runDistanceKm}
                  onChange={(e) => setRunDistanceKm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Tiempo (min):
                </label>
                <input
                  type="number"
                  value={runDurationMin}
                  onChange={(e) => setRunDurationMin(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Ritmo Calculado:
                </label>
                <div className="px-3 py-2 rounded-xl text-xs font-extrabold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  {calculatedPace}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Recorrido / Notas (Pista Finlandesa, Parque Invierno, Cinta Enjoy...):
              </label>
              <input
                type="text"
                value={runNotes}
                onChange={(e) => setRunNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-sky-500 text-slate-950 hover:bg-sky-400 cursor-pointer"
            >
              Guardar Carrera y Sincronizar con {selectedDay.label}
            </button>

            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              {runningLogs.map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-sky-400">
                      {r.date} ({r.athlete.toUpperCase()})
                    </span>{' '}
                    · {r.distanceKm} km en {r.durationMin} min
                    <p className="text-[11px] text-slate-500">{r.notes}</p>
                  </div>
                  <span className="font-extrabold text-emerald-500">🔥 {r.kcalBurned} kcal</span>
                </div>
              ))}
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE D: CLASES DIRIGIDAS ENJOY OVIEDO (ESPECIAL ALBA) */}
      {/* ========================================================= */}
      {activeModule === 'clase_dirigida' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIRECTED_CLASSES_CATALOG.map((cls) => (
            <div
              key={cls.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-rose-500/25 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {cls.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400">
                    {cls.durationMin} min
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{cls.focus}</p>
                <p className="text-xs font-bold text-emerald-500 pt-1">
                  🔥 Gasto estimado: Alba ~{cls.albaKcal} kcal · Guille ~{cls.guilleKcal} kcal
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onAddTrainingHistory({
                    date: `${selectedDay.shortLabel} · Hoy`,
                    athlete: activeAthlete,
                    type: 'clase_dirigida',
                    title: `Clase Dirigida Enjoy · ${cls.name}`,
                    durationMin: cls.durationMin,
                    kcalBurned: activeAthlete === 'guille' ? cls.guilleKcal : cls.albaKcal,
                    highlightPr: `Ciclado ${cls.carbLevel.toUpperCase()} activado`,
                  });
                  onSyncTrainingToDay(
                    selectedDay.day,
                    activeAthlete,
                    'clase_dirigida',
                    cls.name
                  );
                }}
                className="w-full py-2 rounded-xl text-xs font-extrabold bg-rose-500 text-white hover:bg-rose-400 cursor-pointer"
              >
                Asignar {cls.name} a {activeAthlete === 'guille' ? 'Guille' : 'Alba'} hoy ({selectedDay.shortLabel})
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE E: OTRA ACTIVIDAD / OUTDOOR ASTURIAS */}
      {/* ========================================================= */}
      {activeModule === 'otra_actividad' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
              Catálogo Rápido de Actividades Outdoor / Deporte
            </h3>
            {OUTDOOR_ACTIVITIES_CATALOG.map((act) => (
              <div
                key={act.id}
                onClick={() => {
                  setOutdoorName(act.name);
                  setOutdoorDurationMin(act.defaultDurationMin);
                  setOutdoorIntensity(act.defaultIntensity);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  outdoorName === act.name
                    ? 'bg-orange-500/10 border-orange-500/50'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    ⛰️ {act.name}
                  </span>
                  <span className="text-xs font-bold text-orange-400">
                    ~{act.defaultDurationMin} min
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Gasto por hora: Guille ~{act.guilleKcalPerHour} kcal/h · Alba ~{act.albaKcalPerHour} kcal/h
                </p>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleLogOutdoorActivity}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Registrar Actividad Libre / Outdoor ({activeAthlete === 'guille' ? 'Guille' : 'Alba'})
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Actividad (Ruta, Escalada, Partido de Fútbol, Bici, otra clase...):
              </label>
              <input
                type="text"
                required
                value={outdoorName}
                onChange={(e) => setOutdoorName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Duración (minutos):
                </label>
                <input
                  type="number"
                  value={outdoorDurationMin}
                  onChange={(e) => setOutdoorDurationMin(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Intensidad (para Ciclado HC):
                </label>
                <select
                  value={outdoorIntensity}
                  onChange={(e) =>
                    setOutdoorIntensity(e.target.value as 'suave' | 'media' | 'alta')
                  }
                  className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                >
                  <option value="suave">Suave (Ciclado Bajo)</option>
                  <option value="media">Media (Ciclado Medio)</option>
                  <option value="alta">Alta (Ciclado Alto)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Notas (Desnivel, lugar, sensaciones...):
              </label>
              <input
                type="text"
                value={outdoorNotes}
                onChange={(e) => setOutdoorNotes(e.target.value)}
                placeholder="Ej: Subida al Picu Paisano / Rocódromo Oviedo"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl text-xs font-extrabold bg-orange-500 text-slate-950 hover:bg-orange-400 cursor-pointer"
            >
              Guardar Actividad y Recalcular Macros de {selectedDay.label}
            </button>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODULE F: PROGRESO, HISTORIAL Y RÉCORDS PERSONALES (PRs) */}
      {/* ========================================================= */}
      {activeModule === 'progreso' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30">
              <span className="text-xs font-bold text-slate-400">Sesiones Registradas</span>
              <p className="text-2xl font-black text-emerald-500 mt-1">
                {trainingHistory.length}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30">
              <span className="text-xs font-bold text-slate-400">Partidos de Pádel</span>
              <p className="text-2xl font-black text-amber-400 mt-1">{padelLogs.length}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-sky-500/30">
              <span className="text-xs font-bold text-slate-400">Kilómetros Running</span>
              <p className="text-2xl font-black text-sky-400 mt-1">
                {runningLogs.reduce((acc, r) => acc + r.distanceKm, 0).toFixed(1)} km
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/30">
              <span className="text-xs font-bold text-slate-400">Kcal Totales Quemadas</span>
              <p className="text-2xl font-black text-rose-400 mt-1">
                {trainingHistory.reduce((acc, h) => acc + h.kcalBurned, 0)} kcal
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Historial de Entrenamientos y Marcas Personales (Guille & Alba)</span>
            </h3>
            <div className="space-y-2">
              {trainingHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase ${
                          item.athlete === 'guille'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {item.athlete}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </span>
                      <span className="text-slate-400">· {item.date}</span>
                    </div>
                    {item.highlightPr && (
                      <p className="text-emerald-500 font-semibold">🏆 {item.highlightPr}</p>
                    )}
                  </div>
                  <div className="font-extrabold text-slate-700 dark:text-slate-300">
                    ⏱️ {item.durationMin}m · 🔥 {item.kcalBurned} kcal
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
