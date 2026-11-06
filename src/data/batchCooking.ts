import { BatchCookingStep, DayPlan, MealSlot, Recipe } from '../types';
import { RECIPE_MAP } from './recipes';

export const BATCH_COOKING_STEPS: BatchCookingStep[] = [
  // ==========================================
  // FASE 1 · ARRANQUE Y BASES (MIN 0 - 25)
  // ==========================================
  {
    id: 'bc_1',
    phase: 'Fase 1 · Arranque y Bases (Min 0-25)',
    minuteStart: 0,
    minuteEnd: 15,
    durationTimerSec: 900,
    track: 'horno',
    title: 'Precalentar Horno a 200°C + Bandeja 1: Patatas en Gajos y Pimientos/Calabacín',
    description:
      'Trocea las patatas de la semana, calabacín y pimientos en dados. Rocia con AOVE, sal, ajo en polvo y romero en la bandeja grande del horno.',
    proTip:
      'Usa papel vegetal para no fregar la bandeja y mete las patatas mientras termina de subir a 200°C.',
    recipesLinked: ['pri_salmon_patata_airfryer', 'pri_tortilla_patata_atun_espinacas'],
  },
  {
    id: 'bc_2',
    phase: 'Fase 1 · Arranque y Bases (Min 0-25)',
    minuteStart: 3,
    minuteEnd: 23,
    durationTimerSec: 1080,
    track: 'olla_expres',
    title: 'Olla Exprés (Tanda 1): Estofado de Ternera Magra o Lentejas con Verduras',
    description:
      'En el fuego grande de la Vitro, sella 3 min los dados de carne/pollo con cebolla y zanahoria en la Olla Exprés. Cubre con agua/caldo, cierra válvula y cuenta 18 min desde que suba el pitorro.',
    proTip:
      'Al usar la Olla Exprés ahorras 45 minutos de cocción y la carne queda melosa para los tuppers.',
    recipesLinked: ['pri_ternera_patata_olla', 'pri_lentejas_pollo_arroz'],
  },
  {
    id: 'bc_3',
    phase: 'Fase 1 · Arranque y Bases (Min 0-25)',
    minuteStart: 5,
    minuteEnd: 22,
    durationTimerSec: 1020,
    track: 'vitro',
    title: 'Fuegos 2 y 3 de la Vitro: Cazuela de Arroz Basmati + Olla de Pasta al Dente',
    description:
      'Fuego mediano: Arroz basmati para toda la semana (12 min cocción + 5 reposo). Fuego auxiliar: Agua hirviendo para la pasta corta (cocer 1 minuto menos de lo que marque el paquete).',
    proTip:
      'Enfría la pasta con un hilo de agua fría tras escurrir para cortar la cocción y que quede entera al recalentar.',
    recipesLinked: ['pri_pollo_arroz_sofrito', 'pri_pasta_atun_sofrito', 'pri_salmon_arroz_teriyaki'],
  },

  // ==========================================
  // FASE 2 · PROTEÍNAS Y SOFRITOS (MIN 25 - 55)
  // ==========================================
  {
    id: 'bc_4',
    phase: 'Fase 2 · Proteínas y Sofritos (Min 25-55)',
    minuteStart: 25,
    minuteEnd: 48,
    durationTimerSec: 1380,
    track: 'horno',
    title: 'Horno 200°C (Bandeja 2): Pollo Marinado al Limón y Pimentón de la Vera',
    description:
      'Saca la primera bandeja de patatas y mete toda la tanda de pechuga/contramuslo de pollo marinado durante 22 minutos. Queda jugoso sin ensuciar sartenes.',
    proTip:
      'Recoge todo el jugo que suelte el pollo en la bandeja y échalo por encima al repartir en los tuppers de Guille y Alba.',
    recipesLinked: ['pri_pollo_arroz_sofrito', 'pri_cuscus_pollo_especiado'],
  },
  {
    id: 'bc_5',
    phase: 'Fase 2 · Proteínas y Sofritos (Min 25-55)',
    minuteStart: 26,
    minuteEnd: 44,
    durationTimerSec: 1080,
    track: 'vitro',
    title: 'Sartén Grande en Vitro: Gran Sofrito Base (Cebolla, Champiñones, Pimientos y Tomate Cocinado)',
    description:
      'Pocha cebolla, pimientos y champiñones laminados. Añade el tomate triturado/frito y deja reducir 12 min (100% cocinado, apto para Guille). Separa la mitad para mezclar con el atún de la pasta.',
    proTip:
      'Este sofrito cocinado es el comodín que da jugosidad tanto a la pasta con atún como al arroz con pollo.',
    recipesLinked: ['pri_pasta_atun_sofrito', 'pri_pollo_arroz_sofrito'],
  },
  {
    id: 'bc_6',
    phase: 'Fase 2 · Proteínas y Sofritos (Min 25-55)',
    minuteStart: 30,
    minuteEnd: 45,
    durationTimerSec: 900,
    track: 'airfryer',
    title: 'Airfryer (1 Cesta · 190°C): Tiras de Pollo y Pimientos para Fajitas + Brócoli/Judías al Vapor-Tostado',
    description:
      'En la cesta de la Airfryer (sin saturarla), dora 14 min las tiras de pollo con especias fajita, pimiento y cebolla.',
    proTip:
      'Al no meter el salmón el domingo en la Airfryer, dejas la cesta libre para dejar listo el relleno de fajitas en 14 min.',
    recipesLinked: ['pri_fajitas_pollo_pimientos'],
  },

  // ==========================================
  // FASE 3 · REMATE Y EMPLATADO (MIN 55 - 85)
  // ==========================================
  {
    id: 'bc_7',
    phase: 'Fase 3 · Remate y Emplatado (Min 55-85)',
    minuteStart: 55,
    minuteEnd: 63,
    durationTimerSec: 360,
    track: 'vitro',
    title: 'Hidratación en 5 min del Cuscús + Cocción de Huevos Camperos',
    description:
      'Vierte caldo/agua hirviendo con cúrcuma y 1 cdita de AOVE sobre el cuscús en un bol, tapa 5 min y airea con tenedor. Cuece 4-6 huevos durante 9 min para desayunos y pokes.',
    proTip:
      'Guarda los huevos cocidos con cáscara en la nevera; aguantan toda la semana perfectos.',
    recipesLinked: ['pri_cuscus_pollo_especiado', 'pri_salmon_arroz_teriyaki'],
  },
  {
    id: 'bc_8',
    phase: 'Fase 3 · Remate y Emplatado (Min 55-85)',
    minuteStart: 65,
    minuteEnd: 85,
    durationTimerSec: 1200,
    track: 'horno',
    title: 'Pesaje Dual en Báscula y Cierre de Tuppers (Guille vs. Alba)',
    description:
      'Con la tabla de reparto inferior, coloca primero la base de hidrato (arroz/pasta/patata/cuscús) y encima la proteína en los tuppers de Guille y de Alba. Deja atemperar 15 min antes de cerrar la tapa.',
    proTip:
      'Usa tuppers o pegatinas de color distinto (ej. Azul/Verde = Guille · Rosa/Blanco = Alba) para cogerlos sin pensar por la mañana.',
    recipesLinked: ['pri_pollo_arroz_sofrito', 'pri_pasta_atun_sofrito', 'pri_cuscus_pollo_especiado', 'pri_ternera_patata_olla'],
  },

  // ==========================================
  // ENTRE SEMANA · TOQUE FRESCO AIRFRYER (10-12 MIN)
  // ==========================================
  {
    id: 'bc_9',
    phase: 'Entre Semana · Toque Fresco Airfryer (10-12 min)',
    minuteStart: 0,
    minuteEnd: 11,
    durationTimerSec: 660,
    track: 'airfryer',
    title: 'Toque Fresco Entre Semana: Lomos / Dados de Salmón en Airfryer (195°C · 10-11 min)',
    description:
      'Saca del frigorífico la guarnición ya hecha del domingo (patata asada o arroz + verdura). Mete los 2 lomos de salmón (200g Guille + 145g Alba) en la Airfryer a 195°C durante 10-11 minutos.',
    proTip:
      'Así el salmón queda jugoso por dentro y crujiente por fuera, evitando recalentarlo seco de 4 días.',
    recipesLinked: ['pri_salmon_patata_airfryer', 'pri_salmon_arroz_teriyaki'],
  },
];

