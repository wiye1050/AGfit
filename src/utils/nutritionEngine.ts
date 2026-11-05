import {
  AlbaShift,
  CarbCycleLevel,
  DayPlan,
  GuilleShift,
  MacroSet,
  MealSlot,
  TrainingType,
} from '../types';
import { RECIPE_MAP } from '../data/recipes';

export function getCarbCycleLevel(
  training: TrainingType,
  customIntensity?: 'suave' | 'media' | 'alta'
): CarbCycleLevel {
  if (training === 'padel' || training === 'doble_sesion') {
    return 'alto';
  }
  if (training === 'otra_actividad') {
    if (customIntensity === 'alta') return 'alto';
    if (customIntensity === 'media') return 'medio';
    return 'bajo';
  }
  if (
    training === 'empuje' ||
    training === 'tiron' ||
    training === 'pierna' ||
    training === 'running' ||
    training === 'clase_dirigida'
  ) {
    return 'medio';
  }
  return 'bajo';
}

export function getGuilleTargetMacros(level: CarbCycleLevel): MacroSet {
  switch (level) {
    case 'bajo':
      return { kcal: 1950, protein: 180, carbs: 165, fat: 62 };
    case 'medio':
      return { kcal: 2200, protein: 180, carbs: 225, fat: 64 };
    case 'alto':
      return { kcal: 2450, protein: 180, carbs: 285, fat: 65 };
  }
}

export function getAlbaTargetMacros(
  level: CarbCycleLevel,
  shift: AlbaShift
): MacroSet {
  const shiftBonusKcal = shift === 'noche' ? 90 : shift === 'manana' || shift === 'tarde' ? 30 : 0;
  const shiftBonusCarbs = Math.round(shiftBonusKcal / 4);

  switch (level) {
    case 'bajo':
      return {
        kcal: 1650 + shiftBonusKcal,
        protein: 105,
        carbs: 175 + shiftBonusCarbs,
        fat: 58,
      };
    case 'medio':
      return {
        kcal: 1850 + shiftBonusKcal,
        protein: 108,
        carbs: 215 + shiftBonusCarbs,
        fat: 60,
      };
    case 'alto':
      return {
        kcal: 1950 + shiftBonusKcal,
        protein: 110,
        carbs: 238 + shiftBonusCarbs,
        fat: 62,
      };
  }
}

export interface DayNutritionSummary {
  guilleLevel: CarbCycleLevel;
  albaLevel: CarbCycleLevel;
  guilleTarget: MacroSet;
  albaTarget: MacroSet;
  guillePlanned: MacroSet;
  albaPlanned: MacroSet;
  guillePeriWorkoutNote: string;
  albaPeriWorkoutNote: string;
  caffeineProtocolGuille: string;
  caffeineProtocolAlba: string;
  mealLogistics: Record<
    MealSlot,
    {
      guilleLocation: '🏠 Casa' | '🎉 Libre';
      albaLocation: '🏠 Casa' | '🥡 Tupper HUCA' | '🎉 Libre' | '—';
      scheduleHint: string;
    }
  >;
}

