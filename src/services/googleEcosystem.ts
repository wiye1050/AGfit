import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import {
  AlbaShift,
  DayPlan,
  GoogleIntegrationConfig,
  GuilleShift,
} from '../types';
import {
  ALBA_SHIFT_LABELS,
  computeDayNutrition,
  GUILLE_SHIFT_LABELS,
  TRAINING_LABELS,
} from '../utils/nutritionEngine';
import { RECIPE_MAP } from '../data/recipes';
import { AggregatedShoppingItem } from '../utils/shoppingEngine';

let firebaseAppInstance: FirebaseApp | null = null;
let googleAccessToken: string | null = null;

export function initFirebaseIfConfigured(config: GoogleIntegrationConfig): FirebaseApp | null {
  if (!config.firebaseProjectId || !config.firebaseApiKey) {
    return null;
  }
  try {
    const existing = getApps();
    if (existing.length > 0) {
      firebaseAppInstance = existing[0];
      return firebaseAppInstance;
    }
    firebaseAppInstance = initializeApp({
      apiKey: config.firebaseApiKey.trim(),
      authDomain: `${config.firebaseProjectId.trim()}.firebaseapp.com`,
      projectId: config.firebaseProjectId.trim(),
    });
    return firebaseAppInstance;
  } catch (err) {
    console.warn('Error inicializando Firebase:', err);
    return null;
  }
}

export async function loginWithGoogleEcosystem(
  config: GoogleIntegrationConfig
): Promise<{ user: User | null; accessToken: string | null; error?: string }> {
  const app = initFirebaseIfConfigured(config);
  if (!app) {
    return {
      user: null,
      accessToken: null,
      error: 'Introduce primero el Project ID y API Key de Firebase en el panel.',
    };
  }

  try {
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    provider.addScope('https://www.googleapis.com/auth/calendar.readonly');

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    googleAccessToken = credential?.accessToken || null;

    const email = result.user.email?.toLowerCase() || '';
    const allowed = [config.guilleEmail, config.albaEmail]
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowed.length > 0 && !allowed.includes(email)) {
      await signOut(auth);
      return {
        user: null,
        accessToken: null,
        error: `Acceso denegado para ${email}. Solo están autorizadas las cuentas de Guille y Alba.`,
      };
    }

    return { user: result.user, accessToken: googleAccessToken };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al iniciar sesión con Google';
    return { user: null, accessToken: null, error: msg };
  }
}

export function subscribeHouseholdRealtime(
  config: GoogleIntegrationConfig,
  onData: (payload: Record<string, unknown>) => void
): Unsubscribe | null {
  const app = initFirebaseIfConfigured(config);
  if (!app || !config.syncEnabled) return null;

  try {
    const db = getFirestore(app);
    const docRef = doc(db, 'agfit_households', config.householdDocId || 'oviedo_guille_alba');
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as Record<string, unknown>);
      }
    });
  } catch (err) {
    console.warn('No se pudo suscribir a Firestore:', err);
    return null;
  }
}

