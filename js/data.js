/* ============================================================
   DATOS DE PRUEBA (sin base de datos). Todo vive en memoria.
   ============================================================ */
const USER = {
  name: "Alex Sánchez",
  code: "202510842",
  email: "alex.sanchez@gamecampus.edu",
  password: "campus2025",
  semester: 4,
  program: "Diseño y Desarrollo de Videojuegos",
  faculty: "Facultad de Artes Digitales e Ingeniería",
  entry: "2025-1",
  status: "Activo",
};

const PERIOD = "2026-2"; // ciclo 2 del año 2026
const PAST_PERIOD = "2026-1";
const MAX_CREDITS = 20; // máximo por semestre y estudiante
const MAX_SLOTS = 9; // casillas de la mesa de crafteo (cuadrícula 3x3)
const PASS = 3.0; // nota mínima para aprobar
const WEIGHTS = [33, 33, 34]; // peso de cada corte (%): suman 100
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const FIRST_HOUR = 6; // el tablero del horario empieza a las 06:00
const LAST_HOUR = 18; // y termina a las 18:00 (las clases fuera de ese rango extienden el tablero)

// Tipo de bloque según créditos (cada curso vale de 1 a 4 créditos)
const BLOCKS = {
  1: { key: "wood", name: "Madera" },
  2: { key: "stone", name: "Piedra" },
  3: { key: "iron", name: "Hierro" },
  4: { key: "diamond", name: "Diamante" },
};