export function computeDayNutrition(dayPlan: DayPlan): DayNutritionSummary {
  const guilleLevel = getCarbCycleLevel(
    dayPlan.guilleTraining,
    dayPlan.guilleCustomActivity?.intensity
  );
  const albaLevel = getCarbCycleLevel(
    dayPlan.albaTraining,
    dayPlan.albaCustomActivity?.intensity
  );

  const guilleTarget = getGuilleTargetMacros(guilleLevel);
  const albaTarget = getAlbaTargetMacros(albaLevel, dayPlan.albaShift);

  // Sum base recipes (excluding free meals)
  const slots: MealSlot[] = ['desayuno', 'comida', 'merienda', 'cena'];
  if (dayPlan.albaShift === 'noche') {
    slots.push('snack_nocturno');
  }

  const guilleBase: MacroSet = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const albaBase: MacroSet = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  for (const slot of slots) {
    if (dayPlan.freeMeals[slot]) continue;

    const custom = dayPlan.customMealOverrides[slot];
    if (custom) {
      guilleBase.kcal += custom.guilleMacros.kcal;
      guilleBase.protein += custom.guilleMacros.protein;
      guilleBase.carbs += custom.guilleMacros.carbs;
      guilleBase.fat += custom.guilleMacros.fat;

      albaBase.kcal += custom.albaMacros.kcal;
      albaBase.protein += custom.albaMacros.protein;
      albaBase.carbs += custom.albaMacros.carbs;
      albaBase.fat += custom.albaMacros.fat;
      continue;
    }

    const recipe = RECIPE_MAP[dayPlan.meals[slot]];
    if (!recipe) continue;

    if (slot !== 'snack_nocturno') {
      guilleBase.kcal += recipe.guilleBaseMacros.kcal;
      guilleBase.protein += recipe.guilleBaseMacros.protein;
      guilleBase.carbs += recipe.guilleBaseMacros.carbs;
      guilleBase.fat += recipe.guilleBaseMacros.fat;
    }

    albaBase.kcal += recipe.albaBaseMacros.kcal;
    albaBase.protein += recipe.albaBaseMacros.protein;
    albaBase.carbs += recipe.albaBaseMacros.carbs;
    albaBase.fat += recipe.albaBaseMacros.fat;
  }

  // Satellite / Peri-workout Carb Cycling adjustment (leaves Batch Cooking Lunch & Dinner tuppers intact!)
  let guillePeriWorkoutNote = '';
  let guilleSatelliteKcal = 0;
  let guilleSatelliteCarbs = 0;
  let guilleSatelliteProtein = 0;

  if (guilleLevel === 'bajo') {
    guilleSatelliteKcal = -160;
    guilleSatelliteCarbs = -38;
    guilleSatelliteProtein = 2;
    guillePeriWorkoutNote =
      'Ciclado BAJO (Descanso/Movilidad): Tupper de comida y cena intactos. Reduce 1 rebanada de pan/25g avena en desayuno y merienda.';
  } else if (guilleLevel === 'medio') {
    guilleSatelliteKcal = 85;
    guilleSatelliteCarbs = 18;
    guilleSatelliteProtein = 4;
    guillePeriWorkoutNote =
      'Ciclado MEDIO (Gym Enjoy / Running): Tuppers estándar + 1 pieza de fruta o 2 tortitas de arroz en el pre-entreno.';
  } else {
    guilleSatelliteKcal = 335;
    guilleSatelliteCarbs = 76;
    guilleSatelliteProtein = 6;
    guillePeriWorkoutNote =
      'Ciclado ALTO (Pádel 90m / Ruta / Doble): Tuppers intactos + Recarga Satélite (+40g avena/cereales en desayuno + 1 plátano y 30g pan/tortitas perientreno).';
  }

  let albaPeriWorkoutNote = '';
  let albaSatelliteKcal = 0;
  let albaSatelliteCarbs = 0;

  if (albaLevel === 'bajo') {
    albaSatelliteKcal = -30;
    albaSatelliteCarbs = -8;
    albaPeriWorkoutNote =
      'Mantenimiento Suave: Porciones base del menú sin extras perientreno.';
  } else if (albaLevel === 'medio') {
    albaSatelliteKcal = 155;
    albaSatelliteCarbs = 32;
    albaPeriWorkoutNote =
      'Mantenimiento Activo (Gym / Clase Dirigida): Añade +1 fruta y +20g avena/pan en merienda.';
  } else {
    albaSatelliteKcal = 255;
    albaSatelliteCarbs = 55;
    albaPeriWorkoutNote =
      'Día de Pádel / Alta Demanda: Añade +1 plátano pre-partido y +30g pan/cereales en desayuno o merienda.';
  }

  const guillePlanned: MacroSet = {
    kcal: Math.max(0, guilleBase.kcal + guilleSatelliteKcal),
    protein: Math.max(0, guilleBase.protein + guilleSatelliteProtein),
    carbs: Math.max(0, guilleBase.carbs + guilleSatelliteCarbs),
    fat: guilleBase.fat,
  };

  const albaPlanned: MacroSet = {
    kcal: Math.max(0, albaBase.kcal + albaSatelliteKcal),
    protein: albaBase.protein,
    carbs: Math.max(0, albaBase.carbs + albaSatelliteCarbs),
    fat: albaBase.fat,
  };

  // Caffeine protocol
  const caffeineProtocolGuille =
    dayPlan.guilleShift === 'manana_tarde'
      ? '☕ 2 cafés (08:00h y 14:45h tras comer en casa). Corte estricto: 16:30h.'
      : '☕ 1-2 cafés (mañana y pre-entreno). Corte estricto: 16:30h para optimizar descanso.';

  const caffeineProtocolAlba =
    dayPlan.albaShift === 'noche'
      ? '🌙 Turno Noche HUCA: Café permitido al entrar (22:00h) y límite 02:00h para dormir bien a las 08:30h.'
      : dayPlan.albaShift === 'saliente'
      ? '🛌 Saliente de Noche: 0% cafeína al salir a las 08:00h; solo 1 café suave al despertar (~15:00h).'
      : dayPlan.albaShift === 'manana'
      ? '☀️ Turno Mañana HUCA (08-15h): Café 07:15h y media mañana 11:00h. Corte: 16:00h.'
      : '🌆 Turno Tarde / Libre: Café en desayuno y sobremesa (14:15h). Corte: 16:30h.';

  // Logistics per meal
  const mealLogistics: DayNutritionSummary['mealLogistics'] = {
    desayuno: {
      guilleLocation: dayPlan.freeMeals.desayuno ? '🎉 Libre' : '🏠 Casa',
      albaLocation: dayPlan.freeMeals.desayuno ? '🎉 Libre' : '🏠 Casa',
      scheduleHint:
        dayPlan.albaShift === 'saliente'
          ? 'Guille 08:00h | Alba 08:30h (ligero antes de dormir tras la noche)'
          : dayPlan.albaShift === 'manana'
          ? 'Alba 07:10h antes de ir al HUCA | Guille 08:15h'
          : '08:30h – 09:30h en casa',
    },
    comida: {
      guilleLocation: dayPlan.freeMeals.comida ? '🎉 Libre' : '🏠 Casa',
      albaLocation: dayPlan.freeMeals.comida ? '🎉 Libre' : '🏠 Casa',
      scheduleHint:
        dayPlan.albaShift === 'manana'
          ? 'Guille come en casa (14:15h) | Alba come en casa al salir del HUCA (~15:30h)'
          : dayPlan.albaShift === 'tarde'
          ? 'Alba come en casa a las 13:30h antes de ir al HUCA | Guille come en casa'
          : dayPlan.albaShift === 'saliente'
          ? 'Comida en casa cuando Alba se despierta (~15:00h)'
          : 'Comida juntos en casa (~14:30h)',
    },
    merienda: {
      guilleLocation: dayPlan.freeMeals.merienda ? '🎉 Libre' : '🏠 Casa',
      albaLocation: dayPlan.freeMeals.merienda
        ? '🎉 Libre'
        : dayPlan.albaShift === 'tarde'
        ? '🥡 Tupper HUCA'
        : '🏠 Casa',
      scheduleHint:
        dayPlan.albaShift === 'tarde'
          ? 'Alba se lleva la merienda al HUCA (~18:30h) | Guille Perientreno'
          : '17:30h – 18:30h (Pre/Post-Entreno)',
    },
    cena: {
      guilleLocation: dayPlan.freeMeals.cena ? '🎉 Libre' : '🏠 Casa',
      albaLocation: dayPlan.freeMeals.cena ? '🎉 Libre' : '🏠 Casa',
      scheduleHint:
        dayPlan.albaShift === 'tarde'
          ? 'Cena en casa cuando Alba vuelve del HUCA (~22:30h)'
          : dayPlan.albaShift === 'noche'
          ? 'Cena potente en casa a las 20:45h antes de que Alba entre al HUCA (22:00h)'
          : 'Cena juntos en casa (~21:15h)',
    },
    snack_nocturno: {
      guilleLocation: '🏠 Casa',
      albaLocation: dayPlan.albaShift === 'noche' ? '🥡 Tupper HUCA' : '—',
      scheduleHint:
        dayPlan.albaShift === 'noche'
          ? 'Exclusivo Alba en el HUCA (~02:30h - 03:00h de la madrugada)'
          : 'Solo activo en Turno de Noche HUCA',
    },
  };

  return {
    guilleLevel,
    albaLevel,
    guilleTarget,
    albaTarget,
    guillePlanned,
    albaPlanned,
    guillePeriWorkoutNote,
    albaPeriWorkoutNote,
    caffeineProtocolGuille,
    caffeineProtocolAlba,
    mealLogistics,
  };
}

