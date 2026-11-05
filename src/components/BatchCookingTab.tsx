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
  Check,
  Pause,
  Play,
} from 'lucide-react';

interface BatchCookingTabProps {
  days: DayPlan[];
  completedStepIds: Record<string, boolean>;
  onToggleStepCompleted: (stepId: string) => void;
  onResetBatchSteps: () => void;
}

const TRACK_LABELS: Record<BatchTrack, { label: string; emoji: string; color: string }> = {
  horno: { label: 'Horno 200°C', emoji: '🔥', color: 'text-[#FF9F0A] bg-[#FF9F0A]/15' },
  olla_expres: { label: 'Olla Exprés', emoji: '🍲', color: 'text-[#FF2D55] bg-[#FF2D55]/15' },
  vitro: { label: 'Vitrocerámica', emoji: '🍳', color: 'text-[#30D158] bg-[#30D158]/15' },
  airfryer: { label: 'Airfryer', emoji: '⚡', color: 'text-[#0A84FF] bg-[#0A84FF]/15' },
};

export const BatchCookingTab: React.FC<BatchCookingTabProps> = ({
  days,
  completedStepIds,
  onToggleStepCompleted,
  onResetBatchSteps,
}) => {
  const [subTab, setSubTab] = useState<'pasos' | 'tuppers' | 'bascula'>('pasos');
  const [stepTimers, setStepTimers] = useState<
    Record<string, { remainingSec: number; running: boolean }>
  >({});

  const [potCookedWeightG, setPotCookedWeightG] = useState<number>(1100);
  const [potDaysCount, setPotDaysCount] = useState<number>(3);

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

  const toggleTimer = (id: string, defaultSec: number) => {
    setStepTimers((prev) => {
      const curr = prev[id];
      if (!curr) return { ...prev, [id]: { remainingSec: defaultSec, running: true } };
      return { ...prev, [id]: { ...curr, running: !curr.running } };
    });
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const batchSummary = calculateWeeklyBatchSummary(days);
  const completedCount = BATCH_COOKING_STEPS.filter((s) => completedStepIds[s.id]).length;

  const guillePerTupper = potDaysCount > 0 ? Math.round((potCookedWeightG * 0.58) / potDaysCount) : 0;
  const albaPerTupper = potDaysCount > 0 ? Math.round((potCookedWeightG * 0.42) / potDaysCount) : 0;

  return (
    <div className="space-y-5">
      {/* Top Apple Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Batch Cooking
          </h2>
          <p className="text-xs text-slate-400">
            {completedCount} de {BATCH_COOKING_STEPS.length} pasos completados
          </p>
        </div>

        <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs">
          <button
            type="button"
            onClick={() => setSubTab('pasos')}
            className={`px-3.5 py-1.5 rounded-full font-semibold cursor-pointer ${
              subTab === 'pasos'
                ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            ⏱️ Paso a Paso
          </button>
          <button
            type="button"
            onClick={() => setSubTab('tuppers')}
            className={`px-3.5 py-1.5 rounded-full font-semibold cursor-pointer ${
              subTab === 'tuppers'
                ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            🥡 Tuppers
          </button>
          <button
            type="button"
            onClick={() => setSubTab('bascula')}
            className={`px-3.5 py-1.5 rounded-full font-semibold cursor-pointer ${
              subTab === 'bascula'
                ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            ⚖️ Calculadora
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PASO A PASO PARALELO */}
      {subTab === 'pasos' && (
        <div className="space-y-3">
          {BATCH_COOKING_STEPS.map((step) => {
            const done = Boolean(completedStepIds[step.id]);
            const tr = TRACK_LABELS[step.track];
            const timer = stepTimers[step.id] || {
              remainingSec: step.durationTimerSec,
              running: false,
            };

            return (
              <div
                key={step.id}
                className={`apple-card rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4 transition-opacity ${
                  done ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onToggleStepCompleted(step.id)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-all ${
                      done
                        ? 'bg-[#30D158] text-black'
                        : 'border-2 border-slate-300 dark:border-slate-600'
                    }`}
                  >
                    {done && <Check className="w-4 h-4" />}
                  </button>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-400">
                        Min {step.minuteStart}–{step.minuteEnd}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${tr.color}`}
                      >
                        {tr.emoji} {tr.label}
                      </span>
                    </div>

                    <h3
                      className={`text-sm sm:text-base font-bold ${
                        done
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Apple Circular Timer Pill */}
                <button
                  type="button"
                  onClick={() => toggleTimer(step.id, step.durationTimerSec)}
                  className={`px-3.5 py-2 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    timer.running
                      ? 'bg-[#30D158] text-black'
                      : 'apple-pill-surface text-slate-700 dark:text-white'
                  }`}
                >
                  {timer.running ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>{formatSec(timer.remainingSec)}</span>
                </button>
              </div>
            );
          })}

          {completedCount > 0 && (
            <button
              type="button"
              onClick={onResetBatchSteps}
              className="w-full py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Reiniciar pasos de la semana
            </button>
          )}
        </div>
      )}

      {/* SUB-TAB 2: REPARTO EN TUPPERS */}
      {subTab === 'tuppers' && (
        <div className="space-y-3">
          {batchSummary.map((item) => (
            <div key={item.recipeId} className="apple-card rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {item.recipeTitle}
                </h3>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#30D158]/15 text-[#30D158]">
                  {item.occurrencesCount} días
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#30D158]/10 space-y-0.5">
                  <span className="font-bold text-[#30D158] block">
                    🟢 Tupper Guille: ~{item.guilleCookedPerTupperG}g cocinados
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.guilleRawPerMealSummary}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FF2D55]/10 space-y-0.5">
                  <span className="font-bold text-[#FF2D55] block">
                    🔴 Tupper Alba: ~{item.albaCookedPerTupperG}g cocinados
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {item.albaRawPerMealSummary}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUB-TAB 3: CALCULADORA DE OLLA */}
      {subTab === 'bascula' && (
        <div className="apple-card rounded-3xl p-6 max-w-md mx-auto space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Divisor de Olla en Báscula
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pesa el total cocinado (arroz, pasta o carne) y te dice cuánto poner en cada tupper.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E]">
              <span className="text-xs text-slate-400 block">Peso total olla (g)</span>
              <input
                type="number"
                value={potCookedWeightG}
                onChange={(e) => setPotCookedWeightG(Number(e.target.value) || 0)}
                className="w-full bg-transparent text-2xl font-black mt-1 outline-none"
              />
            </div>
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E]">
              <span className="text-xs text-slate-400 block">Nº de comidas</span>
              <input
                type="number"
                min={1}
                max={7}
                value={potDaysCount}
                onChange={(e) => setPotDaysCount(Number(e.target.value) || 1)}
                className="w-full bg-transparent text-2xl font-black mt-1 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#30D158]/15">
              <span className="text-sm font-bold text-[#30D158]">
                En cada tupper de Guille
              </span>
              <span className="text-xl font-black text-[#30D158]">
                {guillePerTupper} g
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FF2D55]/15">
              <span className="text-sm font-bold text-[#FF2D55]">
                En cada tupper de Alba
              </span>
              <span className="text-xl font-black text-[#FF2D55]">
                {albaPerTupper} g
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
