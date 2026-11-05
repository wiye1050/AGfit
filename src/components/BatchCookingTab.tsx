import React, { useEffect, useState } from 'react';
import {
  BatchTrack,
  DayPlan,
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

  const batchSummary = calculateWeeklyBatchSummary(days);
  const completedCount = BATCH_COOKING_STEPS.filter((s) => completedStepIds[s.id]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
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
            Pasos
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
            Tuppers
          </button>
        </div>
      </div>

      {subTab === 'pasos' && (
        <div className="space-y-2.5">
          {BATCH_COOKING_STEPS.map((step, idx) => {
            const done = Boolean(completedStepIds[step.id]);
            const timer = stepTimers[step.id] || {
              remainingSec: step.durationTimerSec,
              running: false,
            };

            return (
              <div
                key={step.id}
                onClick={() => onToggleStepCompleted(step.id)}
                className={`apple-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-opacity ${
                  done ? 'opacity-45' : ''
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      done
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'border border-slate-300 dark:border-slate-600 text-slate-400'
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                      {TRACK_LABELS[step.track]} · Min {step.minuteStart}–{step.minuteEnd}
                    </span>
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

                <button
                  type="button"
                  onClick={(e) => toggleTimer(step.id, step.durationTimerSec, e)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    timer.running
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                      : 'apple-pill-surface text-slate-600 dark:text-slate-300'
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
              className="w-full py-2.5 text-xs font-medium text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              Reiniciar pasos
            </button>
          )}
        </div>
      )}

      {subTab === 'tuppers' && (
        <div className="space-y-2.5">
          {batchSummary.map((item) => (
            <div key={item.recipeId} className="apple-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {item.recipeTitle}
                </h3>
                <span className="text-xs font-semibold text-slate-400 shrink-0">
                  {item.occurrencesCount} días
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] space-y-0.5">
                  <span className="text-slate-400 block">Tupper Guille</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white block">
                    {item.guilleCookedPerTupperG} g
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {item.guilleRawPerMealSummary}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] space-y-0.5">
                  <span className="text-slate-400 block">Tupper Alba</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white block">
                    {item.albaCookedPerTupperG} g
                  </span>
                  <span className="text-[11px] text-slate-400 block">
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