export const GUILLE_SHIFT_LABELS: Record<GuilleShift, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  manana_tarde: 'Mañana y Tarde (Partido)',
  libre: 'Libre',
};

export const ALBA_SHIFT_LABELS: Record<AlbaShift, string> = {
  manana: 'Mañana HUCA (08-15h)',
  tarde: 'Tarde HUCA (15-22h)',
  noche: 'Noche HUCA (22-08h)',
  saliente: 'Saliente de Noche',
  libre: 'Libre',
};

export const TRAINING_LABELS: Record<TrainingType, { label: string; short: string; badgeColor: string }> = {
  empuje: { label: 'Gym · Empuje (Push)', short: 'Empuje', badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  tiron: { label: 'Gym · Tirón (Pull)', short: 'Tirón', badgeColor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  pierna: { label: 'Gym · Pierna (Legs)', short: 'Pierna', badgeColor: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
  padel: { label: 'Partido de Pádel (90m)', short: 'Pádel', badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  running: { label: 'Running Oviedo / Cinta', short: 'Running', badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  movilidad: { label: 'Descanso / Movilidad Pádel', short: 'Movilidad', badgeColor: 'bg-teal-500/15 text-teal-400 border-teal-500/30' },
  clase_dirigida: { label: 'Clase Dirigida Enjoy (Pilates/GAP...)', short: 'Clase Enjoy', badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  otra_actividad: { label: 'Otra Actividad (Ruta/Escalada/Fútbol...)', short: 'Outdoor/Otro', badgeColor: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  doble_sesion: { label: 'Doble Sesión (Gym + Pádel/Run)', short: 'Doble Sesión', badgeColor: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30' },
  descanso_total: { label: 'Descanso Total', short: 'Descanso', badgeColor: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
};
