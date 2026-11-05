import React, { useState } from 'react';
import { Moon, Sun, X } from 'lucide-react';
import {
  DayId,
  DayPlan,
  ThemeMode,
  WeightEntry,
} from '../types';

interface TodayHeaderProps {
  days: DayPlan[];
  selectedDayId: DayId;
  todayDayId: DayId;
  onSelectDay: (day: DayId) => void;
  activeUser: 'guille' | 'alba';
  onSwitchUser: (user: 'guille' | 'alba' | null) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  weightLogs: WeightEntry[];
  onAddWeightLog: (entry: Omit<WeightEntry, 'id'>) => void;
  syncActive: boolean;
  showDayStrip: boolean;
}

export const TodayHeader: React.FC<TodayHeaderProps> = ({
  days,
  selectedDayId,
  todayDayId,
  onSelectDay,
  activeUser,
  onSwitchUser,
  theme,
  onToggleTheme,
  weightLogs,
  onAddWeightLog,
  syncActive,
  showDayStrip,
}) => {
  const [showWeightSheet, setShowWeightSheet] = useState(false);
  const isGuille = activeUser === 'guille';
  const lastLog = weightLogs[weightLogs.length - 1];
  const currentWeight = isGuille
    ? lastLog?.guilleWeightKg ?? 84.0
    : lastLog?.albaWeightKg ?? 53.0;

  const [weightInput, setWeightInput] = useState(String(currentWeight));

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightInput);
    if (isNaN(val)) return;
    onAddWeightLog({
      weekLabel: `Sem ${weightLogs.length + 1}`,
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      guilleWeightKg: isGuille ? val : lastLog?.guilleWeightKg ?? 84.0,
      albaWeightKg: !isGuille ? val : lastLog?.albaWeightKg ?? 53.0,
    });
    setShowWeightSheet(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#F4F4F6]/85 dark:bg-[#09090B]/80 backdrop-blur-2xl border-b border-black/5 dark:border-white/[0.07]">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-3">
          {/* Row 1: Athletic Brand Mark + Right Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  syncActive ? 'bg-[#30D158]' : 'bg-zinc-500'
                }`}
                title={syncActive ? 'Conectado en tiempo real' : 'Modo local'}
              />
              <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-slate-900 dark:text-white">
                AGFIT
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setWeightInput(String(currentWeight));
                  setShowWeightSheet(true);
                }}
                className="px-3 py-1.5 rounded-full apple-pill-surface text-xs font-bold text-slate-700 dark:text-zinc-300 hover:opacity-80 cursor-pointer"
              >
                {currentWeight.toFixed(1)} kg
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-600 dark:text-zinc-300 hover:opacity-80 cursor-pointer"
                aria-label="Cambiar tema"
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <Moon className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onSwitchUser(null)}
                className="pl-2 pr-3 py-1 rounded-full apple-pill-surface border border-black/5 dark:border-white/10 flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white hover:border-[#30D158]/50 transition-colors cursor-pointer"
                title="Cambiar perfil"
              >
                <span className="w-5 h-5 rounded-full bg-[#30D158]/20 text-[#30D158] flex items-center justify-center text-[10px] font-black">
                  {isGuille ? 'G' : 'A'}
                </span>
                <span>{isGuille ? 'Guille' : 'Alba'}</span>
              </button>
            </div>
          </div>

          {/* Row 2: Clean 7-Day Strip (L M X J V S D) */}
          {showDayStrip && (
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d) => {
                const isSelected = d.day === selectedDayId;
                const isToday = d.day === todayDayId;
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => onSelectDay(d.day)}
                    className={`py-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-extrabold shadow-sm'
                        : 'text-slate-400 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-200 font-semibold'
                    }`}
                  >
                    <span className="text-xs">{d.shortLabel}</span>
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-1 ${
                        isToday
                          ? 'bg-[#30D158]'
                          : 'bg-transparent'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Weight Sheet */}
      {showWeightSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowWeightSheet(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#141416] rounded-t-3xl sm:rounded-3xl p-6 space-y-5 animate-sheet border-t sm:border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#30D158] block">
                  Registro corporal
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Peso · {isGuille ? 'Guille' : 'Alba'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWeightSheet(false)}
                className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {weightLogs.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl apple-pill-surface text-xs"
                >
                  <span className="font-medium text-slate-400">
                    {w.weekLabel} · {w.date}
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {(isGuille ? w.guilleWeightKg : w.albaWeightKg).toFixed(1)} kg
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSaveWeight} className="flex gap-2 pt-1">
              <input
                type="number"
                step="0.1"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-2xl text-sm font-extrabold apple-pill-surface text-center outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-2xl text-xs font-extrabold bg-[#30D158] text-black cursor-pointer"
              >
                Guardar
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