// Materias disponibles para matrícula (periodo actual).
// piece = color de la pieza de Tetris en el horario.
// cuts = notas parciales de ejemplo para la partida en curso.
const COURSES = [
  // Cada materia dura mínimo 1 h 30 min (start/end en horas; 9.5 = 9:30).
  { code: "GDD-201", name: "Diseño de niveles", credits: 3, day: 1, start: 8, end: 10, room: "Aula 204", teacher: "Laura Méndez", group: "A01", seats: 8, piece: "T", cuts: [4.5, 4.2, null] },
  { code: "DEV-214", name: "Motores gráficos II", credits: 4, day: 2, start: 10, end: 12, room: "Lab 03", teacher: "Carlos Rojas", group: "B02", seats: 3, piece: "S", cuts: [3.8, null, null] },
  { code: "ART-126", name: "Narrativa interactiva", credits: 3, day: 4, start: 14, end: 16, room: "Aula 108", teacher: "Sofía Martínez", group: "A03", seats: 0, piece: "L", cuts: [4.7, null, null] },
  { code: "SND-108", name: "Audio para videojuegos", credits: 2, day: 5, start: 8, end: 10, room: "Estudio B", teacher: "Daniel Pardo", group: "C01", seats: 12, piece: "I", prerequisite: "Producción sonora I", cuts: [4.0, null, null] },
  { code: "UXG-230", name: "Experiencia de jugador", credits: 3, day: 1, start: 8, end: 10, room: "Aula 306", teacher: "Natalia Torres", group: "A02", seats: 6, piece: "Z", cuts: [null, null, null] },
  { code: "PRG-220", name: "Programación de gameplay", credits: 3, day: 3, start: 10, end: 12, room: "Lab 05", teacher: "Andrés Vega", group: "B01", seats: 5, piece: "O", cuts: [4.2, null, null] },
  { code: "MAT-210", name: "Matemáticas para juegos II", credits: 4, day: 3, start: 14, end: 16, room: "Aula 210", teacher: "Mónica Salazar", group: "A01", seats: 10, piece: "J", cuts: [3.6, null, null] },
  { code: "ANM-205", name: "Animación 3D", credits: 4, day: 2, start: 14, end: 16, room: "Lab 07", teacher: "Ricardo Ortiz", group: "B03", seats: 7, piece: "I", cuts: [4.1, 3.9, null] },
  { code: "NET-240", name: "Redes y juegos multijugador", credits: 3, day: 4, start: 8, end: 10, room: "Lab 02", teacher: "Camila Herrera", group: "A01", seats: 9, piece: "L", prerequisite: "Fundamentos de programación", cuts: [null, null, null] },
  { code: "PRJ-250", name: "Proyecto integrador I", credits: 4, day: 5, start: 14, end: 17, room: "Estudio A", teacher: "Jorge Castaño", group: "A01", seats: 4, piece: "T", cuts: [4.4, null, null] },
  { code: "ENG-301", name: "Inglés técnico", credits: 2, day: 1, start: 14, end: 15.5, room: "Aula 112", teacher: "Patricia Lozano", group: "C02", seats: 20, piece: "O", cuts: [3.9, 4.1, null] },
  { code: "PTF-110", name: "Taller de portafolio", credits: 1, day: 3, start: 8, end: 9.5, room: "Aula 101", teacher: "Lucía Barrera", group: "A01", seats: 15, piece: "Z", cuts: [null, null, null] },
  { code: "ETH-120", name: "Ética y propiedad intelectual", credits: 2, day: 4, start: 10.5, end: 12, room: "Aula 305", teacher: "Elena Quintero", group: "A02", seats: 25, piece: "S", cuts: [4.0, null, null] },
  { code: "GPM-180", name: "Gestión de proyectos de juegos", credits: 3, day: 2, start: 8, end: 9.5, room: "Aula 215", teacher: "Hernán Duque", group: "B01", seats: 11, piece: "J", cuts: [null, null, null] },
  { code: "VFX-260", name: "Efectos visuales (VFX)", credits: 3, day: 3, start: 14.5, end: 16, room: "Lab 04", teacher: "Santiago Prieto", group: "A01", seats: 5, piece: "Z", cuts: [4.3, null, null] },
  { code: "QAT-225", name: "Pruebas y control de calidad", credits: 2, day: 1, start: 10, end: 11.5, room: "Lab 06", teacher: "Valeria Mejía", group: "A01", seats: 14, piece: "I", cuts: [3.7, null, null] },
  { code: "SEM-101", name: "Seminario de la industria", credits: 1, day: 5, start: 16, end: 17.5, room: "Aula Magna", teacher: "Invitados", group: "A01", seats: 40, piece: "O", cuts: [null, null, null] },
  { code: "AIG-270", name: "IA para videojuegos", credits: 4, day: 4, start: 16, end: 18, room: "Lab 01", teacher: "Tomás Beltrán", group: "A01", seats: 2, piece: "L", cuts: [null, null, null] },
  { code: "BIE-101", name: "Bienestar y pausas activas", credits: 1, day: 1, start: 6, end: 7.5, room: "Cancha 1", teacher: "Marta Gil", group: "A01", seats: 30, piece: "I", cuts: [4.5, null, null] },
  { code: "MUS-140", name: "Música y ritmo para juegos", credits: 2, day: 2, start: 6, end: 8, room: "Estudio B", teacher: "Esteban Roa", group: "A01", seats: 12, piece: "S", cuts: [null, null, null] },
  { code: "ESP-310", name: "Producción de eventos esports", credits: 2, day: 1, start: 16, end: 18, room: "Aula 401", teacher: "Diego Arango", group: "A01", seats: 18, piece: "T", cuts: [null, null, null] },
  { code: "STR-320", name: "Streaming y comunidad", credits: 2, day: 2, start: 16, end: 18, room: "Estudio A", teacher: "Paula Reyes", group: "A01", seats: 16, piece: "J", cuts: [3.8, null, null] },
  { code: "GRD-330", name: "Seminario de proyecto de grado", credits: 3, day: 3, start: 15, end: 18, room: "Aula 402", teacher: "Gustavo Mora", group: "A01", seats: 9, piece: "L", cuts: [null, null, null] },
  { code: "CIN-340", name: "Cine y videojuegos", credits: 2, day: 3, start: 16, end: 18, room: "Aula 210", teacher: "Andrea Pineda", group: "A02", seats: 22, piece: "O", cuts: [4.1, null, null] },
  { code: "MON-350", name: "Monetización y negocio", credits: 2, day: 3, start: 12, end: 13.5, room: "Aula 305", teacher: "Felipe Cruz", group: "A01", seats: 14, piece: "Z", cuts: [null, null, null] },
  { code: "IND-360", name: "Laboratorio de juegos indie", credits: 3, day: 5, start: 10, end: 13, room: "Lab 05", teacher: "Sara Lozano", group: "A01", seats: 6, piece: "S", cuts: [4.2, null, null] },
  // --- sábado ---
  { code: "SAB-101", name: "Laboratorio de prototipado", credits: 3, day: 6, start: 8, end: 11, room: "Lab 01", teacher: "Iván Cortés", group: "S01", seats: 12, piece: "J", cuts: [null, null, null] },
  { code: "SAB-102", name: "Inglés conversacional", credits: 2, day: 6, start: 9, end: 10.5, room: "Aula 112", teacher: "Patricia Lozano", group: "S02", seats: 18, piece: "L", cuts: [null, null, null] },
  { code: "SAB-103", name: "Taller de arte pixel", credits: 2, day: 6, start: 11.5, end: 13, room: "Estudio A", teacher: "Clara Mejía", group: "S01", seats: 15, piece: "Z", cuts: [4.0, null, null] },
  { code: "SAB-104", name: "Tutoría de portafolio", credits: 1, day: 6, start: 6.5, end: 8, room: "Aula 101", teacher: "Lucía Barrera", group: "S01", seats: 20, piece: "O", cuts: [null, null, null] },
  { code: "SAB-105", name: "Game jam de fin de semana", credits: 4, day: 6, start: 14, end: 18, room: "Lab 02", teacher: "Equipo docente", group: "S01", seats: 8, piece: "I", cuts: [4.6, null, null] },
];

