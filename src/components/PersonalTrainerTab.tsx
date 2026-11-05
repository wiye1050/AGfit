import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronDown,
  Info,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Timer,
  Trophy,
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
  | 'padel'
  | 'running'
  | 'movilidad'
  | 'clase_dirigida'
  | 'otra_actividad'
  | 'progreso';

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
  const [activeAthlete, setActiveAthlete] = useState<'guille' | 'alba'>('guille');
  const [activeModule, setActiveModule] = useState<ActiveModuleTab>('empuje');
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
    <div className="space-y-5">
      {/* Row 1: Athlete Pill Switcher + Dynamic Island Timer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Athlete Segmented Control */}
        <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs">
          <button
            type="button"
            onClick={() => setActiveAthlete('guille')}
            className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
              activeAthlete === 'guille'
                ? 'bg-[#30D158] text-black shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Guille
          </button>
          <button
            type="button"
            onClick={() => setActiveAthlete('alba')}
            className={`px-4 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
              activeAthlete === 'alba'
                ? 'bg-[#FF2D55] text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Alba
          </button>
        </div>

        {/* iPhone Dynamic Island Rest Timer */}
        <div className="bg-black text-white px-4 py-2 rounded-full border border-white/15 shadow-lg inline-flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Timer
              className={`w-4 h-4 ${
                timerRunning ? 'text-[#30D158] animate-spin' : 'text-slate-400'
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
              className="w-6 h-6 rounded-full bg-[#30D158] text-black flex items-center justify-center cursor-pointer ml-1"
            >
              {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Workout Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { id: 'empuje', label: '🏋️ Empuje' },
          { id: 'tiron', label: '💪 Tirón' },
          { id: 'pierna', label: '🦵 Pierna' },
          { id: 'padel', label: '🎾 Pádel' },
          { id: 'running', label: '🏃 Running' },
          { id: 'movilidad', label: '🧘 Movilidad' },
          { id: 'clase_dirigida', label: '🤸‍♀️ Clases Enjoy' },
          { id: 'otra_actividad', label: '⛰️ Ruta / Otro' },
          { id: 'progreso', label: '🏆 Récords' },
        ].map((tab) => {
          const active = activeModule === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveModule(tab.id as ActiveModuleTab)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                active
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm'
                  : 'apple-card text-slate-600 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* CLEAN ACCORDION GYM WORKOUT (EMPUJE / TIRÓN / PIERNA / MOVILIDAD) */}
      {/* ========================================================= */}
      {currentGymSession && (
        <div className="space-y-3">
          {/* Minimal Session Title & Complete Button */}
          <div className="apple-card rounded-3xl p-5 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#30D158]">
                Enjoy Oviedo · {currentGymSession.durationMin} min
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {currentGymSession.title}
              </h2>
            </div>
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
              className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#30D158] text-black shrink-0 cursor-pointer"
            >
              ✓ Terminar
            </button>
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
                  reps: exercise.reps,
                  rir: exercise.targetRir,
                }));

              const completedCount = setsList.filter((s) => s.completed).length;

              return (
                <div key={exercise.id} className="apple-card rounded-3xl overflow-hidden">
                  {/* Exercise Row Header */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedExId(isExpanded ? '' : exercise.id)
                    }
                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 ${
                          completedCount === setsList.length
                            ? 'bg-[#30D158] text-black'
                            : 'apple-pill-surface text-slate-700 dark:text-white'
                        }`}
                      >
                        {completedCount === setsList.length ? '✓' : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                          {displayName}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {exercise.sets} series × {exercise.reps} · Anterior: {lastNote}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold apple-pill-surface">
                        {completedCount}/{setsList.length}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded Sets Body */}
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 space-y-3 border-t border-black/5 dark:border-white/5">
                      {/* Action Row: Physio Tip & Machine Swap */}
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setShowPhysioTipId(
                              showPhysioTipId === exercise.id ? null : exercise.id
                            )
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A84FF] cursor-pointer"
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
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold apple-pill-surface text-slate-700 dark:text-slate-200 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Máquina ocupada ⇄ Cambiar</span>
                          </button>
                        )}
                      </div>

                      {showPhysioTipId === exercise.id && (
                        <div className="p-3 rounded-2xl bg-[#0A84FF]/10 text-xs text-[#0A84FF] leading-relaxed">
                          🩺 {exercise.padelTransferNote}
                        </div>
                      )}

                      {/* Clean iOS Set Rows */}
                      <div className="space-y-2">
                        {setsList.map((setItem, sIdx) => (
                          <div
                            key={sIdx}
                            className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl transition-all ${
                              setItem.completed
                                ? 'bg-[#30D158]/15'
                                : 'bg-slate-100 dark:bg-[#2C2C2E]'
                            }`}
                          >
                            <span className="text-xs font-bold text-slate-400 w-14">
                              Serie {sIdx + 1}
                            </span>

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
                              className="w-28 px-2.5 py-1.5 rounded-xl bg-white dark:bg-black/60 text-xs font-bold text-center"
                            />

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
                              className="w-20 px-2.5 py-1.5 rounded-xl bg-white dark:bg-black/60 text-xs font-bold text-center"
                            />

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
                                if (nextDone) startTimer(exercise.restSeconds);
                              }}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                setItem.completed
                                  ? 'bg-[#30D158] text-black shadow-sm'
                                  : 'bg-black/10 dark:bg-white/10 text-slate-400'
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
      )}

      {/* ========================================================= */}
      {/* PADEL MINIMALIST CARD */}
      {/* ========================================================= */}
      {activeModule === 'padel' && (
        <div className="apple-card rounded-3xl p-6 space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF9F0A]">
              Pádel · Ciclado Alto Automático
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Partido de Pádel
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([60, 90, 120] as const).map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setPadelDuration(min)}
                className={`py-3 rounded-2xl text-sm font-bold cursor-pointer ${
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
            className="w-full px-4 py-3 rounded-2xl text-sm font-bold apple-pill-surface"
          />

          <button
            type="button"
            onClick={() => {
              const kcal = Math.round(padelDuration * (activeAthlete === 'guille' ? 7.2 : 5.2));
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
            className="w-full py-3.5 rounded-2xl text-sm font-bold bg-[#FF9F0A] text-black cursor-pointer"
          >
            Guardar Partido ({selectedDay.label})
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* RUNNING MINIMALIST CARD */}
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
                className="px-3.5 py-2 rounded-2xl text-xs font-bold apple-pill-surface hover:opacity-80 cursor-pointer"
              >
                🏃 {tpl.name.split('(')[0]} ({tpl.defaultDistanceKm}km)
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E]">
              <span className="text-xs text-slate-400 block">Distancia (km)</span>
              <input
                type="number"
                step="0.5"
                value={runDistanceKm}
                onChange={(e) => setRunDistanceKm(Number(e.target.value))}
                className="w-full bg-transparent text-2xl font-black mt-1 outline-none"
              />
            </div>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E]">
              <span className="text-xs text-slate-400 block">Tiempo (min)</span>
              <input
                type="number"
                value={runDurationMin}
                onChange={(e) => setRunDurationMin(Number(e.target.value))}
                className="w-full bg-transparent text-2xl font-black mt-1 outline-none"
              />
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
            className="w-full py-3.5 rounded-2xl text-sm font-bold bg-[#0A84FF] text-white cursor-pointer"
          >
            Guardar Carrera ({selectedDay.label})
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* CLASES DIRIGIDAS ENJOY (ALBA & GUILLE) */}
      {/* ========================================================= */}
      {activeModule === 'clase_dirigida' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DIRECTED_CLASSES_CATALOG.map((cls) => (
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
              className="apple-card rounded-3xl p-5 text-left flex items-center justify-between hover:scale-[1.01] transition-all cursor-pointer"
            >
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {cls.name}
                </h4>
                <p className="text-xs text-slate-400">
                  {cls.durationMin} min · ~
                  {activeAthlete === 'guille' ? cls.guilleKcal : cls.albaKcal} kcal
                </p>
              </div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#FF2D55]/15 text-[#FF2D55]">
                Elegir
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* OTRA ACTIVIDAD / OUTDOOR ASTURIAS */}
      {/* ========================================================= */}
      {activeModule === 'otra_actividad' && (
        <div className="apple-card rounded-3xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
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
                className={`px-3.5 py-2 rounded-full text-xs font-bold cursor-pointer ${
                  outdoorName === act.name
                    ? 'bg-[#30D158] text-black'
                    : 'apple-pill-surface text-slate-500'
                }`}
              >
                {act.name.split('(')[0]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={outdoorDurationMin}
              onChange={(e) => setOutdoorDurationMin(Number(e.target.value))}
              className="px-4 py-3 rounded-2xl text-sm font-bold apple-pill-surface"
              placeholder="Minutos"
            />
            <select
              value={outdoorIntensity}
              onChange={(e) =>
                setOutdoorIntensity(e.target.value as 'suave' | 'media' | 'alta')
              }
              className="px-4 py-3 rounded-2xl text-sm font-bold apple-pill-surface"
            >
              <option value="suave">Intensidad Suave</option>
              <option value="media">Intensidad Media</option>
              <option value="alta">Intensidad Alta</option>
            </select>
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
            className="w-full py-3.5 rounded-2xl text-sm font-bold bg-[#30D158] text-black cursor-pointer"
          >
            Asignar a {selectedDay.label}
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* RÉCORDS Y RESUMEN */}
      {/* ========================================================= */}
      {activeModule === 'progreso' && (
        <div className="apple-card rounded-3xl p-5 space-y-3">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#FF9F0A]" />
            <span>Historial Reciente</span>
          </h3>
          {trainingHistory.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] text-xs"
            >
              <div>
                <span className="font-bold text-slate-900 dark:text-white">{h.title}</span>
                <p className="text-slate-400">
                  {h.athlete.toUpperCase()} · {h.date}
                </p>
              </div>
              <span className="font-bold text-[#30D158]">{h.kcalBurned} kcal</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
