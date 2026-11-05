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
      <header className="sticky top-0 z-30 bg-[#F2F2F7]/90 dark:bg-black/85 backdrop-blur-2xl border-b border-black/5 dark:border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2.5">
          {/* Top Minimal Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                AGfit
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  syncActive ? 'bg-[#30D158]' : 'bg-slate-400'
                }`}
                title={syncActive ? 'Sincronizado en línea' : 'Modo local'}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setWeightInput(String(currentWeight));
                  setShowWeightSheet(true);
                }}
                className="px-3 py-1 rounded-full apple-pill-surface text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                {currentWeight.toFixed(1)} kg
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                className="w-7 h-7 rounded-full apple-pill-surface flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer"
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
                className="px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-white dark:text-black text-xs font-semibold cursor-pointer"
                title="Cambiar perfil"
              >
                {isGuille ? 'Guille' : 'Alba'}
              </button>
            </div>
          </div>

          {/* Clean 7-Day Strip (only on Menu tab) */}
          {showDayStrip && (
            <div className="grid grid-cols-7 gap-1 pt-0.5">
              {days.map((d) => {
                const isSelected = d.day === selectedDayId;
                const isToday = d.day === todayDayId;
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => onSelectDay(d.day)}
                    className={`py-2 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black font-bold'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium'
                    }`}
                  >
                    <span className="text-xs">{d.shortLabel}</span>
                    {isToday && (
                      <span
                        className={`w-1 h-1 rounded-full mt-1 ${
                          isSelected
                            ? 'bg-white dark:bg-black'
                            : 'bg-slate-900 dark:bg-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      {/* Minimal Weight Sheet */}
      {showWeightSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowWeightSheet(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl p-6 space-y-4 animate-sheet border-t sm:border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Peso · {isGuille ? 'Guille' : 'Alba'}
              </h3>
              <button
                type="button"
                onClick={() => setShowWeightSheet(false)}
                className="w-7 h-7 rounded-full apple-pill-surface flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {weightLogs.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] text-xs"
                >
                  <span className="text-slate-400">
                    {w.weekLabel} · {w.date}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
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
                className="flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold apple-pill-surface text-center"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-black cursor-pointer"
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
