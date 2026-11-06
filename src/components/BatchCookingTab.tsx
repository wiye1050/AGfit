import React, { useEffect, useState } from 'react';
import {
  BatchTrack,
  DayPlan,
  Recipe,
} from '../types';
import {
  BATCH_COOKING_STEPS,
  calculateWeeklyBatchSummary,
} from '../data/batchCooking';
import { Check, Pause, Play } from 'lucide-react';

interface BatchCookingTabProps {
  days: DayPlan[];
  completedStepIds: Record<string, boolean>;
  onToggleStepCompleted: (stepId: string) => void;
  onResetBatchSteps: () => void;
  customRecipes?: Recipe[];
}

const TRACK_LABELS: Record<BatchTrack, string> = {
  horno: 'Horno 200°C',
  olla_expres: 'Olla exprés',
  vitro: 'Vitrocerámica',
  airfryer: 'Airfryer',
};

export const BatchCookingTab: React.FC<BatchCookingTabProps> = ({
  days,
  completedStepIds,
  onToggleStepCompleted,
  onResetBatchSteps,
  customRecipes = [],
}) => {
  const [subTab, setSubTab] = useState<'pasos' | 'tuppers'>('pasos');
  const [stepTimers, setStepTimers] = useState<
    Record<string, { remainingSec: number; running: boolean }>
  >({});

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

  const toggleTimer = (id: string, defaultSec: number, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const batchSummary = calculateWeeklyBatchSummary(days, customRecipes);
  const completedCount = BATCH_COOKING_STEPS.filter((s) => completedStepIds[s.id]).length;
  const totalSteps = BATCH_COOKING_STEPS.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const firstUncompletedId = BATCH_COOKING_STEPS.find((s) => !completedStepIds[s.id])?.id;

  return (
    <div className="space-y-4">
      {/* Performance Header Card */}
      <div className="apple-card rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#30D158] block mb-1">
              Cocina semanal
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Batch Cooking
            </h2>
          </div>

          <div className="apple-pill-surface p-1 rounded-full inline-flex text-xs">
            <button
              type="button"
              onClick={() => setSubTab('pasos')}
              className={`px-3.5 py-1.5 rounded-full font-bold cursor-pointer transition-colors ${
                subTab === 'pasos'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                  : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              Pasos
            </button>
            <button
              type="button"
              onClick={() => setSubTab('tuppers')}
              className={`px-3.5 py-1.5 rounded-full font-bold cursor-pointer transition-colors ${
                subTab === 'tuppers'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                  : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              Tuppers
            </button>
          </div>
        </div>

        {/* Session Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500 dark:text-zinc-400">
              Progreso de cocinado
            </span>
            <span className="font-extrabold text-slate-900 dark:text-white">
              {completedCount} / {totalSteps} pasos ({progressPct}%)
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#30D158] transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {subTab === 'pasos' && (
        <div className="space-y-2.5">
          {BATCH_COOKING_STEPS.map((step, idx) => {
            const done = Boolean(completedStepIds[step.id]);
            const isNext = step.id === firstUncompletedId;
            const timer = stepTimers[step.id] || {
              remainingSec: step.durationTimerSec,
              running: false,
            };

            return (
              <div
                key={step.id}
                onClick={() => onToggleStepCompleted(step.id)}
                className={`apple-card rounded-3xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-all ${
                  done
                    ? 'opacity-45'
                    : isNext
                    ? 'ring-1 ring-[#30D158]/50'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 transition-colors ${
                      done
                        ? 'bg-[#30D158] text-black'
                        : isNext
                        ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/40'
                        : 'border border-slate-300 dark:border-white/15 text-slate-400 dark:text-zinc-500'
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                        {TRACK_LABELS[step.track]} · Min {step.minuteStart}–{step.minuteEnd}
                      </span>
                      {isNext && !done && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#30D158]">
                          · Siguiente paso
                        </span>
                      )}
                    </div>
                    <h3
                      className={`text-sm sm:text-base font-extrabold tracking-tight ${
                        done
                          ? 'line-through text-slate-400 dark:text-zinc-500'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => toggleTimer(step.id, step.durationTimerSec, e)}
                  className={`px-3.5 py-2 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                    timer.running
                      ? 'bg-[#30D158] text-black'
                      : 'apple-pill-surface text-slate-700 dark:text-zinc-200'
                  }`}
                >
                  {timer.running ? (
                    <Pause className="w-3 h-3" />
                  ) : (
                    <Play className="w-3 h-3" />
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
              className="w-full py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              Reiniciar pasos
            </button>
          )}
        </div>
      )}

      {subTab === 'tuppers' && (
        <div className="space-y-3">
          {batchSummary.map((item) => (
            <div key={item.recipeId} className="apple-card rounded-3xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {item.recipeTitle}
                </h3>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#30D158]/15 text-[#30D158] shrink-0">
                  {item.occurrencesCount} días
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                    Tupper Guille
                  </span>
                  <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white block">
                    {item.guilleCookedPerTupperG} g
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 block leading-snug">
                    {item.guilleRawPerMealSummary}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block">
                    Tupper Alba
                  </span>
                  <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white block">
                    {item.albaCookedPerTupperG} g
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 block leading-snug">
                    {item.albaRawPerMealSummary}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
