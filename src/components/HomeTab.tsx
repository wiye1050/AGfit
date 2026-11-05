import React from 'react';
import {
  AlbaShift,
  DayId,
  DayPlan,
  GuilleShift,
  MealSlot,
  Recipe,
  TrainingType,
} from '../types';
import { RECIPE_MAP } from '../data/recipes';
import { computeDayNutrition } from '../utils/nutritionEngine';
import { ArrowRight, Check } from 'lucide-react';

interface HomeTabProps {
  day: DayPlan;
  activeUser: 'guille' | 'alba';
  customRecipes: Recipe[];
  onGoToMenu: () => void;
  onGoToWorkout: () => void;
  onToggleSupplement: (
    day: DayId,
    key: 'guilleCreatine' | 'guilleWhey' | 'albaCreatine' | 'albaWhey'
  ) => void;
}

const GUILLE_SHIFT_TEXT: Record<GuilleShift, string> = {
  manana: 'Turno de mañana',
  tarde: 'Turno de tarde',
  manana_tarde: 'Turno partido',
  libre: 'Día libre',
};

const ALBA_SHIFT_TEXT: Record<AlbaShift, string> = {
  manana: 'Mañana HUCA (08–15h)',
  tarde: 'Tarde HUCA (15–22h)',
  noche: 'Noche HUCA (22–08h)',
  saliente: 'Saliente de guardia',
  libre: 'Día libre',
};

const TRAINING_TEXT: Record<TrainingType, string> = {
  empuje: 'Empuje · Pecho, hombro y tríceps',
  tiron: 'Tirón · Espalda, bíceps y core',
  pierna: 'Pierna y glúteo',
  padel: 'Partido de pádel',
  running: 'Sesión de running',
  movilidad: 'Movilidad y prevención',
  clase_dirigida: 'Clase dirigida Enjoy',
  otra_actividad: 'Deporte exterior',
  doble_sesion: 'Doble sesión',
  descanso_total: 'Descanso',
};

const MEAL_NAMES: Record<MealSlot, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  merienda: 'Merienda',
  cena: 'Cena',
  snack_nocturno: 'Guardia noche',
};

function getNowSlot(isNightShift: boolean): MealSlot {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6 && isNightShift) return 'snack_nocturno';
  if (hour >= 6 && hour < 12) return 'desayuno';
  if (hour >= 12 && hour < 16) return 'comida';
  if (hour >= 16 && hour < 20) return 'merienda';
  return 'cena';
}

