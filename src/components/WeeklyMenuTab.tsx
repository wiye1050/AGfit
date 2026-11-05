import React, { useState } from 'react';
import {
  AlbaShift,
  CustomMealOverride,
  DayId,
  DayPlan,
  GuilleShift,
  MealSlot,
  Recipe,
  TrainingType,
} from '../types';
import { RECIPES, RECIPE_MAP } from '../data/recipes';
import { computeDayNutrition } from '../utils/nutritionEngine';
import { DIRECTED_CLASSES_CATALOG, WORKOUT_SESSIONS } from '../data/workouts';
import { Check, ChevronDown, ChevronRight, X } from 'lucide-react';

interface WeeklyMenuTabProps {
  days: DayPlan[];
  selectedDayId: DayId;
  todayDayId: DayId;
  activeUser: 'guille' | 'alba';
  activeTemplateKey: 'semana_a' | 'semana_b' | 'semana_c';
  onApplyTemplate: (key: 'semana_a' | 'semana_b' | 'semana_c') => void;
  onUpdateDay: (dayId: DayId, updater: (prev: DayPlan) => DayPlan) => void;
  onGoToWorkout: () => void;
  onToggleSupplement: (
    day: DayId,
    key: 'guilleCreatine' | 'guilleWhey' | 'albaCreatine' | 'albaWhey'
  ) => void;
  customRecipes: Recipe[];
}

const MEAL_LABELS: Record<MealSlot, { title: string; time: string }> = {
  desayuno: { title: 'Desayuno', time: '08:00' },
  comida: { title: 'Comida', time: '14:30' },
  merienda: { title: 'Merienda', time: '18:00' },
  cena: { title: 'Cena', time: '21:30' },
  snack_nocturno: { title: 'Guardia noche', time: '02:30' },
};

const GUILLE_SHIFT_LABELS: Record<GuilleShift, string> = {
  manana: 'Turno de mañana',
  tarde: 'Turno de tarde',
  manana_tarde: 'Turno partido',
  libre: 'Día libre',
};

const ALBA_SHIFT_LABELS: Record<AlbaShift, string> = {
  manana: 'Mañana HUCA · 08–15h',
  tarde: 'Tarde HUCA · 15–22h',
  noche: 'Noche HUCA · 22–08h',
  saliente: 'Saliente de guardia',
  libre: 'Día libre',
};

const TRAINING_INFO: Record<TrainingType, { label: string; full: string; meta: string }> = {
  empuje: {
    label: 'Empuje',
    full: 'Empuje · Pecho, hombro y tríceps',
    meta: '55 min · 5 ejercicios',
  },
  tiron: {
    label: 'Tirón',
    full: 'Tirón · Espalda, bíceps y core',
    meta: '55 min · 5 ejercicios',
  },
  pierna: {
    label: 'Pierna',
    full: 'Pierna y glúteo',
    meta: '60 min · 5 ejercicios',
  },
  padel: {
    label: 'Pádel',
    full: 'Partido de pádel',
    meta: '90 min · Pista',
  },
  running: {
    label: 'Running',
    full: 'Sesión de running',
    meta: '45 min · Exterior',
  },
  movilidad: {
    label: 'Movilidad',
    full: 'Movilidad y prevención',
    meta: '25 min · 4 ejercicios',
  },
  clase_dirigida: {
    label: 'Clase Enjoy',
    full: 'Clase dirigida Enjoy',
    meta: '50 min · Estudio',
  },
  otra_actividad: {
    label: 'Exterior',
    full: 'Deporte exterior',
    meta: 'Sesión activa',
  },
  doble_sesion: {
    label: 'Doble sesión',
    full: 'Doble sesión · Fuerza + Pista',
    meta: 'Sesión intensa',
  },
  descanso_total: {
    label: 'Descanso',
    full: 'Día de descanso',
    meta: 'Recuperación',
  },
};

function getNowSlot(isNightShift: boolean): MealSlot {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6 && isNightShift) return 'snack_nocturno';
  if (hour >= 6 && hour < 12) return 'desayuno';
  if (hour >= 12 && hour < 16) return 'comida';
  if (hour >= 16 && hour < 20) return 'merienda';
  return 'cena';
}

