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

export const TodayHeader: React.FC<TodayHeaderProps> = ({
  days,
  selectedDayId,
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
      <header className="sticky top-0 z-30 bg-[#F2F2F7]/85 dark:bg-black/80 backdrop-blur-2xl border-b border-black/5 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-2.5 space-y-3">
          {/* Row 1: Minimal Apple Title + Segmented Profile Switcher + 3 Circle Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#30D158] to-[#0A84FF] flex items-center justify-center text-black font-black text-xs shadow-sm">
                AG
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                AGfit
              </span>
            </div>

            {/* iOS Segmented Control */}
            <div className="apple-pill-surface p-1 rounded-full inline-flex items-center">
              {(['pareja', 'guille', 'alba'] as ProfileView[]).map((view) => {
                const active = profileView === view;
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => onChangeProfileView(view)}
                    className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer capitalize ${
                      active
                        ? 'bg-white dark:bg-[#3A3A3C] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {view === 'pareja' ? 'Ambos' : view}
                  </button>
                );
              })}
            </div>

            {/* Right Circular Utility Icons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowBioSheet(true)}
                className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-700 dark:text-slate-200 hover:opacity-80 cursor-pointer"
                title="Peso y Suplementos"
              >
                <Scale className="w-4 h-4 text-[#30D158]" />
              </button>
              <button
                type="button"
                onClick={onOpenGoogleModal}
                className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-700 dark:text-slate-200 hover:opacity-80 cursor-pointer"
                title="Sincronización Google Calendar, Sheets y Firebase"
              >
                <Cloud className={`w-4 h-4 ${syncActive ? 'text-[#30D158]' : 'text-[#0A84FF]'}`} />
              </button>
              <button
                type="button"
                onClick={onToggleTheme}
                className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-700 dark:text-slate-200 hover:opacity-80 cursor-pointer"
                title="Cambiar tema"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-[#FF9F0A]" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-700" />
                )}
              </button>
            </div>
          </div>

          {/* Row 2: iOS Calendar Week Strip (L M X J V S D) */}
          <div className="grid grid-cols-7 gap-1.5">
            {days.map((d) => {
              const isSelected = d.day === selectedDayId;
              const isNight = d.albaShift === 'noche';
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => onSelectDay(d.day)}
                  className={`py-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm scale-[1.02]'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="text-[11px] font-bold">{d.shortLabel}</span>
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        d.guilleTraining === 'padel'
                          ? 'bg-[#FF9F0A]'
                          : 'bg-[#30D158]'
                      }`}
                    />
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isNight ? 'bg-[#5E5CE6]' : 'bg-[#FF2D55]'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Minimal 1-Line Contextual Pill (only when actionable) */}
          {(tomorrowDefrost || hasLegPadelConflict) && (
            <div className="flex flex-wrap items-center gap-2">
              {tomorrowDefrost && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0A84FF]/15 text-[#0A84FF] text-xs font-medium">
                  <Snowflake className="w-3.5 h-3.5 shrink-0" />
                  <span>Sacar salmón hoy para mañana ({nextDay.label})</span>
                </div>
              )}
              {hasLegPadelConflict && (
                <button
                  type="button"
                  onClick={() => onAutoFixLegPadelConflict(currentDayIndex)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF9F0A]/15 text-[#FF9F0A] text-xs font-semibold cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Pierna pegada a Pádel · Toca para reordenar</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* iOS Bottom Sheet for Weight & Supplements */}
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

            {/* Daily Supplements Pills */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Checks de Hoy ({currentDay.label})
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onToggleSupplement(currentDay.day, 'guilleCreatine')}
                  className={`p-3 rounded-2xl text-xs font-semibold text-left transition-all cursor-pointer ${
                    currentDay.supplementsCheck.guilleCreatine
                      ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40'
                      : 'apple-pill-surface text-slate-500'
                  }`}
                >
                  {currentDay.supplementsCheck.guilleCreatine ? '✓ ' : '○ '}
                  Creatina 5g (Guille)
                </button>
                <button
                  type="button"
                  onClick={() => onToggleSupplement(currentDay.day, 'guilleWhey')}
                  className={`p-3 rounded-2xl text-xs font-semibold text-left transition-all cursor-pointer ${
                    currentDay.supplementsCheck.guilleWhey
                      ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40'
                      : 'apple-pill-surface text-slate-500'
                  }`}
                >
                  {currentDay.supplementsCheck.guilleWhey ? '✓ ' : '○ '}
                  Whey Proteína (Guille)
                </button>
              </div>
            </div>

            {/* Weight History */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Evolución Semanal
              </span>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {weightLogs.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-[#2C2C2E] text-xs"
                  >
                    <span className="font-medium text-slate-500 dark:text-slate-400">
                      {w.weekLabel} · {w.date}
                    </span>
                    <div className="flex gap-3 font-bold">
                      <span className="text-[#30D158]">{w.guilleWeightKg.toFixed(1)} kg</span>
                      <span className="text-[#FF2D55]">{w.albaWeightKg.toFixed(1)} kg</span>
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
                  Registrar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
