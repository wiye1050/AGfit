import React, { useState } from 'react';
import {
  AlertTriangle,
  Cloud,
  Moon,
  Scale,
  Snowflake,
  Sun,
  X,
} from 'lucide-react';
import {
  DayId,
  DayPlan,
  ProfileView,
  ThemeMode,
  WeightEntry,
} from '../types';
import { RECIPE_MAP } from '../data/recipes';

interface TodayHeaderProps {
  days: DayPlan[];
  selectedDayId: DayId;
  todayDayId: DayId;
  onSelectDay: (day: DayId) => void;
  profileView: ProfileView;
  onChangeProfileView: (view: ProfileView) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  weightLogs: WeightEntry[];
  onAddWeightLog: (entry: Omit<WeightEntry, 'id'>) => void;
  onToggleSupplement: (
    day: DayId,
    key: 'guilleCreatine' | 'guilleWhey' | 'albaCreatine' | 'albaWhey'
  ) => void;
  onAutoFixLegPadelConflict: (dayIndex: number) => void;
  onOpenGoogleModal: () => void;
  onExportSheetsCsv: () => void;
  syncActive: boolean;
}

const SHIFT_SHORT_BADGE: Record<string, string> = {
  manana: '☀️ M',
  tarde: '🌆 T',
  noche: '🌙 N',
  saliente: '🛌 S',
  libre: '🎉 L',
};