// Matrícula confirmada al iniciar la demo
const DEMO_ENROLLMENT = ["GDD-201", "DEV-214", "PRG-220"];

// Semestre anterior (cerrado): de aquí salen Victory Royale, Wasted y el promedio
const PAST = [
  { code: "FPG-101", name: "Fundamentos de programación", credits: 3, cuts: [4.6, 4.7, 4.4] },
  { code: "ART-101", name: "Dibujo y concept art", credits: 2, cuts: [4.0, 3.8, 4.5] },
  { code: "MAT-110", name: "Matemáticas para juegos", credits: 4, cuts: [3.4, 3.9, 3.7] },
  { code: "FIS-120", name: "Física para videojuegos", credits: 4, cuts: [2.1, 2.4, 2.6] },
  { code: "HIS-100", name: "Historia de los videojuegos", credits: 2, cuts: [4.7, 4.8, 4.9] },
];

/* Rangos según el promedio (para la pantalla de Promedio) */
const RANKS = [
  { min: 0, name: "Novato" },
  { min: 3.0, name: "Aventurero" },
  { min: 4.0, name: "Héroe" },
  { min: 4.5, name: "Leyenda" },
];

/* Utilidades académicas */
function finalGrade(cuts) {
  if (cuts.some((c) => c === null)) return null;
  return cuts.reduce((t, c, i) => t + c * (WEIGHTS[i] / 100), 0);
}

function partialGrade(cuts) {
  let w = 0;
  let t = 0;
  cuts.forEach((c, i) => {
    if (c !== null) {
      t += c * WEIGHTS[i];
      w += WEIGHTS[i];
    }
  });
  return w ? { value: t / w, weight: w } : null;
}

function weightedAverage(list) {
  const done = list.map((c) => ({ ...c, final: finalGrade(c.cuts) })).filter((c) => c.final !== null);
  const cr = done.reduce((s, c) => s + c.credits, 0);
  if (!cr) return 0;
  return done.reduce((s, c) => s + c.final * c.credits, 0) / cr;
}

/* ============================================================
   ACTIVIDADES DE CADA CORTE
   Cada corte se compone de actividades con su peso (suman 100).
   La nota del corte sale de sus actividades (redondeada a 1 decimal) y de ahí
   sale la nota final con los pesos de los cortes (WEIGHTS).
   ============================================================ */
// Todos los cortes de todas las materias se componen igual (no se distingue teoría de práctica)
const CUT_PARTS = [
  { n: "Quices y trabajos independientes", w: 30 },
  { n: "Autoevaluación", w: 10 },
  { n: "Parcial", w: 60 },
];
const planFor = () => [CUT_PARTS, CUT_PARTS, CUT_PARTS];
const r1 = (v) => Math.round(v * 10) / 10;
const clamp5 = (v) => Math.max(0, Math.min(5, v));
const hashStr = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const rnd = (seed) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };

// Reparte la nota G de un corte entre sus actividades: las notas van alrededor de G y la de mayor peso se ajusta
function genComps(comps, G, seed) {
  let solve = 0;
  comps.forEach((k, j) => { if (k.w > comps[solve].w) solve = j; });
  const g = comps.map((k, j) => r1(clamp5(G + (rnd(seed + j * 7.7) - 0.5) * 1.0)));
  const others = comps.reduce((s, k, j) => (j === solve ? s : s + k.w * g[j]), 0);
  g[solve] = r1(clamp5((G * 100 - others) / comps[solve].w));
  return comps.map((k, j) => ({ n: k.n, w: k.w, g: g[j] }));
}

