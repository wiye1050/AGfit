export type ProfileView = 'pareja' | 'guille' | 'alba';
export type ThemeMode = 'dark' | 'light';

export type DayId =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

export type GuilleShift = 'manana' | 'tarde' | 'manana_tarde' | 'libre';
export type AlbaShift = 'manana' | 'tarde' | 'noche' | 'saliente' | 'libre';

export interface ShiftCalendarEntry {
  guilleShift: GuilleShift;
  albaShift: AlbaShift;
  note?: string;
}

export type ShiftCalendarMap = Record<string, ShiftCalendarEntry>; // key: 'YYYY-MM-DD'

export type TrainingType =
  | 'empuje'
  | 'tiron'
  | 'pierna'
  | 'padel'
  | 'running'
  | 'movilidad'
  | 'clase_dirigida'
  | 'otra_actividad'
  | 'doble_sesion'
  | 'descanso_total';

export type CarbCycleLevel = 'bajo' | 'medio' | 'alto';

export type MealSlot =
  | 'desayuno'
  | 'comida'
  | 'merienda'
  | 'cena'
  | 'snack_nocturno';

export type ShoppingAisle =
  | 'carniceria'
  | 'pescaderia'
  | 'lacteos'
  | 'fruteria'
  | 'despensa'
  | 'hogar';

export interface MacroSet {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecipeIngredient {
  id: string;
  name: string;
  aisle: ShoppingAisle;
  unit: 'g' | 'ml' | 'ud';
  guilleAmountRaw: number;
  albaAmountRaw: number;
  cookedRatio: number; // e.g., 2.4 for dry rice -> cooked, 0.78 for raw meat -> cooked
  isPantryStaple?: boolean;
  commercialPackHint?: string;
}

export interface Recipe {
  id: string;
  title: string;
  subtitle: string;
  slot: 'desayuno_merienda' | 'principal' | 'snack_noche';
  style: 'salado' | 'dulce' | 'batch_tradicional' | 'airfryer_fresco' | 'rapido';
  prepType: 'batch_domingo' | 'airfryer_express' | 'montaje_rapido';
  tupperFriendly: boolean;
  appliance: 'horno' | 'olla_expres' | 'vitro' | 'airfryer' | 'frio';
  guilleBaseMacros: MacroSet;
  albaBaseMacros: MacroSet;
  ingredients: RecipeIngredient[];
  portionNoteGuille: string;
  portionNoteAlba: string;
  cookingNotes: string;
  defrostAlert?: string;
  tags: string[];
}

export interface CustomMealOverride {
  title: string;
  guilleMacros: MacroSet;
  albaMacros: MacroSet;
  notes?: string;
}

export interface CustomActivityDetail {
  name: string;
  durationMin: number;
  intensity: 'suave' | 'media' | 'alta';
}

export interface DayPlan {
  day: DayId;
  label: string;
  shortLabel: string;
  guilleShift: GuilleShift;
  albaShift: AlbaShift;
  guilleTraining: TrainingType;
  albaTraining: TrainingType;
  albaDirectedClass: string;
  guilleCustomActivity: CustomActivityDetail;
  albaCustomActivity: CustomActivityDetail;
  freeMeals: Partial<Record<MealSlot, boolean>>;
  meals: Record<MealSlot, string>; // maps MealSlot to Recipe.id
  customMealOverrides: Partial<Record<MealSlot, CustomMealOverride>>;
  supplementsCheck: {
    guilleCreatine: boolean;
    guilleWhey: boolean;
    albaCreatine: boolean;
    albaWhey: boolean;
  };
  sessionVariantId?: string;
}

export interface ExerciseAlternative {
  name: string;
  equipment: string;
  note: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  muscleGroup: string;
  padelTransferNote: string;
  sets: number;
  reps: string;
  restSeconds: 60 | 90 | 120;
  targetRir: string;
  guilleDefaultWeight: string;
  albaDefaultWeight: string;
  guilleLastSession: string;
  albaLastSession: string;
  alternatives: ExerciseAlternative[];
}

export interface WorkoutSessionTemplate {
  id: string;
  type: TrainingType;
  variantLabel?: string;
  title: string;
  subtitle: string;
  durationMin: number;
  guilleKcalBurn: number;
  albaKcalBurn: number;
  physioWarmup: string[];
  exercises: ExerciseItem[];
}

export interface SetProgress {
  completed: boolean;
  weight: string;
  reps: string;
  rir: string;
}

export interface PadelMatchLog {
  id: string;
  date: string;
  athlete: 'guille' | 'alba' | 'ambos';
  durationMin: 60 | 90 | 120;
  side: 'reves' | 'drive';
  intensityRpe: number;
  score: string;
  notes: string;
  kcalBurned: number;
}

export interface RunningLog {
  id: string;
  date: string;
  athlete: 'guille' | 'alba';
  templateId: 'zona2' | 'series_padel' | 'tirada_larga';
  distanceKm: number;
  durationMin: number;
  rpe: number;
  notes: string;
  kcalBurned: number;
}

export interface UserTrainingHistoryEntry {
  id: string;
  date: string;
  athlete: 'guille' | 'alba';
  type: TrainingType;
  title: string;
  durationMin: number;
  kcalBurned: number;
  highlightPr?: string;
  notes?: string;
}

export type BatchTrack = 'horno' | 'olla_expres' | 'vitro' | 'airfryer';

export interface BatchCookingStep {
  id: string;
  phase: 'Fase 1 · Arranque y Bases (Min 0-25)' | 'Fase 2 · Proteínas y Sofritos (Min 25-55)' | 'Fase 3 · Remate y Emplatado (Min 55-85)' | 'Entre Semana · Toque Fresco Airfryer (10-12 min)';
  minuteStart: number;
  minuteEnd: number;
  durationTimerSec: number;
  track: BatchTrack;
  title: string;
  description: string;
  proTip: string;
  recipesLinked: string[];
}

export interface CustomShoppingItem {
  id: string;
  name: string;
  quantityText: string;
  aisle: ShoppingAisle;
  inPantry: boolean;
  inCart: boolean;
}

export interface WeightEntry {
  id: string;
  weekLabel: string;
  date: string;
  guilleWeightKg: number;
  albaWeightKg: number;
  notes?: string;
}

export interface GoogleIntegrationConfig {
  firebaseProjectId: string;
  firebaseApiKey: string;
  householdDocId: string;
  guilleEmail: string;
  albaEmail: string;
  calendarIdGuille: string;
  calendarIdAlba: string;
  syncEnabled: boolean;
  lastSyncAt?: string;
  shiftCalendar?: ShiftCalendarMap;
}
