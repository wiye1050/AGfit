import { DayPlan, MealSlot, ShoppingAisle } from '../types';
import { RECIPE_MAP } from '../data/recipes';

export interface AggregatedShoppingItem {
  id: string;
  name: string;
  aisle: ShoppingAisle;
  unit: 'g' | 'ml' | 'ud';
  guilleNetTotal: number;
  albaNetTotal: number;
  totalNetRaw: number;
  commercialRecommendation: string;
  isPantryStaple: boolean;
  usedInMealsCount: number;
}

export const AISLE_META: Record<
  ShoppingAisle,
  { title: string; subtitle: string; badgeClass: string; iconName: string }
> = {
  carniceria: {
    title: 'Carnicería y Charcutería Magra',
    subtitle: 'Pollo, ternera asturiana, pavo 92% y jamón serrano',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    iconName: 'Beef',
  },
  pescaderia: {
    title: 'Pescadería',
    subtitle: 'Salmón noruego fresco para Airfryer entre semana',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    iconName: 'Fish',
  },
  lacteos: {
    title: 'Lácteos (Leche Sin Lactosa, Yogures y Quesos)',
    subtitle: 'Leche Sin Lactosa para ambos + yogures variados, huevos y quesos normales',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    iconName: 'Milk',
  },
  fruteria: {
    title: 'Frutería y Verduras Frescas',
    subtitle: '0% Tomate crudo (Guille), 0% Repollo y 0% Coliflor garantizado',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconName: 'Apple',
  },
  despensa: {
    title: 'Despensa, Secos, Conservas y Café',
    subtitle: 'Arroz, pasta, cuscús, avena, atún al natural, tomate cocinado y café',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    iconName: 'Package',
  },
  hogar: {
    title: 'Hogar, Congelados, Suplementos y Otros',
    subtitle: 'Artículos añadidos manualmente y básicos de casa',
    badgeClass: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    iconName: 'Home',
  },
};

function formatCommercialSuggestion(
  id: string,
  totalNet: number,
  unit: 'g' | 'ml' | 'ud',
  aisle: ShoppingAisle
): string {
  if (unit === 'ud') {
    const roundedUnits = Math.ceil(totalNet);
    if (id === 'ing_huevos') {
      const dozens = Math.ceil(roundedUnits / 12);
      return `Comprar ${roundedUnits} uds (${dozens === 1 ? '1 docena L' : `${dozens} docenas`})`;
    }
    if (id === 'ing_wraps') {
      const packs = Math.ceil(roundedUnits / 8);
      return `Comprar ${roundedUnits} tortillas (${packs} paq. de 8 uds)`;
    }
    return `Comprar ${roundedUnits} uds`;
  }

  if (unit === 'ml') {
    const liters = (totalNet / 1000).toFixed(1);
    const bricks = Math.ceil(totalNet / 1000);
    return `Comprar ${bricks} bricks de 1L (~${liters} L netos)`;
  }

  // unit === 'g'
  if (aisle === 'carniceria' || aisle === 'pescaderia') {
    // Add 12% shrinkage / trimming margin for fresh meat & fish
    const withMarginG = Math.ceil((totalNet * 1.12) / 50) * 50;
    if (withMarginG >= 1000) {
      const kg = (withMarginG / 1000).toFixed(2);
      const trays = Math.ceil(withMarginG / 600);
      return `Comprar ~${kg} kg (+12% merma · ${trays} bandejas aprox.)`;
    }
    return `Comprar ~${withMarginG} g (+12% merma)`;
  }

  if (id === 'ing_yogur_var') {
    const units125 = Math.ceil(totalNet / 125);
    const packs4 = Math.ceil(units125 / 4);
    return `Comprar ~${totalNet} g (${units125} yogures de 125g · ${packs4} packs de 4 o 3 botes de 500g)`;
  }

  if (id === 'ing_atun') {
    const cans = Math.ceil(totalNet / 56);
    return `Comprar ${cans} latas de atún al natural (~${totalNet}g escurrido)`;
  }

  if (totalNet >= 1000) {
    return `Comprar ~${(Math.ceil(totalNet / 100) / 10).toFixed(1)} kg`;
  }

  return `Comprar ~${Math.ceil(totalNet / 25) * 25} g`;
}

export function aggregateWeeklyShoppingList(days: DayPlan[]): AggregatedShoppingItem[] {
  const map = new Map<string, AggregatedShoppingItem>();

  for (const day of days) {
    const slots: MealSlot[] = ['desayuno', 'comida', 'merienda', 'cena'];
    if (day.albaShift === 'noche') {
      slots.push('snack_nocturno');
    }

    for (const slot of slots) {
      if (day.freeMeals[slot]) continue;
      if (day.customMealOverrides[slot]) continue;

      const recipeId = day.meals[slot];
      const recipe = RECIPE_MAP[recipeId];
      if (!recipe) continue;

      for (const ing of recipe.ingredients) {
        const guilleAdd = slot === 'snack_nocturno' ? 0 : ing.guilleAmountRaw;
        const albaAdd = ing.albaAmountRaw;
        const sumAdd = guilleAdd + albaAdd;
        if (sumAdd <= 0) continue;

        const existing = map.get(ing.id);
        if (existing) {
          existing.guilleNetTotal += guilleAdd;
          existing.albaNetTotal += albaAdd;
          existing.totalNetRaw += sumAdd;
          existing.usedInMealsCount += 1;
        } else {
          map.set(ing.id, {
            id: ing.id,
            name: ing.name,
            aisle: ing.aisle,
            unit: ing.unit,
            guilleNetTotal: guilleAdd,
            albaNetTotal: albaAdd,
            totalNetRaw: sumAdd,
            commercialRecommendation: '',
            isPantryStaple: Boolean(ing.isPantryStaple),
            usedInMealsCount: 1,
          });
        }
      }
    }
  }

  const items = Array.from(map.values());
  for (const item of items) {
    item.guilleNetTotal = Math.round(item.guilleNetTotal * 10) / 10;
    item.albaNetTotal = Math.round(item.albaNetTotal * 10) / 10;
    item.totalNetRaw = Math.round(item.totalNetRaw * 10) / 10;
    item.commercialRecommendation = formatCommercialSuggestion(
      item.id,
      item.totalNetRaw,
      item.unit,
      item.aisle
    );
  }

  return items;
}

export const QUICK_ADD_SUGGESTIONS: Array<{
  name: string;
  quantityText: string;
  aisle: ShoppingAisle;
}> = [
  { name: 'Cápsulas / Grano de Café Espresso', quantityText: '2 cajas / 500g', aisle: 'despensa' },
  { name: 'Aceite de Oliva Virgen Extra (AOVE)', quantityText: '1 botella 1L', aisle: 'despensa' },
  { name: 'Creatina Monohidrato Creapure', quantityText: 'Bote 300g', aisle: 'hogar' },
  { name: 'Proteína Whey Aislada', quantityText: 'Bolsa 1 kg', aisle: 'hogar' },
  { name: 'Papel de horno + Tuppers herméticos cristal', quantityText: '1 rollo', aisle: 'hogar' },
  { name: 'Aguacates maduros (para tostadas)', quantityText: 'Bandeja 2 uds', aisle: 'fruteria' },
  { name: 'Sales / Electrolitos para Pádel', quantityText: '1 tubo', aisle: 'hogar' },
  { name: 'Especias (Pimentón de la Vera, Ajo, Orégano, Cúrcuma)', quantityText: 'Reposición', aisle: 'despensa' },
];