// Crea course.parts (actividades por corte) y recalcula course.cuts a partir de ellas
function buildParts(course) {
  const plan = planFor(course.code);
  const seed = hashStr(course.code);
  let opened = false; // el primer corte sin cerrar puede tener actividades ya calificadas
  const cuts = [];
  course.parts = course.cuts.map((G, i) => {
    const comps = plan[i];
    if (G !== null) {
      const parts = genComps(comps, G, seed + i * 31);
      cuts.push(r1(parts.reduce((s, k) => s + (k.g * k.w) / 100, 0)));
      return parts;
    }
    cuts.push(null);
    const prev = i > 0 ? cuts[i - 1] : null;
    if (!opened && prev !== null) {
      opened = true;
      const n = 1 + (seed % 2); // 1 o 2 actividades ya calificadas
      return comps.map((k, j) => ({ n: k.n, w: k.w, g: j < n ? r1(clamp5(prev + (rnd(seed + i * 13 + j) - 0.5) * 0.8)) : null }));
    }
    return comps.map((k) => ({ n: k.n, w: k.w, g: null }));
  });
  course.cuts = cuts;
}
COURSES.forEach(buildParts);
PAST.forEach(buildParts);

/* ============================================================
   GRUPOS DE CADA MATERIA
   Una materia aparece una sola vez y tiene varios grupos; cada grupo tiene su propio
   día, horario, aula, docente y cupos. Al matricular se elige el grupo.
   El grupo que ya traía cada materia queda como primero y se generan los demás.
   ============================================================ */
const TEACHERS = [
  "Laura Méndez", "Carlos Rojas", "Sofía Martínez", "Daniel Pardo", "Natalia Torres", "Andrés Vega", "Mónica Salazar", "Ricardo Ortiz",
  "Camila Herrera", "Jorge Castaño", "Patricia Lozano", "Lucía Barrera", "Elena Quintero", "Hernán Duque", "Santiago Prieto", "Valeria Mejía",
  "Tomás Beltrán", "Marta Gil", "Esteban Roa", "Diego Arango", "Paula Reyes", "Gustavo Mora", "Andrea Pineda", "Felipe Cruz",
  "Sara Lozano", "Iván Cortés", "Clara Mejía", "Julián Ospina", "Marcela Rueda", "Óscar Villamil",
];
// materias que tienen un solo grupo (una está agotada para mostrar el aviso de "sin cupos")
const SINGLE_GROUP = new Set(["ART-126", "SEM-101", "GRD-330", "SAB-105", "CIN-340"]);

function altRoom(room, g) {
  if (/\d+/.test(room)) return room.replace(/\d+/, (n) => String(Number(n) + g * 3).padStart(n.length, "0"));
  return /\bA\b/.test(room) ? room.replace(/\bA\b/, "B") : room.replace(/\bB\b/, "A");
}

function expandGroups(c) {
  const base = { id: c.group, day: c.day, start: c.start, end: c.end, room: c.room, teacher: c.teacher, seats: c.seats };
  const groups = [base];
  if (!SINGLE_GROUP.has(c.code)) {
    const h = hashStr(c.code);
    const n = 2 + (h % 3); // 2 a 4 grupos
    const dur = c.end - c.start;
    const offsets = [2, -2, 4, -3, 1.5];
    const dayShift = [2, 1, 3, 4, 2];
    const letter = c.group[0];
    const num = Number(c.group.slice(1));
    for (let g = 1; g < n; g++) {
      let day = ((c.day - 1 + dayShift[(h + g) % 5]) % 6) + 1;
      let start = c.start + offsets[(h + g) % 5];
      if (start < FIRST_HOUR || start + dur > LAST_HOUR) start = c.start - offsets[(h + g) % 5];
      start = Math.max(FIRST_HOUR, Math.min(LAST_HOUR - dur, start));
      // el primer grupo alterno nunca choca con la matrícula de ejemplo, así siempre hay un grupo elegible
      if (!DEMO_ENROLLMENT.includes(c.code)) {
        const demo = DEMO_ENROLLMENT.map((code) => { const x = COURSES.find((y) => y.code === code); return x.groups ? x.groups[0] : x; });
        for (let k = 0; k < 6 && demo.some((x) => x.day === day && start < x.end && x.start < start + dur); k++) day = (day % 6) + 1;
      }
      let teacher = TEACHERS[(h + g * 5 + 3) % TEACHERS.length];
      if (teacher === c.teacher) teacher = TEACHERS[(h + g * 5 + 4) % TEACHERS.length];
      groups.push({
        id: letter + String(num + g).padStart(2, "0"),
        day, start, end: start + dur,
        room: altRoom(c.room, g),
        teacher,
        seats: g === 1 ? [14, 6, 22, 9, 3, 18][(h + g) % 6] : [14, 6, 0, 22, 9, 3][(h + g) % 6],
      });
    }
  }
  c.groups = groups;
  ["day", "start", "end", "room", "teacher", "group", "seats"].forEach((k) => delete c[k]);
}
COURSES.forEach(expandGroups);