export const HomeTab: React.FC<HomeTabProps> = ({
  day,
  activeUser,
  customRecipes,
  onGoToMenu,
  onGoToWorkout,
  onToggleSupplement,
}) => {
  const isGuille = activeUser === 'guille';
  const nutrition = computeDayNutrition(day);

  const planned = isGuille ? nutrition.guillePlanned : nutrition.albaPlanned;
  const target = isGuille ? nutrition.guilleTarget : nutrition.albaTarget;
  const shiftLabel = isGuille
    ? GUILLE_SHIFT_TEXT[day.guilleShift]
    : ALBA_SHIFT_TEXT[day.albaShift];

  const trainingType = isGuille ? day.guilleTraining : day.albaTraining;
  const trainingLabel =
    !isGuille && trainingType === 'clase_dirigida'
      ? `Clase dirigida · ${day.albaDirectedClass || 'Pilates'}`
      : TRAINING_TEXT[trainingType];

  const recipeLookup: Record<string, Recipe> = {
    ...RECIPE_MAP,
    ...Object.fromEntries(customRecipes.map((r) => [r.id, r])),
  };

  const nowSlot = getNowSlot(!isGuille && day.albaShift === 'noche');
  const currentRecipe = recipeLookup[day.meals[nowSlot]];
  const currentCustom = day.customMealOverrides[nowSlot];
  const isFree = Boolean(day.freeMeals[nowSlot]);

  const carbMult =
    isGuille && (nowSlot === 'comida' || nowSlot === 'cena')
      ? nutrition.guilleLevel === 'alto'
        ? 1.15
        : nutrition.guilleLevel === 'bajo'
        ? 0.8
        : 1
      : 1;

  const creatineKey = isGuille ? 'guilleCreatine' : 'albaCreatine';
  const wheyKey = isGuille ? 'guilleWhey' : 'albaWhey';

  return (
    <div className="space-y-4">
      {/* 1. Header & Daily Macros */}
      <div className="apple-card rounded-3xl p-6 space-y-5">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Hoy · {day.label}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
              {isGuille ? 'Guille' : 'Alba'}
            </h1>
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {shiftLabel}
          </span>
        </div>

        <div className="flex items-end justify-between border-t border-black/5 dark:border-white/5 pt-4">
          <div>
            <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {planned.kcal}
            </span>
            <span className="text-xs font-medium text-slate-400 ml-1.5">
              / {target.kcal} kcal
            </span>
          </div>

          <div className="flex items-center gap-5 text-right">
            <div>
              <span className="text-[11px] text-slate-400 block">Proteína</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {planned.protein}g
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Hidratos</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {planned.carbs}g
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Grasa</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {planned.fat}g
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Next Meal (Right Now) */}
      <div className="apple-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Ahora · {MEAL_NAMES[nowSlot]}
          </span>
          <button
            type="button"
            onClick={onGoToMenu}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            <span>Ver día completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isFree
              ? 'Comida libre'
              : currentCustom
              ? currentCustom.title
              : currentRecipe?.title}
          </h2>

          {!isFree && currentRecipe && !currentCustom && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {currentRecipe.ingredients
                .map((ing) => {
                  const baseRaw = isGuille ? ing.guilleAmountRaw : ing.albaAmountRaw;
                  const isCarb =
                    isGuille &&
                    ing.aisle === 'despensa' &&
                    (ing.name.toLowerCase().includes('arroz') ||
                      ing.name.toLowerCase().includes('pasta') ||
                      ing.name.toLowerCase().includes('cuscús') ||
                      ing.name.toLowerCase().includes('patata'));
                  const val = isCarb ? Math.round(baseRaw * carbMult) : baseRaw;
                  const cleanName = ing.name.split('(')[0].split('/')[0].trim();
                  return `${val}${ing.unit} ${cleanName.toLowerCase()}`;
                })
                .join('  ·  ')}
            </p>
          )}
        </div>
      </div>

      {/* 3. Today's Workout */}
      <div className="apple-card rounded-3xl p-6 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400 block">
            Entrenamiento de hoy
          </span>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {trainingLabel}
          </h2>
        </div>

        {trainingType !== 'descanso_total' && (
          <button
            type="button"
            onClick={onGoToWorkout}
            className="px-4 py-2.5 rounded-full text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-black shrink-0 cursor-pointer"
          >
            Abrir sesión
          </button>
        )}
      </div>

      {/* 4. Minimal Daily Checks (Creatine & Whey) */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onToggleSupplement(day.day, creatineKey)}
          className={`apple-card rounded-2xl p-4 flex items-center justify-between text-left transition-all cursor-pointer ${
            day.supplementsCheck[creatineKey]
              ? 'ring-1 ring-slate-900 dark:ring-white'
              : 'opacity-70'
          }`}
        >
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            Creatina 5g
          </span>
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center ${
              day.supplementsCheck[creatineKey]
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                : 'border border-slate-300 dark:border-slate-600'
            }`}
          >
            {day.supplementsCheck[creatineKey] && <Check className="w-3 h-3" />}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onToggleSupplement(day.day, wheyKey)}
          className={`apple-card rounded-2xl p-4 flex items-center justify-between text-left transition-all cursor-pointer ${
            day.supplementsCheck[wheyKey]
              ? 'ring-1 ring-slate-900 dark:ring-white'
              : 'opacity-70'
          }`}
        >
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            Proteína Whey
          </span>
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center ${
              day.supplementsCheck[wheyKey]
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                : 'border border-slate-300 dark:border-slate-600'
            }`}
          >
            {day.supplementsCheck[wheyKey] && <Check className="w-3 h-3" />}
          </div>
        </button>
      </div>
    </div>
  );
};