export interface TupperBatchSummaryItem {
  recipeId: string;
  recipeTitle: string;
  prepType: 'batch_domingo' | 'airfryer_express' | 'montaje_rapido';
  appliance: string;
  occurrencesCount: number;
  daysScheduled: string[];
  guilleRawPerMealSummary: string;
  albaRawPerMealSummary: string;
  guilleCookedPerTupperG: number;
  albaCookedPerTupperG: number;
  totalBatchCookedG: number;
}

export function calculateWeeklyBatchSummary(
  days: DayPlan[],
  customRecipes: Recipe[] = []
): TupperBatchSummaryItem[] {
  const customMap = Object.fromEntries(customRecipes.map((r) => [r.id, r]));
  const map = new Map<
    string,
    {
      count: number;
      daysList: string[];
    }
  >();

  const principalSlots: MealSlot[] = ['comida', 'cena'];

  for (const d of days) {
    for (const slot of principalSlots) {
      if (d.freeMeals[slot]) continue;
      if (d.customMealOverrides[slot]) continue;

      const rId = d.meals[slot];
      const recipe = RECIPE_MAP[rId] || customMap[rId];
      if (!recipe || recipe.slot !== 'principal') continue;

      const existing = map.get(rId) || { count: 0, daysList: [] };
      existing.count += 1;
      existing.daysList.push(`${d.shortLabel} (${slot === 'comida' ? 'Comida' : 'Cena'})`);
      map.set(rId, existing);
    }
  }

  const results: TupperBatchSummaryItem[] = [];

  for (const [rId, info] of map.entries()) {
    const recipe = RECIPE_MAP[rId] || customMap[rId];
    if (!recipe) continue;

    let guilleCookedPerTupperG = 0;
    let albaCookedPerTupperG = 0;

    for (const ing of recipe.ingredients) {
      if (ing.unit === 'g') {
        guilleCookedPerTupperG += Math.round(ing.guilleAmountRaw * ing.cookedRatio);
        albaCookedPerTupperG += Math.round(ing.albaAmountRaw * ing.cookedRatio);
      } else if (ing.unit === 'ud') {
        guilleCookedPerTupperG += Math.round(ing.guilleAmountRaw * 55);
        albaCookedPerTupperG += Math.round(ing.albaAmountRaw * 55);
      }
    }

    const totalBatchCookedG =
      (guilleCookedPerTupperG + albaCookedPerTupperG) * info.count;

    results.push({
      recipeId: rId,
      recipeTitle: recipe.title,
      prepType: recipe.prepType,
      appliance: recipe.appliance,
      occurrencesCount: info.count,
      daysScheduled: info.daysList,
      guilleRawPerMealSummary: recipe.portionNoteGuille,
      albaRawPerMealSummary: recipe.portionNoteAlba,
      guilleCookedPerTupperG,
      albaCookedPerTupperG,
      totalBatchCookedG,
    });
  }

  return results;
}