function FitnessCalorieRing({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const size = 96;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(1.05, Math.max(0.08, current / (target || 2000)));
  const offset = circumference - pct * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/[0.06] dark:text-white/[0.08]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#30D158"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
          {current}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">
          kcal
        </span>
      </div>
    </div>
  );
}

export const WeeklyMenuTab: React.FC<WeeklyMenuTabProps> = ({
  days,
  selectedDayId,
  todayDayId,
  activeUser,
  activeTemplateKey,
  onApplyTemplate,
  onUpdateDay,
  onGoToWorkout,
  onToggleSupplement,
  customRecipes,
}) => {
  const isGuille = activeUser === 'guille';
  const [weightMode, setWeightMode] = useState<'crudo' | 'cocinado'>('crudo');
  const [showDayConfig, setShowDayConfig] = useState(false);

  const [activeSheetSlot, setActiveSheetSlot] = useState<MealSlot | null>(null);
  const [sheetTab, setSheetTab] = useState<'cambiar' | 'receta' | 'libre'>('cambiar');

  const [editTitle, setEditTitle] = useState('');
  const [editKcal, setEditKcal] = useState(550);
  const [editProt, setEditProt] = useState(45);
  const [editCarbs, setEditCarbs] = useState(60);

  const allRecipes = [...RECIPES, ...customRecipes];
  const recipeLookup: Record<string, Recipe> = {
    ...RECIPE_MAP,
    ...Object.fromEntries(customRecipes.map((r) => [r.id, r])),
  };

  const currentDay = days.find((d) => d.day === selectedDayId) || days[0];
  const isViewingToday = currentDay.day === todayDayId;
  const nutrition = computeDayNutrition(currentDay);

  const planned = isGuille ? nutrition.guillePlanned : nutrition.albaPlanned;
  const target = isGuille ? nutrition.guilleTarget : nutrition.albaTarget;
  const currentShiftLabel = isGuille
    ? GUILLE_SHIFT_LABELS[currentDay.guilleShift]
    : ALBA_SHIFT_LABELS[currentDay.albaShift];

  const currentTraining = isGuille
    ? currentDay.guilleTraining
    : currentDay.albaTraining;
  const workoutInfo = TRAINING_INFO[currentTraining];
  const currentTrainingFullTitle =
    !isGuille && currentTraining === 'clase_dirigida'
      ? `Clase dirigida · ${currentDay.albaDirectedClass || 'Pilates'}`
      : workoutInfo.full;

  const matchedGymSession = WORKOUT_SESSIONS.find((s) => s.type === currentTraining);
  const nowSlot = getNowSlot(!isGuille && currentDay.albaShift === 'noche');

  const slots: MealSlot[] = ['desayuno', 'comida', 'merienda', 'cena'];
  if (!isGuille && currentDay.albaShift === 'noche') {
    slots.push('snack_nocturno');
  }

  const creatineKey = isGuille ? 'guilleCreatine' : 'albaCreatine';
  const wheyKey = isGuille ? 'guilleWhey' : 'albaWhey';

  const openMealSheet = (slot: MealSlot) => {
    const custom = currentDay.customMealOverrides[slot];
    const r = recipeLookup[currentDay.meals[slot]];
    setActiveSheetSlot(slot);
    setSheetTab('cambiar');
    if (custom) {
      const m = isGuille ? custom.guilleMacros : custom.albaMacros;
      setEditTitle(custom.title);
      setEditKcal(m.kcal);
      setEditProt(m.protein);
      setEditCarbs(m.carbs);
    } else if (r) {
      const m = isGuille ? r.guilleBaseMacros : r.albaBaseMacros;
      setEditTitle(r.title);
      setEditKcal(m.kcal);
      setEditProt(m.protein);
      setEditCarbs(m.carbs);
    }
  };

  const toggleSaladoDulce = (slot: 'desayuno' | 'merienda', e: React.MouseEvent) => {
    e.stopPropagation();
    const curr = recipeLookup[currentDay.meals[slot]];
    const nextId =
      slot === 'desayuno'
        ? curr?.style === 'salado'
          ? 'des_dulce_yogur_avena'
          : 'des_salado_jamon_huevo'
        : curr?.style === 'salado'
        ? 'mer_dulce_whey_yogur'
        : 'mer_salado_pavo_queso';

    onUpdateDay(currentDay.day, (prev) => {
      const nextOverrides = { ...prev.customMealOverrides };
      delete nextOverrides[slot];
      return {
        ...prev,
        meals: { ...prev.meals, [slot]: nextId },
        customMealOverrides: nextOverrides,
      };
    });
  };

  const handleSaveManualEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSheetSlot || !editTitle.trim()) return;
    const prevCustom = currentDay.customMealOverrides[activeSheetSlot];
    const baseRecipe = recipeLookup[currentDay.meals[activeSheetSlot]];

    const newMacros = {
      kcal: Number(editKcal) || 0,
      protein: Number(editProt) || 0,
      carbs: Number(editCarbs) || 0,
      fat: 14,
    };

    const override: CustomMealOverride = {
      title: editTitle.trim(),
      guilleMacros: isGuille
        ? newMacros
        : prevCustom?.guilleMacros ||
          baseRecipe?.guilleBaseMacros || { kcal: 600, protein: 50, carbs: 65, fat: 14 },
      albaMacros: !isGuille
        ? newMacros
        : prevCustom?.albaMacros ||
          baseRecipe?.albaBaseMacros || { kcal: 450, protein: 32, carbs: 50, fat: 12 },
    };

    onUpdateDay(currentDay.day, (prev) => ({
      ...prev,
      customMealOverrides: {
        ...prev.customMealOverrides,
        [activeSheetSlot]: override,
      },
    }));
    setActiveSheetSlot(null);
  };

  return (
    <div className="space-y-4">
      {/* ========================================================= */}
      {/* 1. ENERGY & MACROS HERO CARD + COLLAPSIBLE DAY SETTINGS   */}
      {/* ========================================================= */}
      <div className="apple-card rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#30D158] block">
              {isViewingToday ? 'Hoy' : 'Plan diario'} · {currentShiftLabel}
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
              {currentDay.label}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowDayConfig((v) => !v)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              showDayConfig
                ? 'bg-[#30D158] text-black'
                : 'apple-pill-surface text-slate-700 dark:text-zinc-200'
            }`}
          >
            <span>Ajustar día</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showDayConfig ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Calorie Ring + 3 Clean Horizontal Macro Progress Bars */}
        <div className="flex items-center gap-5 pt-0.5">
          <FitnessCalorieRing current={planned.kcal} target={target.kcal} />

          <div className="flex-1 space-y-2.5">
            {/* Protein */}
            <div className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-400">Proteína</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {planned.protein}g{' '}
                  <span className="font-normal text-slate-400">
                    / {target.protein}g
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#30D158] transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (planned.protein / (target.protein || 150)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-400">Hidratos</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {planned.carbs}g{' '}
                  <span className="font-normal text-slate-400">
                    / {target.carbs}g
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0A84FF] transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (planned.carbs / (target.carbs || 200)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Fat */}
            <div className="space-y-1">
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-semibold text-slate-400">Grasa</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {planned.fat}g{' '}
                  <span className="font-normal text-slate-400">
                    / {target.fat}g
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#FF9F0A] transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (planned.fat / (target.fat || 60)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Day Configuration Drawer */}
        {showDayConfig && (
          <div className="pt-4 border-t border-black/5 dark:border-white/[0.07] space-y-4 animate-sheet">
            {/* Shift Selector */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                Turno del día
              </span>
              <div className="flex flex-wrap gap-1.5">
                {isGuille
                  ? (['manana', 'tarde', 'manana_tarde', 'libre'] as GuilleShift[]).map(
                      (s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() =>
                            onUpdateDay(currentDay.day, (prev) => ({
                              ...prev,
                              guilleShift: s,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                            currentDay.guilleShift === s
                              ? 'bg-[#30D158] text-black'
                              : 'apple-pill-surface text-slate-500 dark:text-zinc-400'
                          }`}
                        >
                          {GUILLE_SHIFT_LABELS[s]}
                        </button>
                      )
                    )
                  : (
                      ['manana', 'tarde', 'noche', 'saliente', 'libre'] as AlbaShift[]
                    ).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          onUpdateDay(currentDay.day, (prev) => ({
                            ...prev,
                            albaShift: s,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                          currentDay.albaShift === s
                            ? 'bg-[#30D158] text-black'
                            : 'apple-pill-surface text-slate-500 dark:text-zinc-400'
                        }`}
                      >
                        {ALBA_SHIFT_LABELS[s]}
                      </button>
                    ))}
              </div>
            </div>

            {/* Training Selector */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                Entrenamiento asignado
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    'empuje',
                    'tiron',
                    'pierna',
                    'padel',
                    'running',
                    'movilidad',
                    'clase_dirigida',
                    'otra_actividad',
                    'descanso_total',
                  ] as TrainingType[]
                ).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      onUpdateDay(currentDay.day, (prev) =>
                        isGuille
                          ? { ...prev, guilleTraining: t }
                          : { ...prev, albaTraining: t }
                      )
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer ${
                      currentTraining === t
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'apple-pill-surface text-slate-500 dark:text-zinc-400'
                    }`}
                  >
                    {TRAINING_INFO[t].label}
                  </button>
                ))}
              </div>

              {!isGuille && currentTraining === 'clase_dirigida' && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {DIRECTED_CLASSES_CATALOG.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() =>
                        onUpdateDay(currentDay.day, (prev) => ({
                          ...prev,
                          albaDirectedClass: cls.name,
                        }))
                      }
                      className={`px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                        currentDay.albaDirectedClass === cls.name
                          ? 'bg-[#30D158] text-black'
                          : 'apple-pill-surface text-slate-400'
                      }`}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Week Template Selector */}
            <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/[0.07]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Rotación de menú
              </span>
              <div className="flex gap-1">
                {(['semana_a', 'semana_b', 'semana_c'] as const).map((key, idx) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onApplyTemplate(key)}
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                      activeTemplateKey === key
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                        : 'apple-pill-surface text-slate-400'
                    }`}
                  >
                    Semana {['A', 'B', 'C'][idx]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. WORKOUT OF THE DAY BANNER                              */}
      {/* ========================================================= */}
      <div className="rounded-3xl p-5 sm:p-6 bg-slate-900 text-white dark:bg-white/[0.05] dark:border dark:border-white/10 flex items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#30D158]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              Entrenamiento · {workoutInfo.meta}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white truncate">
            {currentTrainingFullTitle}
          </h2>
        </div>

        {currentTraining !== 'descanso_total' && (
          <button
            type="button"
            onClick={onGoToWorkout}
            className="px-4 py-2.5 rounded-full text-xs font-extrabold bg-[#30D158] text-black shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
          >
            {matchedGymSession ? 'Empezar →' : 'Ver entreno →'}
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. MEALS SECTION HEADER + SCALE TOGGLE                    */}
      {/* ========================================================= */}
      <div className="flex items-center justify-between px-1 pt-1">
        <span className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
          Comidas del día
        </span>
        <div className="apple-pill-surface p-0.5 rounded-full inline-flex text-xs">
          <button
            type="button"
            onClick={() => setWeightMode('crudo')}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
              weightMode === 'crudo'
                ? 'bg-white dark:bg-white text-slate-900 dark:text-black shadow-sm'
                : 'text-slate-400'
            }`}
          >
            En crudo
          </button>
          <button
            type="button"
            onClick={() => setWeightMode('cocinado')}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
              weightMode === 'cocinado'
                ? 'bg-white dark:bg-white text-slate-900 dark:text-black shadow-sm'
                : 'text-slate-400'
            }`}
          >
            Cocinado
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MEAL CARDS WITH TYPOGRAPHIC INGREDIENT PILLS           */}
      {/* ========================================================= */}
      <div className="space-y-3">
        {slots.map((slot) => {
          const meta = MEAL_LABELS[slot];
          const isNow = isViewingToday && slot === nowSlot;
          const isFree = Boolean(currentDay.freeMeals[slot]);
          const custom = currentDay.customMealOverrides[slot];
          const recipe = recipeLookup[currentDay.meals[slot]];

          const carbMult =
            isGuille && (slot === 'comida' || slot === 'cena')
              ? nutrition.guilleLevel === 'alto'
                ? 1.15
                : nutrition.guilleLevel === 'bajo'
                ? 0.8
                : 1
              : 1;

          return (
            <div
              key={slot}
              onClick={() => openMealSheet(slot)}
              className={`apple-card rounded-3xl p-5 space-y-3 cursor-pointer transition-all hover:border-black/15 dark:hover:border-white/20 ${
                isNow ? 'ring-1 ring-[#30D158]/60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    {isNow && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#30D158]" />
                    )}
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-[0.2em] ${
                        isNow ? 'text-[#30D158]' : 'text-slate-400'
                      }`}
                    >
                      {meta.title} · {meta.time}
                      {isNow ? ' · Ahora' : ''}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                    {isFree
                      ? 'Comida libre'
                      : custom
                      ? custom.title
                      : recipe?.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(slot === 'desayuno' || slot === 'merienda') && !isFree && (
                    <button
                      type="button"
                      onClick={(e) => toggleSaladoDulce(slot, e)}
                      className="px-3 py-1 rounded-full text-xs font-bold apple-pill-surface text-slate-700 dark:text-zinc-300 hover:opacity-80 cursor-pointer"
                    >
                      {recipe?.style === 'salado' ? 'Salado' : 'Dulce'}
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Clean Typographic Ingredient Pills (Zero Emojis) */}
              {!isFree && recipe && !custom && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {recipe.ingredients.map((ing) => {
                    const baseRaw = isGuille
                      ? ing.guilleAmountRaw
                      : ing.albaAmountRaw;
                    const isCarb =
                      isGuille &&
                      ing.aisle === 'despensa' &&
                      (ing.name.toLowerCase().includes('arroz') ||
                        ing.name.toLowerCase().includes('pasta') ||
                        ing.name.toLowerCase().includes('cuscús') ||
                        ing.name.toLowerCase().includes('patata'));
                    const adjustedRaw = isCarb
                      ? Math.round(baseRaw * carbMult)
                      : baseRaw;
                    const val =
                      weightMode === 'crudo'
                        ? adjustedRaw
                        : Math.round(adjustedRaw * ing.cookedRatio);
                    const cleanName = ing.name
                      .split('(')[0]
                      .split('/')[0]
                      .trim()
                      .toLowerCase();

                    return (
                      <div
                        key={ing.id}
                        className="px-3 py-1.5 rounded-xl apple-pill-surface inline-flex items-baseline gap-1.5"
                      >
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {val}
                          {ing.unit}
                        </span>
                        <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                          {cleanName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* 5. DAILY HABITS ROW (CREATINA & WHEY)                     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={() => onToggleSupplement(currentDay.day, creatineKey)}
          className={`apple-card rounded-2xl p-4 flex items-center justify-between text-left transition-all cursor-pointer ${
            currentDay.supplementsCheck[creatineKey]
              ? 'ring-1 ring-[#30D158]/70'
              : ''
          }`}
        >
          <div>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
              Creatina 5g
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {currentDay.supplementsCheck[creatineKey] ? 'Completado' : 'Pendiente'}
            </span>
          </div>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              currentDay.supplementsCheck[creatineKey]
                ? 'bg-[#30D158] text-black'
                : 'border border-slate-300 dark:border-zinc-700'
            }`}
          >
            {currentDay.supplementsCheck[creatineKey] && <Check className="w-3.5 h-3.5" />}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onToggleSupplement(currentDay.day, wheyKey)}
          className={`apple-card rounded-2xl p-4 flex items-center justify-between text-left transition-all cursor-pointer ${
            currentDay.supplementsCheck[wheyKey]
              ? 'ring-1 ring-[#30D158]/70'
              : ''
          }`}
        >
          <div>
            <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
              Proteína Whey
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {currentDay.supplementsCheck[wheyKey] ? 'Completado' : 'Pendiente'}
            </span>
          </div>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              currentDay.supplementsCheck[wheyKey]
                ? 'bg-[#30D158] text-black'
                : 'border border-slate-300 dark:border-zinc-700'
            }`}
          >
            {currentDay.supplementsCheck[wheyKey] && <Check className="w-3.5 h-3.5" />}
          </div>
        </button>
      </div>

      {/* ========================================================= */}
      {/* BOTTOM SHEET: SWAP DISH / PREPARATION / MANUAL            */}
      {/* ========================================================= */}
      {activeSheetSlot && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setActiveSheetSlot(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#141416] rounded-t-3xl sm:rounded-3xl p-6 space-y-4 animate-sheet max-h-[85dvh] overflow-y-auto border-t sm:border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#30D158] block">
                  {MEAL_LABELS[activeSheetSlot].title} · {currentDay.label}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                  {currentDay.customMealOverrides[activeSheetSlot]?.title ||
                    recipeLookup[currentDay.meals[activeSheetSlot]]?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveSheetSlot(null)}
                className="w-8 h-8 rounded-full apple-pill-surface flex items-center justify-center text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="apple-pill-surface p-1 rounded-full grid grid-cols-3 text-xs">
              <button
                type="button"
                onClick={() => setSheetTab('cambiar')}
                className={`py-1.5 rounded-full font-bold cursor-pointer ${
                  sheetTab === 'cambiar'
                    ? 'bg-white dark:bg-white text-slate-900 dark:text-black shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                Cambiar plato
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('receta')}
                className={`py-1.5 rounded-full font-bold cursor-pointer ${
                  sheetTab === 'receta'
                    ? 'bg-white dark:bg-white text-slate-900 dark:text-black shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                Preparación
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('libre')}
                className={`py-1.5 rounded-full font-bold cursor-pointer ${
                  sheetTab === 'libre'
                    ? 'bg-white dark:bg-white text-slate-900 dark:text-black shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                Manual / Libre
              </button>
            </div>

            {sheetTab === 'cambiar' && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {allRecipes
                  .filter((r) => {
                    if (activeSheetSlot === 'desayuno' || activeSheetSlot === 'merienda') {
                      return r.slot === 'desayuno_merienda';
                    }
                    if (activeSheetSlot === 'snack_nocturno') {
                      return r.slot === 'snack_noche' || r.slot === 'desayuno_merienda';
                    }
                    return r.slot === 'principal';
                  })
                  .map((r) => {
                    const isSelected = currentDay.meals[activeSheetSlot] === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          onUpdateDay(currentDay.day, (prev) => {
                            const nextOverrides = { ...prev.customMealOverrides };
                            delete nextOverrides[activeSheetSlot];
                            return {
                              ...prev,
                              meals: { ...prev.meals, [activeSheetSlot]: r.id },
                              freeMeals: { ...prev.freeMeals, [activeSheetSlot]: false },
                              customMealOverrides: nextOverrides,
                            };
                          });
                          setActiveSheetSlot(null);
                        }}
                        className={`w-full p-4 rounded-2xl text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#30D158]/15 border border-[#30D158]/40'
                            : 'apple-pill-surface hover:opacity-90'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {r.title}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {isGuille ? r.portionNoteGuille : r.portionNoteAlba}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-extrabold text-[#30D158] shrink-0">
                            Activo
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}

            {sheetTab === 'receta' && (
              <div className="p-4 rounded-2xl apple-pill-surface text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                {recipeLookup[currentDay.meals[activeSheetSlot]]?.cookingNotes}
              </div>
            )}

            {sheetTab === 'libre' && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    onUpdateDay(currentDay.day, (prev) => ({
                      ...prev,
                      freeMeals: {
                        ...prev.freeMeals,
                        [activeSheetSlot]: !prev.freeMeals[activeSheetSlot],
                      },
                    }));
                    setActiveSheetSlot(null);
                  }}
                  className="w-full py-3 rounded-2xl text-xs font-bold apple-pill-surface text-slate-800 dark:text-white cursor-pointer"
                >
                  {currentDay.freeMeals[activeSheetSlot]
                    ? 'Volver al plato del menú'
                    : 'Marcar como comida libre'}
                </button>

                <form onSubmit={handleSaveManualEdit} className="space-y-3 pt-1">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Nombre del plato"
                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold apple-pill-surface outline-none"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">
                        Kcal
                      </span>
                      <input
                        type="number"
                        value={editKcal}
                        onChange={(e) => setEditKcal(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">
                        Proteína (g)
                      </span>
                      <input
                        type="number"
                        value={editProt}
                        onChange={(e) => setEditProt(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">
                        Hidratos (g)
                      </span>
                      <input
                        type="number"
                        value={editCarbs}
                        onChange={(e) => setEditCarbs(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl text-xs font-extrabold bg-[#30D158] text-black cursor-pointer"
                  >
                    Guardar
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
