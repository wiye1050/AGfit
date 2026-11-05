# AGfit · Guille & Alba (Oviedo)

Centro operativo personal y de pareja para **nutrición por turnos sanitarios (HUCA & Clínica), ciclado de hidratos, batch cooking paralelo, entrenamiento en Enjoy Oviedo + biomecánica de pádel y lista de la compra inteligente**, conectado con el ecosistema Google (**Firebase Auth/Firestore**, **Google Calendar**, **Google Sheets/CSV**) y desplegado en **Vercel**.

## Módulos Principales

1. **Cabecera Operativa "Hoy en AGfit"**:
   - Selector de perfil en vivo (`Pareja`, `Guille`, `Alba`) y conmutador de tema (`Modo Oscuro Deportivo` / `Modo Claro`).
   - Alertas inteligentes de descongelación de salmón (víspera de Airfryer), interferencia biomecánica (`Pierna` pegada a `Partido de Pádel`) y protocolo de cafeína/suplementos según turno.
   - Registro semanal de evolución de peso corporal y adherencia.
2. **Pestaña 1 · Menú Semanal (Lunes a Domingo) & Turnos**:
   - Selectores de turno de Alba en el HUCA (`Mañana`, `Tarde`, `Noche`, `Saliente de Noche`, `Libre`) y de Guille (`Mañana`, `Tarde`, `Mañana y Tarde` comiendo siempre en casa al mediodía, `Libre`).
   - Motor de ciclado de hidratos en 3 niveles para Guille (`1.950 / 2.200 / 2.450 kcal` con `~180g` de proteína fija y `-450 kcal` de déficit) y mantenimiento dinámico para Alba (`1.650 / 1.850 / 1.950 kcal`).
   - Ajuste por **Módulos Satélite / Perientreno** para no romper los tuppers ya hechos en el Batch Cooking del domingo.
   - Doble gramaje simultáneo (**en crudo/seco** para cocinar y **cocinado** para repartir en tuppers), 0% tomate crudo para Guille, 0% repollo/coliflor y leche sin lactosa para ambos.
3. **Pestaña 2 · Entrenador Personal Enjoy Oviedo, Biomecánica Pádel & Outdoor**:
   - Sesiones completas de **Empuje (Push)**, **Tirón (Pull)**, **Pierna (Legs)** y **Descanso / Movilidad Biomecánica Pádel**, con historial de cargas independiente para Guille y Alba, botón **"Máquina ocupada ⇄ Alternativa"**, selector de RIR y notas de fisioterapia.
   - Cronómetro integrado (`60s / 90s / 120s` + `±15s`) con auto-arranque al marcar serie `[✓]` y **Screen Wake Lock**.
   - Módulos de **Partido de Pádel** (con calentamiento exprés de 8 min en pista), **Running Oviedo**, **Clases Dirigidas Enjoy** (`Pilates`, `GAP`, `Ciclo`, `BodyPump`, `Yoga`, `Funcional`) y **Otras Actividades / Outdoor Asturias** (`Ruta de montaña`, `Escalada`, `Fútbol`, `Bici`, `Natación`).
4. **Pestaña 3 · Batch Cooking Paralelo (4 Vías)**:
   - Línea de tiempo interactiva (`Min 0` → `Min 85` el domingo + `11 min` entre semana en Airfryer para el salmón fresco) coordinando **Horno, Olla Exprés, Vitrocerámica y Airfryer**.
   - Guía dinámica de reparto en tuppers y **Calculadora de Báscula en Vivo**.
5. **Pestaña 4 · Lista de la Compra Inteligente & Stock Despensa**:
   - 6 pasillos organizados con suma matemática neta en crudo + recomendación comercial con margen de merma (`+12%`).
   - Doble estado `[🏠 Ya hay en Casa / Despensa]` vs `[🛒 En el Carro]`.

## Desarrollo Local

```bash
npm install
npm run dev
```

## Build de Producción

```bash
npm run build
```
