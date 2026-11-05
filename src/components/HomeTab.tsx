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
import { WORKOUT_SESSIONS } from '../data/workouts';
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
  manana: 'Mañana HUCA · 08–15h',
  tarde: 'Tarde HUCA · 15–22h',
  noche: 'Noche HUCA · 22–08h',
  saliente: 'Saliente de guardia',
  libre: 'Día libre',
};

const TRAINING_TEXT: Record<TrainingType, { title: string; meta: string }> = {
  empuje: { title: 'Empuje · Pecho, hombro y tríceps', meta: '55 min · 5 ejercicios' },
  tiron: { title: 'Tirón · Espalda, bíceps y core', meta: '55 min · 5 ejercicios' },
  pierna: { title: 'Pierna y glúteo', meta: '60 min · 5 ejercicios' },
  padel: { title: 'Partido de pádel', meta: '90 min · Pista' },
  running: { title: 'Sesión de running', meta: '45 min · Exterior' },
  movilidad: { title: 'Movilidad y prevención', meta: '25 min · 4 ejercicios' },
  clase_dirigida: { title: 'Clase dirigida Enjoy', meta: '50 min · Estudio' },
  otra_actividad: { title: 'Deporte exterior', meta: 'Sesión activa' },
  doble_sesion: { title: 'Doble sesión', meta: 'Fuerza + Pista' },
  descanso_total: { title: 'Día de descanso', meta: 'Recuperación activa' },
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

function FitnessCalorieRing({
  current,
  target,
}: {
  current: number;
  target: number;
}) {
  const size = 104;
  const strokeWidth = 9;
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
        <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
          {current}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-1">
          kcal
        </span>
      </div>
    </div>
  );
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
  const workoutInfo = TRAINING_TEXT[trainingType];
  const trainingTitle =
    !isGuille && trainingType === 'clase_dirigida'
      ? `Clase dirigida · ${day.albaDirectedClass || 'Pilates'}`
      : workoutInfo.title;

  const matchedGymSession = WORKOUT_SESSIONS.find((s) => s.type === trainingType);

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

  const daySlots: MealSlot[] = ['desayuno', 'comida', 'merienda', 'cena'];

  return (
    <div className="space-y-4">
      {/* ========================================================= */}
      {/* 1. FITNESS ENERGY & MACROS HERO CARD                      */}
      {/* ========================================================= */}
      <div className="apple-card rounded-3xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#30D158] block">
              Hoy · {day.label}
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
              {isGuille ? 'Guille' : 'Alba'}
            </h1>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold apple-pill-surface text-slate-600 dark:text-slate-300">
            {shiftLabel}
          </span>
        </div>

        {/* Ring + 3 Clean Horizontal Progress Bars */}
        <div className="flex items-center gap-6 pt-1">
          <FitnessCalorieRing current={planned.kcal} target={target.kcal} />

          <div className="flex-1 space-y-3">
            {/* Protein Bar */}
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

            {/* Carbs Bar */}
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

            {/* Fat Bar */}
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
      </div>

      {/* ========================================================= */}
      {/* 2. WORKOUT OF THE DAY CARD (HIGH-CONTRAST FITNESS CARD)   */}
      {/* ========================================================= */}
      <div className="rounded-3xl p-6 bg-slate-900 text-white dark:bg-[#1C1C1E] dark:border dark:border-white/10 relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#30D158]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Entrenamiento · {workoutInfo.meta}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
              {trainingTitle}
            </h2>
          </div>

          {trainingType !== 'descanso_total' && (
            <button
              type="button"
              onClick={onGoToWorkout}
              className="px-4 py-2.5 rounded-full text-xs font-bold bg-[#30D158] text-black shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
            >
              {matchedGymSession ? 'Empezar' : 'Ver sesión'}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. CURRENT MEAL + CLEAN TYPOGRAPHIC INGREDIENT PILLS      */}
      {/* ========================================================= */}
      <div className="apple-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Ahora · {MEAL_NAMES[nowSlot]}
            </span>
          </div>
          <button
            type="button"
            onClick={onGoToMenu}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            <span>Menú del día</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {isFree
              ? 'Comida libre'
              : currentCustom
              ? currentCustom.title
              : currentRecipe?.title}
          </h2>

          {/* Clean Typographic Ingredient Pills (Zero Emojis) */}
          {!isFree && currentRecipe && !currentCustom && (
            <div className="flex flex-wrap gap-2">
              {currentRecipe.ingredients.map((ing) => {
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

                return (
                  <div
                    key={ing.id}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-[#2C2C2E] inline-flex items-baseline gap-1.5"
                  >
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {val}
                      {ing.unit}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {cleanName.toLowerCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subtle 4-Step Meal Timeline Indicator */}
        <div className="grid grid-cols-4 gap-2 pt-3 border-t border-black/5 dark:border-white/5">
          {daySlots.map((slot) => {
            const isCurrent = slot === nowSlot;
            return (
              <button
                key={slot}
                type="button"
                onClick={onGoToMenu}
                className="text-left group cursor-pointer"
              >
                <div
                  className={`h-1 rounded-full mb-1.5 transition-all ${
                    isCurrent
                      ? 'bg-[#30D158]'
                      : 'bg-black/10 dark:bg-white/10 group-hover:bg-black/20 dark:group-hover:bg-white/20'
                  }`}
                />
                <span
                  className={`text-[10px] font-semibold block truncate ${
                    isCurrent
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400'
                  }`}
                >
                  {MEAL_NAMES[slot]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. DAILY HABITS ROW (CREATINA & WHEY)                     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onToggleSupplement(day.day, creatineKey)}
          className={`apple-card rounded-2xl p-4 flex items-center justify-between text-left transition-all cursor-pointer ${
            day.supplementsCheck[creatineKey]
              ? 'ring-1 ring-[#30D158]'
              : ''
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Creatina 5g
            </span>
            <span className="text-[11px] text-slate-400">
              {day.supplementsCheck[creatineKey] ? 'Completado hoy' : 'Pendiente'}
            </span>
          </div>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              day.supplementsCheck[creatineKey]
                ? 'bg-[#30D158] text-black'
                : 'border border-slate-300 dark:border-slate-600'
            }`}
          >
            {day.supplementsCheck[creatineKey] && <Check className="w-3.5 h-3.5" />}
          </div>
        </button>

        <button
          type="button"
          onClick={() => onToggleSupplement(day.day, wheyKey)}
          className={`apple-card rounded-2xl p-4 flex items-center justify-between text-left transition-all cursor-pointer ${
            day.supplementsCheck[wheyKey]
              ? 'ring-1 ring-[#30D158]'
              : ''
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Proteína Whey
            </span>
            <span className="text-[11px] text-slate-400">
              {day.supplementsCheck[wheyKey] ? 'Completado hoy' : 'Pendiente'}
            </span>
          </div>
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              day.supplementsCheck[wheyKey]
                ? 'bg-[#30D158] text-black'
                : 'border border-slate-300 dark:border-slate-600'
            }`}
          >
            {day.supplementsCheck[wheyKey] && <Check className="w-3.5 h-3.5" />}
          </div>
        </button>
      </div>
    </div>
  );
};