export const TodayHeader: React.FC<TodayHeaderProps> = ({
  days,
  selectedDayId,
  todayDayId,
  onSelectDay,
  profileView,
  onChangeProfileView,
  theme,
  onToggleTheme,
  weightLogs,
  onAddWeightLog,
  onToggleSupplement,
  onAutoFixLegPadelConflict,
  onOpenGoogleModal,
  syncActive,
}) => {
  const [showBioSheet, setShowBioSheet] = useState(false);
  const [newGuilleWeight, setNewGuilleWeight] = useState('84.0');
  const [newAlbaWeight, setNewAlbaWeight] = useState('53.0');

  const currentDayIndex = days.findIndex((d) => d.day === selectedDayId);
  const currentDay = days[currentDayIndex] || days[0];
  const nextDay = days[(currentDayIndex + 1) % days.length];

  const tomorrowMeals = [
    RECIPE_MAP[nextDay.meals.comida],
    RECIPE_MAP[nextDay.meals.cena],
  ].filter(Boolean);
  const tomorrowDefrost = tomorrowMeals.find((r) => Boolean(r?.defrostAlert));

  const hasLegPadelConflict =
    (currentDay.guilleTraining === 'pierna' && nextDay.guilleTraining === 'padel') ||
    (currentDay.guilleTraining === 'padel' &&
      days[(currentDayIndex - 1 + days.length) % days.length].guilleTraining === 'pierna');

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const g = parseFloat(newGuilleWeight);
    const a = parseFloat(newAlbaWeight);
    if (isNaN(g) || isNaN(a)) return;
    onAddWeightLog({
      weekLabel: `Sem ${weightLogs.length + 1}`,
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      guilleWeightKg: g,
      albaWeightKg: a,
    });
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#F2F2F7]/90 dark:bg-black/85 backdrop-blur-2xl border-b border-black/5 dark:border-white/10">
        <div className="max-w-3xl mx-auto px-4 pt-2.5 pb-2 space-y-2">
          {/* Row 1: Brand + Who is looking (Guille | Alba | Ambos) + Utilities */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#30D158] flex items-center justify-center text-black font-black text-xs">
                AG
              </div>
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white hidden sm:inline">
                AGfit
              </span>
            </div>

            {/* Primary Person Switcher: Clear color coding */}
            <div className="apple-pill-surface p-1 rounded-full inline-flex items-center">
              <button
                type="button"
                onClick={() => onChangeProfileView('guille')}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  profileView === 'guille'
                    ? 'bg-[#30D158] text-black shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                🟢 Guille
              </button>
              <button
                type="button"
                onClick={() => onChangeProfileView('alba')}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  profileView === 'alba'
                    ? 'bg-[#FF2D55] text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                🔴 Alba
              </button>
              <button
                type="button"
                onClick={() => onChangeProfileView('pareja')}
                className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  profileView === 'pareja'
                    ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Ambos
              </button>
            </div>

            {/* Right Utility Icons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowBioSheet(true)}
                className="h-8 px-2.5 rounded-full apple-pill-surface flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:opacity-80 cursor-pointer"
                title="Peso y Creatina/Whey"
              >
                <Scale className="w-3.5 h-3.5 text-[#30D158]" />
                <span className="hidden sm:inline">Peso</span>
              </button>
              <button
                type="button"
                onClick={onOpenGoogleModal}
                className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-700 dark:text-slate-200 hover:opacity-80 cursor-pointer"
                title="Sincronización Nube / Google"
              >
                <Cloud className={`w-4 h-4 ${syncActive ? 'text-[#30D158]' : 'text-[#0A84FF]'}`} />
              </button>
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-700 dark:text-slate-200 hover:opacity-80 cursor-pointer"
                title="Cambiar tema Claro / Oscuro"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[#FF9F0A]" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>
            </div>
          </div>

          {/* Row 2: Compact 7-Day Strip with "HOY" indicator & Alba's shift micro-badge */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const isSelected = d.day === selectedDayId;
              const isToday = d.day === todayDayId;
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => onSelectDay(d.day)}
                  className={`py-1.5 px-1 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm'
                      : isToday
                      ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-extrabold">{d.shortLabel}</span>
                    {isToday && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-[#30D158]' : 'bg-[#30D158]'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-bold leading-tight mt-0.5 ${
                      isSelected
                        ? 'text-white/80 dark:text-black/75'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {SHIFT_SHORT_BADGE[d.albaShift]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Actionable Alert Banner (Only when needed) */}
          {(tomorrowDefrost || hasLegPadelConflict) && (
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {tomorrowDefrost && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A84FF]/15 text-[#0A84FF] text-xs font-semibold">
                  <Snowflake className="w-3.5 h-3.5 shrink-0" />
                  <span>Sacar salmón hoy para mañana ({nextDay.label})</span>
                </div>
              )}
              {hasLegPadelConflict && (
                <button
                  type="button"
                  onClick={() => onAutoFixLegPadelConflict(currentDayIndex)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] text-xs font-bold cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Pierna pegada a Pádel · Toca para separar</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Bottom Sheet: Weight & Daily Supplements */}
      {showBioSheet && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowBioSheet(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-t-3xl sm:rounded-3xl p-6 space-y-5 animate-sheet border-t sm:border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto sm:hidden" />
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Peso y Suplementos
              </h3>
              <button
                type="button"
                onClick={() => setShowBioSheet(false)}
                className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Suplementos de Hoy ({currentDay.label})
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSupplement(currentDay.day, 'guilleCreatine')}
                  className={`p-3.5 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer ${
                    currentDay.supplementsCheck.guilleCreatine
                      ? 'bg-[#30D158] text-black'
                      : 'apple-pill-surface text-slate-500'
                  }`}
                >
                  {currentDay.supplementsCheck.guilleCreatine ? '✓ ' : '○ '}
                  Creatina 5g
                </button>
                <button
                  type="button"
                  onClick={() => onToggleSupplement(currentDay.day, 'guilleWhey')}
                  className={`p-3.5 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer ${
                    currentDay.supplementsCheck.guilleWhey
                      ? 'bg-[#30D158] text-black'
                      : 'apple-pill-surface text-slate-500'
                  }`}
                >
                  {currentDay.supplementsCheck.guilleWhey ? '✓ ' : '○ '}
                  Whey Proteína
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Evolución de Peso
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {weightLogs.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] text-xs"
                  >
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {w.weekLabel} · {w.date}
                    </span>
                    <div className="flex gap-3 font-bold">
                      <span className="text-[#30D158]">🟢 {w.guilleWeightKg.toFixed(1)} kg</span>
                      <span className="text-[#FF2D55]">🔴 {w.albaWeightKg.toFixed(1)} kg</span>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSaveWeight} className="grid grid-cols-3 gap-2 pt-2">
                <input
                  type="number"
                  step="0.1"
                  value={newGuilleWeight}
                  onChange={(e) => setNewGuilleWeight(e.target.value)}
                  placeholder="Guille kg"
                  className="px-3 py-2.5 rounded-2xl text-xs font-bold apple-pill-surface text-center"
                />
                <input
                  type="number"
                  step="0.1"
                  value={newAlbaWeight}
                  onChange={(e) => setNewAlbaWeight(e.target.value)}
                  placeholder="Alba kg"
                  className="px-3 py-2.5 rounded-2xl text-xs font-bold apple-pill-surface text-center"
                />
                <button
                  type="submit"
                  className="px-3 py-2.5 rounded-2xl text-xs font-bold bg-[#30D158] text-black cursor-pointer"
                >
                  Guardar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
