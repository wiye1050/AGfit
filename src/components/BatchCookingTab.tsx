import React, { useEffect, useState } from 'react';
import {
  BatchTrack,
  DayPlan,
} from '../types';
import {
  BATCH_COOKING_STEPS,
  calculateWeeklyBatchSummary,
} from '../data/batchCooking';
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
  Scale,
  Sparkles,
  Timer,
  UtensilsCrossed,
  Zap,
} from 'lucide-react';

interface BatchCookingTabProps {
  days: DayPlan[];
  completedStepIds: Record<string, boolean>;
  onToggleStepCompleted: (stepId: string) => void;
  onResetBatchSteps: () => void;
}

const TRACK_META: Record<
  BatchTrack,
  { label: string; badgeClass: string; icon: string }
> = {
  horno: {
    label: 'Horno Estándar (200°C)',
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    icon: '🔥',
  },
  olla_expres: {
    label: 'Olla Exprés Tradicional',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    icon: '🍲',
  },
  vitro: {
    label: 'Vitrocerámica (3-4 Fuegos)',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: '🍳',
  },
  airfryer: {
    label: 'Airfryer (1 Cesta)',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    icon: '⚡',
  },
};

export const BatchCookingTab: React.FC<BatchCookingTabProps> = ({
  days,
  completedStepIds,
  onToggleStepCompleted,
  onResetBatchSteps,
}) => {
  const [selectedTrack, setSelectedTrack] = useState<'all' | BatchTrack>('all');
  const [stepTimers, setStepTimers] = useState<
    Record<string, { remainingSec: number; running: boolean }>
  >({});

  // Live Pot Divider Calculator State
  const [potCookedWeightG, setPotCookedWeightG] = useState<number>(1100);
  const [potDaysCount, setPotDaysCount] = useState<number>(3);
  const [potDishType, setPotDishType] = useState<'hidrato' | 'proteina' | 'guiso'>('hidrato');

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepTimers((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [id, st] of Object.entries(next)) {
          if (st.running && st.remainingSec > 0) {
            changed = true;
            const rem = st.remainingSec - 1;
            next[id] = { remainingSec: rem, running: rem > 0 };
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleStepTimer = (stepId: string, defaultSec: number) => {
    setStepTimers((prev) => {
      const existing = prev[stepId];
      if (!existing) {
        return {
          ...prev,
          [stepId]: { remainingSec: defaultSec, running: true },
        };
      }
      return {
        ...prev,
        [stepId]: { ...existing, running: !existing.running },
      };
    });
  };

  const resetStepTimer = (stepId: string, defaultSec: number) => {
    setStepTimers((prev) => ({
      ...prev,
      [stepId]: { remainingSec: defaultSec, running: false },
    }));
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const batchSummaryItems = calculateWeeklyBatchSummary(days);
  const filteredSteps = BATCH_COOKING_STEPS.filter(
    (s) => selectedTrack === 'all' || s.track === selectedTrack
  );

  const completedCount = BATCH_COOKING_STEPS.filter((s) => completedStepIds[s.id]).length;
  const progressPct = Math.round((completedCount / BATCH_COOKING_STEPS.length) * 100);

  // Proportional ratio between Guille and Alba
  const guilleShare = potDishType === 'proteina' ? 0.6 : 0.58;
  const albaShare = 1 - guilleShare;
  const guillePerTupper =
    potDaysCount > 0 ? Math.round((potCookedWeightG * guilleShare) / potDaysCount) : 0;
  const albaPerTupper =
    potDaysCount > 0 ? Math.round((potCookedWeightG * albaShare) / potDaysCount) : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner + Progress */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                Secuencia Paralela 85 min (Domingo) + 11 min Airfryer (Salmón Fresco)
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
              Centro de Batch Cooking Paralelo · 4 Vías Sincronizadas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Optimizado para vuestra cocina: Vitro (3-4 fuegos), Horno estándar, Olla Exprés tradicional y Airfryer de 1 cesta sin saturarla.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500 block">
                Progreso Sesión
              </span>
              <span className="text-sm font-black text-emerald-500">
                {completedCount} / {BATCH_COOKING_STEPS.length} pasos ({progressPct}%)
              </span>
            </div>
            <button
              type="button"
              onClick={onResetBatchSteps}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-400 cursor-pointer"
            >
              Reiniciar Checks
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-rose-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Track Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1">
          <button
            type="button"
            onClick={() => setSelectedTrack('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer ${
              selectedTrack === 'all'
                ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Todas las Vías en Paralelo (9)
          </button>
          {(Object.keys(TRACK_META) as BatchTrack[]).map((tr) => (
            <button
              key={tr}
              type="button"
              onClick={() => setSelectedTrack(tr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border whitespace-nowrap cursor-pointer ${
                selectedTrack === tr
                  ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                  : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {TRACK_META[tr].icon} {TRACK_META[tr].label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Parallel Timeline Cards */}
      <div className="space-y-3">
        {filteredSteps.map((step) => {
          const isDone = Boolean(completedStepIds[step.id]);
          const trMeta = TRACK_META[step.track];
          const timerState = stepTimers[step.id] || {
            remainingSec: step.durationTimerSec,
            running: false,
          };

          return (
            <div
              key={step.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isDone
                  ? 'bg-emerald-500/5 border-emerald-500/40 opacity-80'
                  : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-900 text-white dark:bg-slate-800 dark:text-emerald-400">
                      Min {step.minuteStart} → Min {step.minuteEnd}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${trMeta.badgeClass}`}
                    >
                      {trMeta.icon} {trMeta.label}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {step.phase}
                    </span>
                  </div>

                  <h3
                    className={`text-sm sm:text-base font-extrabold ${
                      isDone
                        ? 'line-through text-slate-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {step.description}
                  </p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    💡 Truco AGfit: {step.proTip}
                  </p>
                </div>

                {/* Step Timer & Complete Check */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                    <Timer
                      className={`w-3.5 h-3.5 ${
                        timerState.running
                          ? 'text-emerald-400 animate-spin'
                          : 'text-slate-400'
                      }`}
                    />
                    <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                      {formatSec(timerState.remainingSec)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleStepTimer(step.id, step.durationTimerSec)}
                      className="p-1 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                      title="Iniciar/Pausar temporizador de este paso"
                    >
                      {timerState.running ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetStepTimer(step.id, step.durationTimerSec)}
                      className="p-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleStepCompleted(step.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      isDone
                        ? 'bg-emerald-500 text-slate-950 border-emerald-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500/40'
                    }`}
                  >
                    {isDone ? '✓ Completado' : 'Marcar Hecho'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* TUPPER DISTRIBUTION GUIDE + LIVE POT SCALE DIVIDER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Table of Tuppers from Active Weekly Menu */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-emerald-500" />
              <span>Guía de Reparto en Tuppers según vuestro Menú Activo (L-D)</span>
            </h3>
          </div>

          <div className="space-y-3">
            {batchSummaryItems.map((item) => (
              <div
                key={item.recipeId}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {item.recipeTitle}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {item.daysScheduled.map((dStr, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        >
                          {dStr}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                    {item.occurrencesCount} comidas dobles ({item.occurrencesCount * 2} raciones)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <span className="font-extrabold text-emerald-500 block">
                      🟦 Tupper Guille (por ración): ~{item.guilleCookedPerTupperG}g cocinados
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.guilleRawPerMealSummary}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20">
                    <span className="font-extrabold text-rose-400 block">
                      🟥 Tupper Alba (por ración): ~{item.albaCookedPerTupperG}g cocinados
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.albaRawPerMealSummary}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Kitchen Scale Pot Divider */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-emerald-500/30 space-y-4">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-500" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Calculadora de Báscula en Vivo
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ¿Acabas de sacar una olla de arroz, pasta o pollo cocinado y quieres repartirlo exacto sin hacer cuentas? Pon el peso total cocinado:
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Tipo de alimento cocinado:
              </label>
              <select
                value={potDishType}
                onChange={(e) =>
                  setPotDishType(e.target.value as 'hidrato' | 'proteina' | 'guiso')
                }
                className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
              >
                <option value="hidrato">Hidrato cocido (Arroz / Pasta / Patata · 58% / 42%)</option>
                <option value="proteina">Proteína cocinada (Pollo / Ternera · 60% / 40%)</option>
                <option value="guiso">Guiso completo / Lentejas (58% / 42%)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Peso Total Olla (g):
                </label>
                <input
                  type="number"
                  value={potCookedWeightG}
                  onChange={(e) => setPotCookedWeightG(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl text-sm font-black bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Nº de comidas (días):
                </label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={potDaysCount}
                  onChange={(e) => setPotDaysCount(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl text-sm font-black bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-500">
                  🟦 En cada uno de los {potDaysCount} tuppers de GUILLE:
                </span>
                <span className="text-base font-black text-emerald-500">
                  {guillePerTupper} g
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400">
                  🟥 En cada uno de los {potDaysCount} tuppers de ALBA:
                </span>
                <span className="text-base font-black text-rose-400">
                  {albaPerTupper} g
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
