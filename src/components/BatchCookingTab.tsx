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
  Minus,
  Pause,
  Play,
  Plus,
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
  const activeStepIndex = BATCH_COOKING_STEPS.findIndex((s) => !completedStepIds[s.id]);
  const activeStep = activeStepIndex >= 0 ? BATCH_COOKING_STEPS[activeStepIndex] : null;

  const guillePerTupper =
    potDaysCount > 0 ? Math.round((potCookedWeightG * 0.58) / potDaysCount) : 0;
  const albaPerTupper =
    potDaysCount > 0 ? Math.round((potCookedWeightG * 0.42) / potDaysCount) : 0;

  return (
    <div className="space-y-4">
      {/* Top Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Cocina de Domingo (60 min)
          </h2>
          <p className="text-xs font-semibold text-slate-400">
            {completedCount} de {BATCH_COOKING_STEPS.length} pasos hechos
          </p>
        </div>

        <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs">
          <button
            type="button"
            onClick={() => setSubTab('pasos')}
            className={`px-3.5 py-1.5 rounded-full font-extrabold cursor-pointer ${
              subTab === 'pasos'
                ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            ⏱️ Guiado
          </button>
          <button
            type="button"
            onClick={() => setSubTab('tuppers')}
            className={`px-3.5 py-1.5 rounded-full font-extrabold cursor-pointer ${
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
            className={`px-3.5 py-1.5 rounded-full font-extrabold cursor-pointer ${
              subTab === 'bascula'
                ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            ⚖️ Repartir Olla
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: MODO GUIADO DE COCINA (1 HERO CARD AT TOP)     */}
      {/* ========================================================= */}
      {subTab === 'pasos' && (
        <div className="space-y-4">
          {/* HERO CARD: CURRENT STEP IN LARGE PRINT */}
          {activeStep ? (
            <div className="apple-card rounded-3xl p-5 sm:p-6 ring-2 ring-[#30D158] space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase bg-[#30D158] text-black">
                    Paso {activeStepIndex + 1} de {BATCH_COOKING_STEPS.length}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                      TRACK_LABELS[activeStep.track].color
                    }`}
                  >
                    {TRACK_LABELS[activeStep.track].emoji}{' '}
                    {TRACK_LABELS[activeStep.track].label}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Min {activeStep.minuteStart}–{activeStep.minuteEnd}
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  {activeStep.title}
                </h3>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {activeStep.description}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => toggleTimer(activeStep.id, activeStep.durationTimerSec)}
                  className="px-5 py-3.5 rounded-2xl text-sm font-mono font-black apple-pill-surface flex items-center justify-center gap-2 cursor-pointer"
                >
                  {stepTimers[activeStep.id]?.running ? (
                    <Pause className="w-4 h-4 text-[#30D158]" />
                  ) : (
                    <Play className="w-4 h-4 text-[#30D158]" />
                  )}
                  <span>
                    Cronómetro:{' '}
                    {formatSec(
                      stepTimers[activeStep.id]?.remainingSec ??
                        activeStep.durationTimerSec
                    )}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleStepCompleted(activeStep.id)}
                  className="flex-1 py-3.5 px-5 rounded-2xl text-sm font-black bg-[#30D158] text-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Hecho · Pasar al siguiente paso</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="apple-card rounded-3xl p-6 text-center space-y-3">
              <div className="text-3xl">🎉</div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                ¡Batch Cooking Completado!
              </h3>
              <button
                type="button"
                onClick={onResetBatchSteps}
                className="px-4 py-2 rounded-full text-xs font-extrabold apple-pill-surface cursor-pointer"
              >
                Reiniciar pasos
              </button>
            </div>
          )}

          {/* Compact Checklist of All Steps */}
          <div className="apple-card rounded-3xl divide-y divide-black/5 dark:divide-white/5 overflow-hidden">
            {BATCH_COOKING_STEPS.map((step, idx) => {
              const done = Boolean(completedStepIds[step.id]);
              const tr = TRACK_LABELS[step.track];
              return (
                <div
                  key={step.id}
                  onClick={() => onToggleStepCompleted(step.id)}
                  className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer transition-opacity ${
                    done ? 'opacity-45' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        done
                          ? 'bg-[#30D158] text-black'
                          : 'border-2 border-slate-300 dark:border-slate-600 text-slate-400'
                      }`}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={`text-sm font-bold block truncate ${
                          done
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {step.title}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400">
                        {tr.emoji} {tr.label} · Min {step.minuteStart}–{step.minuteEnd}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: VISUAL TUPPER PORTIONS                         */}
      {/* ========================================================= */}
      {subTab === 'tuppers' && (
        <div className="space-y-3">
          {batchSummary.map((item) => (
            <div key={item.recipeId} className="apple-card rounded-3xl p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  {item.recipeTitle}
                </h3>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-[#30D158]/15 text-[#30D158] shrink-0">
                  🥡 × {item.occurrencesCount} comidas
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-[#30D158]/10 border border-[#30D158]/25">
                  <span className="text-xs font-extrabold uppercase text-[#30D158] block">
                    🟢 Tupper Guille
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
                    {item.guilleCookedPerTupperG}g
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-1">
                    Crudo: {item.guilleRawPerMealSummary}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#FF2D55]/10 border border-[#FF2D55]/25">
                  <span className="text-xs font-extrabold uppercase text-[#FF2D55] block">
                    🔴 Tupper Alba
                  </span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
                    {item.albaCookedPerTupperG}g
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-1">
                    Crudo: {item.albaRawPerMealSummary}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: ZERO-KEYBOARD POT DIVIDER                      */}
      {/* ========================================================= */}
      {subTab === 'bascula' && (
        <div className="apple-card rounded-3xl p-6 max-w-md mx-auto space-y-5">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Divisor de Olla en Báscula
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              Pesa la olla ya cocinada y reparte exacto entre Guille (58%) y Alba (42%).
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 block">
                  Peso total cocinado
                </span>
                <span className="text-2xl font-black">{potCookedWeightG} g</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPotCookedWeightG((w) => Math.max(100, w - 50))}
                  className="w-10 h-10 rounded-xl apple-pill-surface flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPotCookedWeightG((w) => w + 50)}
                  className="w-10 h-10 rounded-xl apple-pill-surface flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-400 block">
                  Nº de días / comidas
                </span>
                <span className="text-2xl font-black">{potDaysCount} días</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPotDaysCount((d) => Math.max(1, d - 1))}
                  className="w-10 h-10 rounded-xl apple-pill-surface flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPotDaysCount((d) => Math.min(7, d + 1))}
                  className="w-10 h-10 rounded-xl apple-pill-surface flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#30D158]/15 border border-[#30D158]/30 text-center">
              <span className="text-xs font-extrabold text-[#30D158] block">
                🟢 Cada tupper Guille
              </span>
              <span className="text-3xl font-black text-[#30D158] block mt-1">
                {guillePerTupper}g
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#FF2D55]/15 border border-[#FF2D55]/30 text-center">
              <span className="text-xs font-extrabold text-[#FF2D55] block">
                🔴 Cada tupper Alba
              </span>
              <span className="text-3xl font-black text-[#FF2D55] block mt-1">
                {albaPerTupper}g
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
