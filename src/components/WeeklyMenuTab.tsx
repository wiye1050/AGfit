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
import { getScaledIngredientAmount } from '../utils/shiftScheduler';
import { DIRECTED_CLASSES_CATALOG, WORKOUT_SESSIONS } from '../data/workouts';
import { Check, ChevronDown, ChevronRight, Plus, RefreshCw, X } from 'lucide-react';

interface WeeklyMenuTabProps {
  days: DayPlan[];
  selectedDayId: DayId;
  todayDayId: DayId;
  activeUser: 'guille' | 'alba';
  activeTemplateKey: 'semana_a' | 'semana_b' | 'semana_c';
  onApplyTemplate: (key: 'semana_a' | 'semana_b' | 'semana_c') => void;
  onUpdateDay: (dayId: DayId, updater: (prev: DayPlan) => DayPlan) => void;
  onGoToWorkout: () => void;
  onGoToShifts?: () => void;
  onToggleSupplement: (
    day: DayId,
    key: 'guilleCreatine' | 'guilleWhey' | 'albaCreatine' | 'albaWhey'
  ) => void;
  customRecipes: Recipe[];
  onAddCustomRecipe?: (recipe: Recipe) => void;
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
    meta: '25 min · 5 ejercicios',
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
  onGoToShifts,
  onToggleSupplement,
  customRecipes,
  onAddCustomRecipe,
}) => {
  const isGuille = activeUser === 'guille';
  const [weightMode, setWeightMode] = useState<'crudo' | 'cocinado'>('crudo');
  const [showDayConfig, setShowDayConfig] = useState(false);

  const [activeSheetSlot, setActiveSheetSlot] = useState<MealSlot | null>(null);
  const [sheetTab, setSheetTab] = useState<'cambiar' | 'crear' | 'receta' | 'libre'>('cambiar');
  const [catalogFilter, setCatalogFilter] = useState<'todos' | 'batch' | 'airfryer' | 'tupper'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual override state
  const [editTitle, setEditTitle] = useState('');
  const [editKcal, setEditKcal] = useState(550);
  const [editProt, setEditProt] = useState(45);
  const [editCarbs, setEditCarbs] = useState(60);

  // New recipe creator state (persisted to Firestore customRecipes)
  const [newRecipeTitle, setNewRecipeTitle] = useState('');
  const [newRecipePrep, setNewRecipePrep] = useState<'batch_domingo' | 'airfryer_express' | 'montaje_rapido'>('airfryer_express');
  const [newRecipeKcal, setNewRecipeKcal] = useState(560);
  const [newRecipeProt, setNewRecipeProt] = useState(48);
  const [newRecipeCarbs, setNewRecipeCarbs] = useState(55);
  const [newRecipeIng1Name, setNewRecipeIng1Name] = useState('');
  const [newRecipeIng1G, setNewRecipeIng1G] = useState(200);
  const [newRecipeIng2Name, setNewRecipeIng2Name] = useState('');
  const [newRecipeIng2G, setNewRecipeIng2G] = useState(80);
  const [newRecipeNotes, setNewRecipeNotes] = useState('');

  const allRecipes = [...RECIPES, ...customRecipes];
  const recipeLookup: Record<string, Recipe> = {
    ...RECIPE_MAP,
    ...Object.fromEntries(customRecipes.map((r) => [r.id, r])),
  };

  const currentDay = days.find((d) => d.day === selectedDayId) || days[0];
  const isViewingToday = currentDay.day === todayDayId;
  const nutrition = computeDayNutrition(currentDay, customRecipes);

  const planned = isGuille ? nutrition.guillePlanned : nutrition.albaPlanned;
  const target = isGuille ? nutrition.guilleTarget : nutrition.albaTarget;
  const userCarbLevel = isGuille ? nutrition.guilleLevel : nutrition.albaLevel;
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

  const getSlotCompatibleRecipes = (slot: MealSlot) =>
    allRecipes.filter((r) => {
      if (slot === 'desayuno' || slot === 'merienda') {
        return r.slot === 'desayuno_merienda';
      }
      if (slot === 'snack_nocturno') {
        return r.slot === 'snack_noche' || r.slot === 'desayuno_merienda';
      }
      return r.slot === 'principal';
    });

  // 1-Tap Quick Rotate on any Meal Card
  const handleQuickRotateSlot = (slot: MealSlot, e: React.MouseEvent) => {
    e.stopPropagation();
    const compatible = getSlotCompatibleRecipes(slot);
    if (compatible.length === 0) return;
    const currId = currentDay.meals[slot];
    const currIdx = compatible.findIndex((r) => r.id === currId);
    const nextRecipe = compatible[(currIdx + 1) % compatible.length];

    onUpdateDay(currentDay.day, (prev) => {
      const nextOverrides = { ...prev.customMealOverrides };
      delete nextOverrides[slot];
      return {
        ...prev,
        meals: { ...prev.meals, [slot]: nextRecipe.id },
        freeMeals: { ...prev.freeMeals, [slot]: false },
        customMealOverrides: nextOverrides,
      };
    });
  };

  const openMealSheet = (slot: MealSlot) => {
    const custom = currentDay.customMealOverrides[slot];
    const r = recipeLookup[currentDay.meals[slot]];
    setActiveSheetSlot(slot);
    setSheetTab('cambiar');
    setCatalogFilter('todos');
    setSearchQuery('');
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

  const handleCreatePermanentRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSheetSlot || !newRecipeTitle.trim() || !onAddCustomRecipe) return;

    const slotType: Recipe['slot'] =
      activeSheetSlot === 'desayuno' || activeSheetSlot === 'merienda'
        ? 'desayuno_merienda'
        : activeSheetSlot === 'snack_nocturno'
        ? 'snack_noche'
        : 'principal';

    const newId = `cust_rec_${Date.now()}`;
    const gMacros = {
      kcal: isGuille ? Number(newRecipeKcal) : Math.round(Number(newRecipeKcal) * 1.3),
      protein: isGuille ? Number(newRecipeProt) : Math.round(Number(newRecipeProt) * 1.4),
      carbs: isGuille ? Number(newRecipeCarbs) : Math.round(Number(newRecipeCarbs) * 1.3),
      fat: 14,
    };
    const aMacros = {
      kcal: !isGuille ? Number(newRecipeKcal) : Math.round(Number(newRecipeKcal) * 0.76),
      protein: !isGuille ? Number(newRecipeProt) : Math.round(Number(newRecipeProt) * 0.7),
      carbs: !isGuille ? Number(newRecipeCarbs) : Math.round(Number(newRecipeCarbs) * 0.76),
      fat: 11,
    };

    const ingredients = [];
    if (newRecipeIng1Name.trim()) {
      const gAmt = isGuille ? Number(newRecipeIng1G) : Math.round(Number(newRecipeIng1G) * 1.35);
      const aAmt = !isGuille ? Number(newRecipeIng1G) : Math.round(Number(newRecipeIng1G) * 0.72);
      ingredients.push({
        id: `ing_cust_${Date.now()}_1`,
        name: newRecipeIng1Name.trim(),
        aisle: 'carniceria' as const,
        unit: 'g' as const,
        guilleAmountRaw: gAmt,
        albaAmountRaw: aAmt,
        cookedRatio: 0.85,
      });
    }
    if (newRecipeIng2Name.trim()) {
      const gAmt = isGuille ? Number(newRecipeIng2G) : Math.round(Number(newRecipeIng2G) * 1.35);
      const aAmt = !isGuille ? Number(newRecipeIng2G) : Math.round(Number(newRecipeIng2G) * 0.72);
      ingredients.push({
        id: `ing_cust_${Date.now()}_2`,
        name: newRecipeIng2Name.trim(),
        aisle: 'despensa' as const,
        unit: 'g' as const,
        guilleAmountRaw: gAmt,
        albaAmountRaw: aAmt,
        cookedRatio: 2.0,
      });
    }

    const createdRecipe: Recipe = {
      id: newId,
      title: newRecipeTitle.trim(),
      subtitle: 'Receta personalizada guardada en la nube',
      slot: slotType,
      style: newRecipePrep === 'batch_domingo' ? 'batch_tradicional' : 'airfryer_fresco',
      prepType: newRecipePrep,
      tupperFriendly: true,
      appliance: newRecipePrep === 'airfryer_express' ? 'airfryer' : 'vitro',
      guilleBaseMacros: gMacros,
      albaBaseMacros: aMacros,
      ingredients,
      portionNoteGuille: `${gMacros.kcal} kcal · ${gMacros.protein}g P`,
      portionNoteAlba: `${aMacros.kcal} kcal · ${aMacros.protein}g P`,
      cookingNotes: newRecipeNotes.trim() || 'Receta personalizada de casa.',
      tags: ['Personalizada'],
    };

    onAddCustomRecipe(createdRecipe);
    onUpdateDay(currentDay.day, (prev) => ({
      ...prev,
      meals: { ...prev.meals, [activeSheetSlot]: newId },
      freeMeals: { ...prev.freeMeals, [activeSheetSlot]: false },
    }));
    setNewRecipeTitle('');
    setNewRecipeIng1Name('');
    setNewRecipeIng2Name('');
    setNewRecipeNotes('');
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
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#30D158]">
                {isViewingToday ? 'Hoy' : 'Plan diario'} · {currentShiftLabel}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-white/10 text-slate-600 dark:text-zinc-300">
                HC {userCarbLevel}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
              {currentDay.label}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onGoToShifts && (
              <button
                type="button"
                onClick={onGoToShifts}
                className="px-3 py-1.5 rounded-full text-xs font-bold apple-pill-surface text-[#30D158] cursor-pointer"
              >
                Turnos
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDayConfig((v) => !v)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                showDayConfig
                  ? 'bg-[#30D158] text-black'
                  : 'apple-pill-surface text-slate-700 dark:text-zinc-200'
              }`}
            >
              <span>Ajustar</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  showDayConfig ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
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
                Plantillas base
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
          Comidas del día ({allRecipes.length} en catálogo)
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
      {/* 4. MEAL CARDS WITH DYNAMIC SHIFT GRAMS & 1-TAP ROTATION   */}
      {/* ========================================================= */}
      <div className="space-y-3">
        {slots.map((slot) => {
          const meta = MEAL_LABELS[slot];
          const isNow = isViewingToday && slot === nowSlot;
          const isFree = Boolean(currentDay.freeMeals[slot]);
          const custom = currentDay.customMealOverrides[slot];
          const recipe = recipeLookup[currentDay.meals[slot]];
          const logistics = nutrition.mealLogistics[slot];
          const isTupperHuca =
            !isGuille &&
            ((slot === 'merienda' && currentDay.albaShift === 'tarde') ||
              (slot === 'snack_nocturno' && currentDay.albaShift === 'noche'));

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
                  <div className="flex flex-wrap items-center gap-2">
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
                    {isTupperHuca && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#30D158]/15 text-[#30D158]">
                        Tupper HUCA
                      </span>
                    )}
                  </div>

                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                    {isFree
                      ? 'Comida libre'
                      : custom
                      ? custom.title
                      : recipe?.title}
                  </h3>

                  {logistics?.scheduleHint && (
                    <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                      {logistics.scheduleHint}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isFree && (
                    <button
                      type="button"
                      onClick={(e) => handleQuickRotateSlot(slot, e)}
                      title="Rotar por otro plato equivalente del catálogo"
                      className="px-2.5 py-1.5 rounded-full text-xs font-bold apple-pill-surface text-slate-600 dark:text-zinc-300 hover:text-[#30D158] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Rotar</span>
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Clean Typographic Ingredient Pills (Zero Emojis, Dynamic Carb Scaling) */}
              {!isFree && recipe && !custom && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {recipe.ingredients.map((ing) => {
                    const baseRaw = isGuille
                      ? ing.guilleAmountRaw
                      : ing.albaAmountRaw;
                    if (baseRaw <= 0) return null;

                    const scaledInfo = getScaledIngredientAmount(
                      ing.id,
                      baseRaw,
                      userCarbLevel
                    );
                    const adjustedRaw = scaledInfo.amount;
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
                        className={`px-3 py-1.5 rounded-xl inline-flex items-baseline gap-1.5 ${
                          scaledInfo.scaled
                            ? 'bg-[#30D158]/10 border border-[#30D158]/25'
                            : 'apple-pill-surface'
                        }`}
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
      {/* BOTTOM SHEET: CATALOG / CREATE RECIPE / PREP / MANUAL     */}
      {/* ========================================================= */}
      {activeSheetSlot && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setActiveSheetSlot(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#141416] rounded-t-3xl sm:rounded-3xl p-6 space-y-4 animate-sheet max-h-[88dvh] overflow-y-auto border-t sm:border border-white/10"
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

            <div className="apple-pill-surface p-1 rounded-full grid grid-cols-4 text-[11px]">
              <button
                type="button"
                onClick={() => setSheetTab('cambiar')}
                className={`py-1.5 rounded-full font-bold cursor-pointer ${
                  sheetTab === 'cambiar'
                    ? 'bg-white dark:bg-white text-slate-900 dark:text-black shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                Catálogo
              </button>
              <button
                type="button"
                onClick={() => setSheetTab('crear')}
                className={`py-1.5 rounded-full font-bold cursor-pointer ${
                  sheetTab === 'crear'
                    ? 'bg-[#30D158] text-black shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                + Crear
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
                Receta
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
                Libre
              </button>
            </div>

            {sheetTab === 'cambiar' && (
              <div className="space-y-3">
                {/* Search + Filter */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por plato o ingrediente (pollo, arroz, salmón...)"
                  className="w-full px-3.5 py-2 rounded-2xl text-xs font-medium apple-pill-surface outline-none"
                />

                {(activeSheetSlot === 'comida' || activeSheetSlot === 'cena') && (
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {(
                      [
                        { id: 'todos', label: 'Todos' },
                        { id: 'batch', label: 'Batch Domingo' },
                        { id: 'airfryer', label: 'Airfryer / Rápido' },
                        { id: 'tupper', label: 'Tupper Trabajo/HUCA' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCatalogFilter(f.id)}
                        className={`px-2.5 py-1 rounded-full font-bold cursor-pointer ${
                          catalogFilter === f.id
                            ? 'bg-[#30D158] text-black'
                            : 'apple-pill-surface text-slate-400'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {getSlotCompatibleRecipes(activeSheetSlot)
                    .filter((r) => {
                      if (catalogFilter === 'batch' && r.prepType !== 'batch_domingo') return false;
                      if (
                        catalogFilter === 'airfryer' &&
                        r.prepType !== 'airfryer_express' &&
                        r.prepType !== 'montaje_rapido'
                      )
                        return false;
                      if (catalogFilter === 'tupper' && !r.tupperFriendly) return false;
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        const matchTitle = r.title.toLowerCase().includes(q);
                        const matchIng = r.ingredients.some((i) =>
                          i.name.toLowerCase().includes(q)
                        );
                        return matchTitle || matchIng;
                      }
                      return true;
                    })
                    .map((r) => {
                      const isSelected = currentDay.meals[activeSheetSlot] === r.id;
                      const m = isGuille ? r.guilleBaseMacros : r.albaBaseMacros;
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
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {r.title}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {isGuille ? r.portionNoteGuille : r.portionNoteAlba}
                            </div>
                            <div className="text-[11px] font-bold text-[#30D158] mt-1">
                              {m.kcal} kcal · {m.protein}g P · {m.carbs}g HC
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
              </div>
            )}

            {sheetTab === 'crear' && (
              <form onSubmit={handleCreatePermanentRecipe} className="space-y-3">
                <p className="text-xs text-slate-400">
                  Añade un plato nuevo a vuestra base de datos en la nube para reutilizarlo cualquier semana:
                </p>
                <input
                  type="text"
                  required
                  value={newRecipeTitle}
                  onChange={(e) => setNewRecipeTitle(e.target.value)}
                  placeholder="Nombre del nuevo plato (ej. Pollo al ajillo con patatas)"
                  className="w-full px-3.5 py-2.5 rounded-2xl text-xs font-bold apple-pill-surface outline-none"
                />

                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  {(
                    [
                      { id: 'airfryer_express', label: 'Airfryer / Rápido' },
                      { id: 'batch_domingo', label: 'Batch Domingo' },
                      { id: 'montaje_rapido', label: 'Frío / Montaje' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewRecipePrep(p.id)}
                      className={`py-2 rounded-xl font-bold cursor-pointer ${
                        newRecipePrep === p.id
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                          : 'apple-pill-surface text-slate-400'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">
                      Kcal ({isGuille ? 'Guille' : 'Alba'})
                    </span>
                    <input
                      type="number"
                      value={newRecipeKcal}
                      onChange={(e) => setNewRecipeKcal(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">
                      Proteína (g)
                    </span>
                    <input
                      type="number"
                      value={newRecipeProt}
                      onChange={(e) => setNewRecipeProt(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">
                      Hidratos (g)
                    </span>
                    <input
                      type="number"
                      value={newRecipeCarbs}
                      onChange={(e) => setNewRecipeCarbs(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newRecipeIng1Name}
                    onChange={(e) => setNewRecipeIng1Name(e.target.value)}
                    placeholder="Ingrediente 1 (ej. Pollo)"
                    className="col-span-2 px-3 py-2 rounded-xl text-xs font-medium apple-pill-surface outline-none"
                  />
                  <input
                    type="number"
                    value={newRecipeIng1G}
                    onChange={(e) => setNewRecipeIng1G(Number(e.target.value))}
                    placeholder="Gramos"
                    className="px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={newRecipeIng2Name}
                    onChange={(e) => setNewRecipeIng2Name(e.target.value)}
                    placeholder="Ingrediente 2 (ej. Arroz)"
                    className="col-span-2 px-3 py-2 rounded-xl text-xs font-medium apple-pill-surface outline-none"
                  />
                  <input
                    type="number"
                    value={newRecipeIng2G}
                    onChange={(e) => setNewRecipeIng2G(Number(e.target.value))}
                    placeholder="Gramos"
                    className="px-3 py-2 rounded-xl text-xs font-bold apple-pill-surface outline-none"
                  />
                </div>

                <input
                  type="text"
                  value={newRecipeNotes}
                  onChange={(e) => setNewRecipeNotes(e.target.value)}
                  placeholder="Notas de preparación (opcional)"
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium apple-pill-surface outline-none"
                />

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl text-xs font-extrabold bg-[#30D158] text-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Guardar en catálogo y asignar hoy</span>
                </button>
              </form>
            )}

            {sheetTab === 'receta' && (
              <div className="p-4 rounded-2xl apple-pill-surface text-xs text-slate-600 dark:text-zinc-300 leading-relaxed space-y-2">
                <p>{recipeLookup[currentDay.meals[activeSheetSlot]]?.cookingNotes}</p>
                {recipeLookup[currentDay.meals[activeSheetSlot]]?.defrostAlert && (
                  <p className="font-bold text-[#30D158]">
                    Aviso: {recipeLookup[currentDay.meals[activeSheetSlot]]?.defrostAlert}
                  </p>
                )}
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
                    placeholder="Nombre del plato puntual de hoy"
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
                    Guardar solo para hoy
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
