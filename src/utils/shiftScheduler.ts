import {
  AlbaShift,
  CarbCycleLevel,
  DayId,
  DayPlan,
  GuilleShift,
  Recipe,
  ShiftCalendarMap,
  TrainingType,
} from '../types';
import { RECIPES } from '../data/recipes';
import { getCarbCycleLevel } from './nutritionEngine';

export const DAY_IDS_ORDERED: DayId[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

export const CARB_SCALED_INGREDIENT_IDS = new Set([
  'ing_arroz',
  'ing_pasta',
  'ing_patata',
  'ing_cuscus',
  'ing_avena',
  'ing_pan_hogaza',
  'ing_tortitas',
]);

/**
 * Scales raw grams of carbohydrate sources automatically according to the athlete's daily CarbCycleLevel.
 * Proteins and vegetables remain untouched so satiety and muscle synthesis stay locked.
 */
export function getScaledIngredientAmount(
  ingredientId: string,
  baseAmount: number,
  carbLevel: CarbCycleLevel
): { amount: number; scaled: boolean; deltaPct: number } {
  if (!CARB_SCALED_INGREDIENT_IDS.has(ingredientId) || baseAmount <= 0) {
    return { amount: baseAmount, scaled: false, deltaPct: 0 };
  }
  if (carbLevel === 'alto') {
    return {
      amount: Math.round((baseAmount * 1.2) / 5) * 5,
      scaled: true,
      deltaPct: 20,
    };
  }
  if (carbLevel === 'bajo') {
    return {
      amount: Math.max(15, Math.round((baseAmount * 0.82) / 5) * 5),
      scaled: true,
      deltaPct: -18,
    };
  }
  return { amount: baseAmount, scaled: false, deltaPct: 0 };
}

/**
 * Returns the Monday Date of the week for a given reference Date.
 */
export function getMondayOfWeek(refDate: Date): Date {
  const d = new Date(refDate);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun, 1 = Mon ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

export function formatDateISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getWeekDatesFromMonday(monday: Date): Array<{
  dayId: DayId;
  isoDate: string;
  dateObj: Date;
  dayNumber: number;
  monthShort: string;
}> {
  return DAY_IDS_ORDERED.map((dayId, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return {
      dayId,
      isoDate: formatDateISO(d),
      dateObj: d,
      dayNumber: d.getDate(),
      monthShort: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''),
    };
  });
}

/**
 * Checks if Guille and Alba have a shared window to train or play Padel together on a given day.
 */
export function hasSharedTrainingWindow(
  guilleShift: GuilleShift,
  albaShift: AlbaShift
): { canTrainTogether: boolean; windowLabel: string } {
  if (albaShift === 'saliente') {
    return { canTrainTogether: false, windowLabel: 'Alba saliente (descanso)' };
  }
  if (guilleShift === 'libre' && albaShift === 'libre') {
    return { canTrainTogether: true, windowLabel: 'Día libre juntos (Mañana o Tarde)' };
  }
  if (guilleShift === 'manana' && (albaShift === 'manana' || albaShift === 'libre' || albaShift === 'noche')) {
    return { canTrainTogether: true, windowLabel: 'Tarde libre juntos (16:30–20:00h)' };
  }
  if (guilleShift === 'tarde' && (albaShift === 'tarde' || albaShift === 'libre')) {
    return { canTrainTogether: true, windowLabel: 'Mañana libre juntos (10:00–13:00h)' };
  }
  if (guilleShift === 'libre' && albaShift === 'manana') {
    return { canTrainTogether: true, windowLabel: 'Tarde juntos (desde 16:00h)' };
  }
  if (guilleShift === 'libre' && albaShift === 'tarde') {
    return { canTrainTogether: true, windowLabel: 'Mañana juntos (10:00–13:00h)' };
  }
  return { canTrainTogether: false, windowLabel: 'Horarios cruzados' };
}

/**
 * Core "Shift-First" Engine:
 * Takes the current 7-day plan (with updated shifts for Guille and Alba)
 * and automatically calculates the optimal workouts, session variants, and weekly menu rotation
 * from the full recipe catalog.
 */
export function generateAdaptiveWeekFromShifts(
  currentDays: DayPlan[],
  allRecipes: Recipe[] = RECIPES,
  rotationSeed: number = 0
): DayPlan[] {
  const nextDays: DayPlan[] = currentDays.map((d) => ({
    ...d,
    meals: { ...d.meals },
    freeMeals: { ...d.freeMeals },
    customMealOverrides: {},
  }));

  // 0. Enforce HUCA Night -> Saliente inertia within the week if next day wasn't explicitly set to noche
  for (let i = 0; i < nextDays.length - 1; i++) {
    if (nextDays[i].albaShift === 'noche' && nextDays[i + 1].albaShift !== 'noche') {
      nextDays[i + 1].albaShift = 'saliente';
    }
  }

  // 1. Find best shared days for Padel (aim for 1 weekday/Friday match + 1 weekend match if available)
  const sharedIndices: number[] = [];
  nextDays.forEach((d, idx) => {
    const shared = hasSharedTrainingWindow(d.guilleShift, d.albaShift);
    if (shared.canTrainTogether) sharedIndices.push(idx);
  });

  const weekendPadelIdx = sharedIndices.find((i) => i === 5 || i === 4) ?? 5;
  const midweekPadelIdx =
    sharedIndices.find((i) => i < 4 && Math.abs(i - weekendPadelIdx) >= 2) ?? 1;

  // 2. Assign Guille's Weekly Microcycle (Empuje, Tirón, Pierna, 2x Pádel, Running, Movilidad)
  const strengthQueueGuille: TrainingType[] =
    rotationSeed % 2 === 0
      ? ['empuje', 'tiron', 'pierna']
      : ['pierna', 'empuje', 'tiron'];
  let guilleStrengthPtr = 0;

  nextDays.forEach((d, idx) => {
    if (idx === weekendPadelIdx || idx === midweekPadelIdx) {
      d.guilleTraining = 'padel';
      d.guilleCustomActivity = { name: 'Partido Pádel 90m', durationMin: 90, intensity: 'alta' };
      return;
    }
    if (idx === 6) {
      d.guilleTraining = 'movilidad';
      d.guilleCustomActivity = { name: 'Movilidad & Core Pádel', durationMin: 30, intensity: 'suave' };
      return;
    }
    if (guilleStrengthPtr < strengthQueueGuille.length) {
      const nextStrength = strengthQueueGuille[guilleStrengthPtr++];
      d.guilleTraining = nextStrength;
      // Use Express or Variant B automatically depending on split shift & seed
      if (d.guilleShift === 'manana_tarde' && rotationSeed % 2 === 1) {
        d.sessionVariantId = 'ses_fullbody_express';
      } else if (rotationSeed % 2 === 1) {
        d.sessionVariantId = `ses_${nextStrength}_b`;
      } else {
        d.sessionVariantId = `ses_${nextStrength}`;
      }
      return;
    }
    d.guilleTraining = 'running';
    d.guilleCustomActivity = { name: 'Rodaje Zona 2 Oviedo', durationMin: 42, intensity: 'media' };
  });

  // 3. Assign Alba's Shift-Aware Training Schedule
  const albaPool: TrainingType[] = ['pierna', 'empuje', 'clase_dirigida', 'tiron'];
  let albaPoolPtr = 0;

  nextDays.forEach((d, idx) => {
    if (d.albaShift === 'saliente') {
      d.albaTraining = 'descanso_total';
      d.albaCustomActivity = { name: 'Descanso post-guardia HUCA', durationMin: 0, intensity: 'suave' };
      return;
    }
    if (d.albaShift === 'noche') {
      d.albaTraining = 'movilidad';
      d.albaDirectedClass = 'Yoga';
      d.albaCustomActivity = { name: 'Movilidad pre-guardia', durationMin: 25, intensity: 'suave' };
      return;
    }
    if (
      (idx === weekendPadelIdx || idx === midweekPadelIdx) &&
      hasSharedTrainingWindow(d.guilleShift, d.albaShift).canTrainTogether
    ) {
      d.albaTraining = 'padel';
      d.albaCustomActivity = { name: 'Partido Pádel 90m', durationMin: 90, intensity: 'alta' };
      return;
    }
    if (idx === 6) {
      d.albaTraining = 'movilidad';
      d.albaDirectedClass = 'Estiramientos';
      return;
    }
    const nextAlba = albaPool[albaPoolPtr % albaPool.length];
    albaPoolPtr++;
    d.albaTraining = nextAlba;
    if (nextAlba === 'clase_dirigida') {
      const classes = ['Pilates', 'GAP', 'BodyPump', 'Ciclo Indoor'];
      d.albaDirectedClass = classes[(idx + rotationSeed) % classes.length];
    }
  });

  // 4. Smart Menu Selection from Expanded Recipe Catalog
  const breakfastsSalado = allRecipes.filter(
    (r) => r.slot === 'desayuno_merienda' && r.style === 'salado' && r.id.startsWith('des_')
  );
  const breakfastsDulce = allRecipes.filter(
    (r) => r.slot === 'desayuno_merienda' && r.style === 'dulce' && r.id.startsWith('des_')
  );
  const snacksTupper = allRecipes.filter(
    (r) => r.slot === 'desayuno_merienda' && r.id.startsWith('mer_') && r.tupperFriendly
  );
  const snacksAll = allRecipes.filter(
    (r) => r.slot === 'desayuno_merienda' && r.id.startsWith('mer_')
  );
  const nightSnacks = allRecipes.filter((r) => r.slot === 'snack_noche');

  const highCarbMains = allRecipes.filter(
    (r) =>
      r.slot === 'principal' &&
      r.guilleBaseMacros.carbs >= 60 &&
      r.tupperFriendly
  );
  const batchMains = allRecipes.filter(
    (r) => r.slot === 'principal' && r.prepType === 'batch_domingo'
  );
  const lightDinners = allRecipes.filter(
    (r) =>
      r.slot === 'principal' &&
      (r.prepType === 'airfryer_express' ||
        r.prepType === 'montaje_rapido' ||
        r.guilleBaseMacros.carbs <= 60)
  );

  const pick = <T,>(arr: T[], index: number, fallback: T): T =>
    arr.length > 0 ? arr[Math.abs(index) % arr.length] : fallback;

  // Pick 3 core batch lunches + 3 core dinners for the week to keep shopping list compact
  const weekBatchLunches = [
    pick(highCarbMains, rotationSeed, batchMains[0]),
    pick(batchMains, rotationSeed + 2, batchMains[0]),
    pick(batchMains, rotationSeed + 4, batchMains[0]),
  ];
  const weekDinners = [
    pick(lightDinners, rotationSeed + 1, lightDinners[0]),
    pick(lightDinners, rotationSeed + 3, lightDinners[0]),
    pick(lightDinners, rotationSeed + 5, lightDinners[0]),
  ];

  nextDays.forEach((d, idx) => {
    const gLevel = getCarbCycleLevel(d.guilleTraining, d.guilleCustomActivity?.intensity);
    const isHighDemand = gLevel === 'alto' || d.albaTraining === 'padel';

    // Breakfast: alternate sweet/savory, favoring high-carb sweet on Padel days
    const bRecipe = isHighDemand
      ? pick(breakfastsDulce, idx + rotationSeed, breakfastsDulce[0])
      : idx % 2 === 0
      ? pick(breakfastsSalado, idx + rotationSeed, breakfastsSalado[0])
      : pick(breakfastsDulce, idx + rotationSeed, breakfastsDulce[0]);

    // Lunch: on Padel/Legs days pick high-carb main; otherwise rotate among weekly batch lunches
    const lRecipe = isHighDemand
      ? pick(highCarbMains, idx + rotationSeed, weekBatchLunches[0])
      : weekBatchLunches[(idx + rotationSeed) % weekBatchLunches.length];

    // Merienda: if Alba works afternoon shift (tarde), guarantee tupper-friendly merienda for HUCA
    const mRecipe =
      d.albaShift === 'tarde'
        ? pick(snacksTupper, idx + rotationSeed, snacksAll[0])
        : pick(snacksAll, idx + rotationSeed, snacksAll[0]);

    // Dinner: if Alba works night shift or saliente, pick easy digestion dinner
    const cRecipe = weekDinners[(idx + rotationSeed) % weekDinners.length];

    // Night snack for Alba HUCA
    const nRecipe = pick(nightSnacks, idx + rotationSeed, nightSnacks[0]);

    if (bRecipe) d.meals.desayuno = bRecipe.id;
    if (lRecipe) d.meals.comida = lRecipe.id;
    if (mRecipe) d.meals.merienda = mRecipe.id;
    if (cRecipe) d.meals.cena = cRecipe.id;
    if (nRecipe) d.meals.snack_nocturno = nRecipe.id;
  });

  return nextDays;
}
