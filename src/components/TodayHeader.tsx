import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Cloud,
  Coffee,
  Download,
  Flame,
  Moon,
  Scale,
  Settings,
  Snowflake,
  Sparkles,
  Sun,
  TrendingDown,
  Users,
} from 'lucide-react';
import {
  DayId,
  DayPlan,
  ProfileView,
  ThemeMode,
  WeightEntry,
} from '../types';
import {
  ALBA_SHIFT_LABELS,
  computeDayNutrition,
  GUILLE_SHIFT_LABELS,
  TRAINING_LABELS,
} from '../utils/nutritionEngine';
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
  onExportSheetsCsv,
  syncActive,
}) => {
  const [showBioPanel, setShowBioPanel] = useState(false);
  const [newGuilleWeight, setNewGuilleWeight] = useState('84.5');
  const [newAlbaWeight, setNewAlbaWeight] = useState('53.0');
  const [newWeekLabel, setNewWeekLabel] = useState(`Sem ${weightLogs.length + 1}`);

  const currentDayIndex = days.findIndex((d) => d.day === selectedDayId);
  const currentDay = days[currentDayIndex] || days[0];
  const nextDay = days[(currentDayIndex + 1) % days.length];

  const nutrition = computeDayNutrition(currentDay);

  // Check if tomorrow uses fresh salmon in Airfryer
  const tomorrowMeals = [
    RECIPE_MAP[nextDay.meals.comida],
    RECIPE_MAP[nextDay.meals.cena],
  ].filter(Boolean);
  const tomorrowDefrostRecipe = tomorrowMeals.find((r) => Boolean(r?.defrostAlert));

  // Check Leg + Padel interference for Guille or Alba
  const hasLegPadelConflictGuille =
    (currentDay.guilleTraining === 'pierna' && nextDay.guilleTraining === 'padel') ||
    (currentDay.guilleTraining === 'padel' &&
      days[(currentDayIndex - 1 + days.length) % days.length].guilleTraining === 'pierna');

  // Weekly adherence summary
  const weeklyStats = days.reduce(
    (acc, d) => {
      const n = computeDayNutrition(d);
      acc.guilleTotalKcal += n.guillePlanned.kcal;
      acc.guilleTotalProtein += n.guillePlanned.protein;
      acc.albaTotalKcal += n.albaPlanned.kcal;
      if (d.guilleTraining !== 'descanso_total') acc.guilleActiveDays += 1;
      if (d.albaTraining !== 'descanso_total') acc.albaActiveDays += 1;
      return acc;
    },
    {
      guilleTotalKcal: 0,
      guilleTotalProtein: 0,
      albaTotalKcal: 0,
      guilleActiveDays: 0,
      albaActiveDays: 0,
    }
  );

  const avgGuilleKcal = Math.round(weeklyStats.guilleTotalKcal / 7);
  const avgGuilleProtein = Math.round(weeklyStats.guilleTotalProtein / 7);
  const latestWeight = weightLogs[weightLogs.length - 1];
  const firstWeight = weightLogs[0];
  const guilleDeltaKg =
    latestWeight && firstWeight
      ? (latestWeight.guilleWeightKg - firstWeight.guilleWeightKg).toFixed(1)
      : '0.0';

  const handleSaveWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const g = parseFloat(newGuilleWeight);
    const a = parseFloat(newAlbaWeight);
    if (isNaN(g) || isNaN(a)) return;
    onAddWeightLog({
      weekLabel: newWeekLabel || `Sem ${weightLogs.length + 1}`,
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      guilleWeightKg: g,
      albaWeightKg: a,
    });
    setNewWeekLabel(`Sem ${weightLogs.length + 2}`);
  };

  return (
    <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 space-y-3">
        {/* Top Row: Brand, Profile Switcher, Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-rose-500 p-[2px] shadow-lg shadow-emerald-500/15">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-sm tracking-tight text-white">
                AG<span className="text-emerald-400">fit</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                  AGfit <span className="font-normal text-slate-500 dark:text-slate-400 text-xs sm:text-sm">· Guille & Alba</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  📍 Oviedo · HUCA & Enjoy
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Nutrición por Turnos · Ciclado HC · Batch Cooking · Biomecánica Pádel
              </p>
            </div>
          </div>

          {/* Profile View Pill Switcher + Utility Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onChangeProfileView('pareja')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  profileView === 'pareja'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-500" />
                <span>Pareja</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeProfileView('guille')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  profileView === 'guille'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Guille</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeProfileView('alba')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  profileView === 'alba'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-500'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Alba</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowBioPanel((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showBioPanel
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40'
              }`}
              title="Peso corporal, adherencia semanal y protocolo de suplementos"
            >
              <Scale className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden md:inline">Peso & Adherencia</span>
              <span className="text-[11px] font-bold text-emerald-500">{guilleDeltaKg}kg</span>
            </button>

            <button
              type="button"
              onClick={onOpenGoogleModal}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-cyan-500/40 transition-all cursor-pointer"
              title="Conectar Google Auth, Firebase Firestore, Google Calendar y Sheets"
            >
              <Cloud className={`w-3.5 h-3.5 ${syncActive ? 'text-emerald-400' : 'text-cyan-500'}`} />
              <span className="hidden sm:inline">Google Sync</span>
            </button>

            <button
              type="button"
              onClick={onExportSheetsCsv}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500/40 transition-all cursor-pointer"
              title="Descargar CSV compatible con Google Sheets"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Sheets CSV</span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
              aria-label="Cambiar tema claro/oscuro"
              title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro Deportivo'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Day Selector Bar + Operational Summary of Selected Day */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-1">
          {/* 7-Day Selector Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-print">
            {days.map((d) => {
              const isSelected = d.day === selectedDayId;
              const isNight = d.albaShift === 'noche';
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => onSelectDay(d.day)}
                  className={`flex flex-col items-center min-w-[52px] px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-emerald-500/20 to-cyan-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-300 shadow-sm'
                      : 'bg-slate-100/70 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] tracking-wider uppercase">{d.shortLabel}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={`Guille: ${TRAINING_LABELS[d.guilleTraining].short}`} />
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isNight ? 'bg-indigo-400 animate-pulse' : 'bg-rose-400'
                      }`}
                      title={`Alba: ${ALBA_SHIFT_LABELS[d.albaShift]}`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Live Macros & Shift Status Strip for Selected Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 lg:max-w-3xl">
            {(profileView === 'pareja' || profileView === 'guille') && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-500/5 dark:bg-emerald-950/25 border border-emerald-500/20">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      GUILLE
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 font-semibold">
                      Ciclado {nutrition.guilleLevel.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      · {GUILLE_SHIFT_LABELS[currentDay.guilleShift]}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {nutrition.guillePlanned.kcal} / {nutrition.guilleTarget.kcal} kcal
                    </span>
                    <span>·</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {nutrition.guillePlanned.protein}g P
                    </span>
                    <span>·</span>
                    <span>{nutrition.guillePlanned.carbs}g HC</span>
                    <span>·</span>
                    <span>{nutrition.guillePlanned.fat}g G</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-900/10 dark:bg-slate-900 text-emerald-500 shrink-0">
                  {TRAINING_LABELS[currentDay.guilleTraining].short}
                </span>
              </div>
            )}

            {(profileView === 'pareja' || profileView === 'alba') && (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-rose-500/5 dark:bg-rose-950/25 border border-rose-500/20">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                      ALBA
                    </span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-300 font-semibold">
                      {ALBA_SHIFT_LABELS[currentDay.albaShift]}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {nutrition.albaPlanned.kcal} / {nutrition.albaTarget.kcal} kcal
                    </span>
                    <span>·</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      {nutrition.albaPlanned.protein}g P
                    </span>
                    <span>·</span>
                    <span>{nutrition.albaPlanned.carbs}g HC</span>
                    <span>·</span>
                    <span>{nutrition.albaPlanned.fat}g G</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-900/10 dark:bg-slate-900 text-rose-400 shrink-0">
                  {currentDay.albaTraining === 'clase_dirigida'
                    ? currentDay.albaDirectedClass
                    : TRAINING_LABELS[currentDay.albaTraining].short}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Smart Contextual Alerts (Defrost Salmon / Leg-Padel Interference / Night Shift HUCA) */}
        {(tomorrowDefrostRecipe || hasLegPadelConflictGuille || currentDay.albaShift === 'noche') && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {tomorrowDefrostRecipe && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-700 dark:text-cyan-300">
                <Snowflake className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <span>
                  <strong>Aviso {currentDay.label} noche:</strong> Mañana ({nextDay.label}) toca{' '}
                  <span className="underline">{tomorrowDefrostRecipe.title}</span> en Airfryer. Saca hoy el salmón a la nevera.
                </span>
              </div>
            )}

            {hasLegPadelConflictGuille && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>
                    <strong>Biomecánica Pádel:</strong> Tienes <em>Pierna pesada</em> pegada a un <em>Partido de Pádel</em>. Riesgo de sobrecarga en gemelo/isquios.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onAutoFixLegPadelConflict(currentDayIndex)}
                  className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] hover:bg-amber-400 transition-colors cursor-pointer shrink-0"
                >
                  Reordenar con Empuje/Tirón
                </button>
              </div>
            )}

            {currentDay.albaShift === 'noche' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-700 dark:text-indigo-300">
                <Coffee className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                <span>
                  <strong>Protocolo Noche HUCA (Alba):</strong> 5ª ingesta (Snack 02:30h) activada automáticamente · Último café antes de las 02:00h.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Expandable Bio-Tracking, Supplements & Weekly Adherence Drawer */}
        {showBioPanel && (
          <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fadeIn">
            {/* Column 1: Weight Tracker */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                  Evolución de Peso (Objetivo Guille: -0.45 kg/sem)
                </h3>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {weightLogs.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800"
                  >
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      {w.weekLabel} ({w.date})
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Guille: {w.guilleWeightKg.toFixed(1)} kg
                      </span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        Alba: {w.albaWeightKg.toFixed(1)} kg
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSaveWeight} className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={newWeekLabel}
                  onChange={(e) => setNewWeekLabel(e.target.value)}
                  placeholder="Semana"
                  className="w-20 px-2 py-1 rounded-lg text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
                <input
                  type="number"
                  step="0.1"
                  value={newGuilleWeight}
                  onChange={(e) => setNewGuilleWeight(e.target.value)}
                  placeholder="Guille kg"
                  className="w-20 px-2 py-1 rounded-lg text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
                <input
                  type="number"
                  step="0.1"
                  value={newAlbaWeight}
                  onChange={(e) => setNewAlbaWeight(e.target.value)}
                  placeholder="Alba kg"
                  className="w-20 px-2 py-1 rounded-lg text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 cursor-pointer"
                >
                  Guardar
                </button>
              </form>
            </div>

            {/* Column 2: Daily Supplements & Caffeine Protocol */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-amber-500" />
                Suplementación y Cafeína ({currentDay.label})
              </h3>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 space-y-2 text-xs">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-emerald-500">Guille:</strong> {nutrition.caffeineProtocolGuille}
                </p>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  <strong className="text-rose-400">Alba:</strong> {nutrition.caffeineProtocolAlba}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onToggleSupplement(currentDay.day, 'guilleCreatine')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                      currentDay.supplementsCheck.guilleCreatine
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {currentDay.supplementsCheck.guilleCreatine ? '✓' : '○'} Creatina 5g (Guille)
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleSupplement(currentDay.day, 'guilleWhey')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                      currentDay.supplementsCheck.guilleWhey
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {currentDay.supplementsCheck.guilleWhey ? '✓' : '○'} Whey Post-Entreno (Guille)
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleSupplement(currentDay.day, 'albaWhey')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-all ${
                      currentDay.supplementsCheck.albaWhey
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {currentDay.supplementsCheck.albaWhey ? '✓' : '○'} Suplemento / Proteína (Alba)
                  </button>
                </div>
              </div>
            </div>

            {/* Column 3: Weekly Adherence Summary */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Balance y Adherencia Semanal (L-D)
              </h3>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Media Diaria Guille (Déficit -450):</span>
                  <span className="font-bold text-emerald-500">
                    {avgGuilleKcal} kcal · {avgGuilleProtein}g Proteína
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Media Diaria Alba (Mantenimiento):</span>
                  <span className="font-bold text-rose-400">
                    {Math.round(weeklyStats.albaTotalKcal / 7)} kcal
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Días Activos Planificados:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Guille: {weeklyStats.guilleActiveDays}/7 · Alba: {weeklyStats.albaActiveDays}/7
                  </span>
                </div>
                <div className="pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  ✓ 0% Tomate crudo (Guille) · ✓ 0% Repollo/Coliflor · ✓ Leche Sin Lactosa
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