export async function pushHouseholdRealtime(
  config: GoogleIntegrationConfig,
  payload: Record<string, unknown>
): Promise<boolean> {
  const app = initFirebaseIfConfigured(config);
  if (!app || !config.syncEnabled) return false;

  try {
    const db = getFirestore(app);
    const docRef = doc(db, 'agfit_households', config.householdDocId || 'oviedo_guille_alba');
    await setDoc(
      docRef,
      {
        ...payload,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('Error guardando en Firestore:', err);
    return false;
  }
}

// ==========================================
// EXPORTACIÓN A GOOGLE CALENDAR (.ICS + API + DEEP LINK)
// ==========================================

function getNextMondayDate(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatIcsDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

export function exportWeekToGoogleCalendarIcs(days: DayPlan[]): void {
  const baseMonday = getNextMondayDate();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AGfit Oviedo//Guille & Alba//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  days.forEach((day, index) => {
    const date = new Date(baseMonday);
    date.setDate(baseMonday.getDate() + index);

    // 1. Turno Alba HUCA
    if (day.albaShift !== 'libre') {
      const start = new Date(date);
      const end = new Date(date);
      if (day.albaShift === 'manana') {
        start.setHours(8, 0);
        end.setHours(15, 0);
      } else if (day.albaShift === 'tarde') {
        start.setHours(15, 0);
        end.setHours(22, 0);
      } else if (day.albaShift === 'noche') {
        start.setHours(22, 0);
        end.setDate(end.getDate() + 1);
        end.setHours(8, 0);
      } else {
        start.setHours(8, 0);
        end.setHours(14, 30);
      }

      lines.push(
        'BEGIN:VEVENT',
        `UID:agfit-alba-shift-${day.day}-${Date.now()}@agfit.oviedo`,
        `DTSTART:${formatIcsDateTime(start)}`,
        `DTEND:${formatIcsDateTime(end)}`,
        `SUMMARY:[HUCA Alba] ${ALBA_SHIFT_LABELS[day.albaShift]}`,
        `DESCRIPTION:Turno de Alba en el HUCA (${ALBA_SHIFT_LABELS[day.albaShift]}). Comida: ${RECIPE_MAP[day.meals.comida]?.title || ''}`,
        'LOCATION:HUCA - Hospital Universitario Central de Asturias, Oviedo',
        'END:VEVENT'
      );
    }

    // 2. Entreno Guille & Alba
    const trainStart = new Date(date);
    trainStart.setHours(18, 30);
    const trainEnd = new Date(date);
    trainEnd.setHours(19, 45);

    const gTrain = TRAINING_LABELS[day.guilleTraining].label;
    const aTrain =
      day.albaTraining === 'clase_dirigida'
        ? `Clase Enjoy (${day.albaDirectedClass})`
        : TRAINING_LABELS[day.albaTraining].label;

    lines.push(
      'BEGIN:VEVENT',
      `UID:agfit-train-${day.day}-${Date.now()}@agfit.oviedo`,
      `DTSTART:${formatIcsDateTime(trainStart)}`,
      `DTEND:${formatIcsDateTime(trainEnd)}`,
      `SUMMARY:[AGfit Entreno] Guille: ${gTrain} | Alba: ${aTrain}`,
      `DESCRIPTION:Entreno del día en AGfit. Cena planificada: ${RECIPE_MAP[day.meals.cena]?.title || 'Libre'}`,
      'LOCATION:Enjoy! Oviedo / Pista de Pádel',
      'END:VEVENT'
    );

    // 3. Batch Cooking el Domingo
    if (day.day === 'domingo') {
      const bcStart = new Date(date);
      bcStart.setHours(17, 0);
      const bcEnd = new Date(date);
      bcEnd.setHours(18, 30);
      lines.push(
        'BEGIN:VEVENT',
        `UID:agfit-batch-${Date.now()}@agfit.oviedo`,
        `DTSTART:${formatIcsDateTime(bcStart)}`,
        `DTEND:${formatIcsDateTime(bcEnd)}`,
        'SUMMARY:[AGfit Cocina] Sesión Batch Cooking Paralelo (85 min)',
        'DESCRIPTION:Horno + Olla Exprés + Vitro + Airfryer para dejar listos los tuppers de Guille y Alba.',
        'END:VEVENT'
      );
    }
  });

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AGfit_Semana_Turnos_y_Entrenos.ics';
  a.click();
  URL.revokeObjectURL(url);
}

export function buildGoogleCalendarQuickLink(day: DayPlan, dayIndex: number): string {
  const baseMonday = getNextMondayDate();
  const date = new Date(baseMonday);
  date.setDate(baseMonday.getDate() + dayIndex);
  const start = new Date(date);
  start.setHours(18, 0, 0);
  const end = new Date(date);
  end.setHours(19, 30, 0);

  const gTrain = TRAINING_LABELS[day.guilleTraining].short;
  const aTrain =
    day.albaTraining === 'clase_dirigida'
      ? day.albaDirectedClass
      : TRAINING_LABELS[day.albaTraining].short;

  const title = encodeURIComponent(
    `AGfit ${day.label}: Guille (${gTrain}) & Alba (${ALBA_SHIFT_LABELS[day.albaShift]} · ${aTrain})`
  );
  const details = encodeURIComponent(
    `Comida: ${RECIPE_MAP[day.meals.comida]?.title || 'Libre'}\nCena: ${RECIPE_MAP[day.meals.cena]?.title || 'Libre'}\nTurno Guille: ${GUILLE_SHIFT_LABELS[day.guilleShift]}\nTurno Alba: ${ALBA_SHIFT_LABELS[day.albaShift]}`
  );
  const dates = `${formatIcsDateTime(start)}/${formatIcsDateTime(end)}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${encodeURIComponent('Oviedo, Asturias')}`;
}

/**
 * Importador rápido de turnos del HUCA y de Guille (p.ej. pegando cartelera "M, T, N, S, L, L, M" o desde .ics)
 */
export function parseShiftPatternString(
  pattern: string
): AlbaShift[] | null {
  const tokens = pattern
    .toUpperCase()
    .split(/[\s,;|-]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return null;

  const mapped: AlbaShift[] = [];
  for (const token of tokens) {
    if (token.startsWith('M')) mapped.push('manana');
    else if (token.startsWith('T')) mapped.push('tarde');
    else if (token.startsWith('N')) mapped.push('noche');
    else if (token.startsWith('S')) mapped.push('saliente');
    else if (token.startsWith('L') || token.startsWith('D')) mapped.push('libre');
  }

  if (mapped.length === 0) return null;
  while (mapped.length < 7) {
    mapped.push('libre');
  }
  return mapped.slice(0, 7);
}

export function parseGuilleShiftPatternString(
  pattern: string
): GuilleShift[] | null {
  const tokens = pattern
    .toUpperCase()
    .split(/[\s,;|-]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return null;

  const mapped: GuilleShift[] = [];
  for (const token of tokens) {
    if (token === 'MT' || token === 'M+T' || token === 'PARTIDO' || token === 'P') {
      mapped.push('manana_tarde');
    } else if (token.startsWith('M')) {
      mapped.push('manana');
    } else if (token.startsWith('T')) {
      mapped.push('tarde');
    } else {
      mapped.push('libre');
    }
  }

  while (mapped.length < 7) {
    mapped.push('libre');
  }
  return mapped.slice(0, 7);
}

// ==========================================
// EXPORTACIÓN A GOOGLE SHEETS (CSV UTF-8 CON BOM)
// ==========================================

export function exportWeeklyMenuAndShoppingToSheetsCsv(
  days: DayPlan[],
  shoppingItems: AggregatedShoppingItem[]
): void {
  const rows: string[][] = [
    ['AGFIT OVIEDO - PLANIFICACIÓN SEMANAL GUILLE & ALBA'],
    [
      'Día',
      'Turno Guille',
      'Turno Alba (HUCA)',
      'Entreno Guille',
      'Entreno Alba',
      'Kcal/P/HC Guille',
      'Kcal/P/HC Alba',
      'Desayuno',
      'Comida (Mediodía en Casa)',
      'Merienda / Perientreno',
      'Cena',
      'Snack Noche HUCA',
    ],
  ];

  for (const d of days) {
    const nut = computeDayNutrition(d);
    rows.push([
      d.label,
      GUILLE_SHIFT_LABELS[d.guilleShift],
      ALBA_SHIFT_LABELS[d.albaShift],
      TRAINING_LABELS[d.guilleTraining].label,
      d.albaTraining === 'clase_dirigida'
        ? `Clase: ${d.albaDirectedClass}`
        : TRAINING_LABELS[d.albaTraining].label,
      `${nut.guillePlanned.kcal} kcal (${nut.guillePlanned.protein}P / ${nut.guillePlanned.carbs}HC / ${nut.guillePlanned.fat}G)`,
      `${nut.albaPlanned.kcal} kcal (${nut.albaPlanned.protein}P / ${nut.albaPlanned.carbs}HC / ${nut.albaPlanned.fat}G)`,
      d.freeMeals.desayuno ? 'LIBRE' : RECIPE_MAP[d.meals.desayuno]?.title || '',
      d.freeMeals.comida ? 'LIBRE' : RECIPE_MAP[d.meals.comida]?.title || '',
      d.freeMeals.merienda ? 'LIBRE' : RECIPE_MAP[d.meals.merienda]?.title || '',
      d.freeMeals.cena ? 'LIBRE' : RECIPE_MAP[d.meals.cena]?.title || '',
      d.albaShift === 'noche' ? RECIPE_MAP[d.meals.snack_nocturno]?.title || '' : '—',
    ]);
  }

  rows.push([]);
  rows.push(['LISTA DE LA COMPRA INTELIGENTE (PESO NETO Y SUGERENCIA COMERCIAL)']);
  rows.push(['Pasillo', 'Ingrediente', 'Guille Neto', 'Alba Neto', 'Total Neto Recetas', 'Recomendación Compra']);

  for (const item of shoppingItems) {
    rows.push([
      item.aisle.toUpperCase(),
      item.name,
      `${item.guilleNetTotal} ${item.unit}`,
      `${item.albaNetTotal} ${item.unit}`,
      `${item.totalNetRaw} ${item.unit}`,
      item.commercialRecommendation,
    ]);
  }

  const csvContent =
    '\uFEFF' +
    rows
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AGfit_Menu_y_Compra_GoogleSheets.csv';
  a.click();
  URL.revokeObjectURL(url);
}
