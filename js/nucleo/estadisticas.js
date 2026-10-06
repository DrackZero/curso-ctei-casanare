/* Estadísticas de la cohorte.
   Funciones puras: reciben datos y devuelven números. No tocan el DOM
   ni el almacén, así que sirven igual para el panel, el informe PDF
   y, más adelante, para calcularlas en el servidor.

   Base del análisis de la Actividad 3 del Plan de Práctica. */

const promedio = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const redondear = (x, d = 0) => x === null ? null : Math.round(x * 10 ** d) / 10 ** d;

/**
 * Prepara un índice reutilizable por todas las funciones.
 * @param {object} p
 * @param {Array} p.participantes  usuarios con rol participante
 * @param {Array} p.intentos       todos los intentos registrados
 * @param {Array} p.modulos        módulos publicados
 * @param {Array} p.secciones      secciones de cada módulo
 * @param {Function} p.progresoDe  (usuarioId) => { 'm1:proposito': true, ... }
 * @param {Object} p.preguntas     { m1: [...], m2: [...] }
 * @param {number} p.umbral        nota mínima de aprobación
 */
export function indexar({ participantes, intentos, modulos, secciones, progresoDe, preguntas, umbral }) {
  const ids = new Set(participantes.map(p => p.id));
  const propios = intentos.filter(a => ids.has(a.usuarioId));

  // mejor nota de cada participante en cada módulo
  const mejor = new Map();
  for (const a of propios) {
    const k = a.usuarioId + '|' + a.moduloId;
    if (!mejor.has(k) || a.nota > mejor.get(k)) mejor.set(k, a.nota);
  }
  const mejorNota = (u, m) => mejor.has(u + '|' + m) ? mejor.get(u + '|' + m) : null;
  const seccionesVistas = (u, m) => {
    const pr = progresoDe(u) || {};
    return secciones.filter(s => pr[m + ':' + s.k]).length;
  };

  return { participantes, intentos: propios, modulos, secciones, preguntas, umbral, mejorNota, seccionesVistas };
}

/* ---------- indicadores generales ---------- */
export function resumen(ix) {
  const { participantes, intentos, modulos, secciones, umbral, mejorNota, seccionesVistas } = ix;
  const total = modulos.length * secciones.length;
  const avances = participantes.map(p =>
    modulos.reduce((s, m) => s + seccionesVistas(p.id, m.id), 0) / total * 100);

  const mejores = [];
  participantes.forEach(p => modulos.forEach(m => {
    const n = mejorNota(p.id, m.id);
    if (n !== null) mejores.push(n);
  }));

  const finalizaron = participantes.filter(p => modulos.every(m => (mejorNota(p.id, m.id) ?? -1) >= umbral)).length;

  return {
    inscritos: participantes.length,
    activos: participantes.filter(p => modulos.some(m => seccionesVistas(p.id, m.id) > 0)).length,
    avancePromedio: redondear(promedio(avances)),
    evaluaciones: intentos.length,
    aprobacionIntentos: intentos.length ? redondear(intentos.filter(a => a.nota >= umbral).length / intentos.length * 100) : null,
    notaPromedio: redondear(promedio(mejores)),
    finalizaron,
    tasaFinalizacion: participantes.length ? redondear(finalizaron / participantes.length * 100) : null
  };
}

/* ---------- embudo de participación (etapas ordenadas) ---------- */
export function embudo(ix) {
  const { participantes, modulos, umbral, mejorNota, seccionesVistas, intentos } = ix;
  const conIntento = new Set(intentos.map(a => a.usuarioId));
  const etapas = [
    ['Inscritos', participantes.length],
    ['Iniciaron el curso', participantes.filter(p => modulos.some(m => seccionesVistas(p.id, m.id) > 0)).length],
    ['Presentaron al menos una evaluación', participantes.filter(p => conIntento.has(p.id)).length],
    ['Aprobaron al menos un módulo', participantes.filter(p => modulos.some(m => (mejorNota(p.id, m.id) ?? -1) >= umbral)).length],
    [`Aprobaron los ${modulos.length} módulos`, participantes.filter(p => modulos.every(m => (mejorNota(p.id, m.id) ?? -1) >= umbral)).length]
  ];
  const base = etapas[0][1] || 1;
  return etapas.map(([etapa, valor]) => ({ etapa, valor, pct: redondear(valor / base * 100) }));
}

/* ---------- resultados por módulo ---------- */
export function porModulo(ix) {
  const { participantes, intentos, modulos, umbral, mejorNota, seccionesVistas, secciones } = ix;
  return modulos.map(m => {
    const iniciaron = participantes.filter(p => seccionesVistas(p.id, m.id) > 0).length;
    const completaron = participantes.filter(p => seccionesVistas(p.id, m.id) === secciones.length).length;
    const delModulo = intentos.filter(a => a.moduloId === m.id);
    const presentaron = new Set(delModulo.map(a => a.usuarioId)).size;
    const mejores = participantes.map(p => mejorNota(p.id, m.id)).filter(n => n !== null);
    const aprobaron = mejores.filter(n => n >= umbral).length;

    // intentos que necesitó cada participante hasta aprobar
    const hasta = [];
    participantes.forEach(p => {
      const suyos = delModulo.filter(a => a.usuarioId === p.id).sort((a, b) => a.fecha.localeCompare(b.fecha));
      const i = suyos.findIndex(a => a.nota >= umbral);
      if (i >= 0) hasta.push(i + 1);
    });

    return {
      id: m.id, numero: m.numero, titulo: m.titulo, color: m.color,
      iniciaron, completaron, presentaron, aprobaron,
      intentos: delModulo.length,
      pctAprobacion: participantes.length ? redondear(aprobaron / participantes.length * 100) : 0,
      pctAprobacionPresentaron: presentaron ? redondear(aprobaron / presentaron * 100) : null,
      notaPromedio: redondear(promedio(mejores)),
      primerIntento: redondear(promedio(participantes.map(p => {
        const a = delModulo.filter(x => x.usuarioId === p.id).sort((x, y) => x.fecha.localeCompare(y.fecha))[0];
        return a ? a.nota : null;
      }).filter(n => n !== null))),
      intentosHastaAprobar: redondear(promedio(hasta), 1)
    };
  });
}

/* ---------- distribución de notas de todos los intentos ---------- */
export function distribucion(ix) {
  const { intentos, umbral } = ix;
  const valores = [...new Set(intentos.map(a => a.nota))].sort((a, b) => a - b);
  // con 4 preguntas las notas posibles son 0, 25, 50, 75 y 100: se muestran tal cual.
  // si hubiera más de 8 valores distintos se agrupan en tramos de 10.
  if (valores.length <= 8) {
    const posibles = [...new Set([0, 25, 50, 75, 100, ...valores])].sort((a, b) => a - b);
    return posibles.map(v => ({
      clase: String(v), desde: v, hasta: v,
      cuenta: intentos.filter(a => a.nota === v).length,
      aprueba: v >= umbral
    }));
  }
  const tramos = [];
  for (let d = 0; d < 100; d += 10) {
    const h = d === 90 ? 100 : d + 9;
    tramos.push({ clase: `${d}–${h}`, desde: d, hasta: h,
      cuenta: intentos.filter(a => a.nota >= d && a.nota <= h).length, aprueba: d >= umbral });
  }
  return tramos;
}

/* ---------- análisis por pregunta (dificultad y distractores) ---------- */
export const UMBRAL_REVISAR = 50;   // % de acierto por debajo del cual se sugiere revisar la pregunta

export function porPregunta(ix) {
  const { intentos, modulos, preguntas } = ix;
  const filas = [];
  modulos.forEach(m => {
    const lista = preguntas[m.id] || [];
    const conRespuestas = intentos.filter(a => a.moduloId === m.id && Array.isArray(a.respuestas));
    lista.forEach((q, i) => {
      const elegidas = conRespuestas.map(a => a.respuestas[i]).filter(r => r !== undefined && r !== null);
      const correctas = elegidas.filter(r => r === q.correcta).length;
      const cuenta = q.opciones.map((_, j) => elegidas.filter(r => r === j).length);
      const incorrectas = cuenta.map((c, j) => ({ j, c })).filter(x => x.j !== q.correcta && x.c > 0).sort((a, b) => b.c - a.c);
      const pct = elegidas.length ? correctas / elegidas.length * 100 : null;
      filas.push({
        id: q.id, moduloId: m.id, moduloNumero: m.numero, numero: i + 1,
        enunciado: q.enunciado,
        respuestas: elegidas.length,
        pctAcierto: redondear(pct),
        revisar: pct !== null && pct < UMBRAL_REVISAR,
        distractor: incorrectas.length ? { opcion: q.opciones[incorrectas[0].j], letra: String.fromCharCode(65 + incorrectas[0].j),
                                            pct: redondear(incorrectas[0].c / elegidas.length * 100) } : null,
        estadoValidacion: q.estado || 'por-validar'
      });
    });
  });
  return filas;
}

/* ---------- detalle por participante ---------- */
export function porParticipante(ix) {
  const { participantes, modulos, secciones, umbral, mejorNota, seccionesVistas, intentos } = ix;
  const total = modulos.length * secciones.length;
  return participantes.map(p => {
    const notas = modulos.map(m => mejorNota(p.id, m.id));
    const presentadas = notas.filter(n => n !== null);
    const aprobados = notas.filter(n => n !== null && n >= umbral).length;
    const avance = Math.round(modulos.reduce((s, m) => s + seccionesVistas(p.id, m.id), 0) / total * 100);
    return {
      id: p.id, nombre: p.nombre, correo: p.correo, entidad: p.entidad || '',
      avance, aprobados, notas,
      promedio: redondear(promedio(presentadas)),
      intentos: intentos.filter(a => a.usuarioId === p.id).length,
      estado: aprobados === modulos.length ? 'Finalizó' : avance > 0 ? 'En curso' : 'Sin iniciar'
    };
  });
}

/* ---------- exportación plana para análisis externo (Excel, R, Python) ---------- */
export function filasCSV(ix, usuariosPorId) {
  const { intentos, preguntas, umbral } = ix;
  const maxP = Math.max(...Object.values(preguntas).map(l => l.length), 0);
  const cab = ['fecha', 'participante', 'correo', 'entidad', 'modulo', 'nota', 'aprobado', 'correctas', 'total',
               ...Array.from({ length: maxP }, (_, i) => `p${i + 1}_correcta`)];
  const filas = intentos.slice().sort((a, b) => a.fecha.localeCompare(b.fecha)).map(a => {
    const u = usuariosPorId[a.usuarioId] || {};
    const lista = preguntas[a.moduloId] || [];
    const marcas = Array.from({ length: maxP }, (_, i) =>
      !lista[i] || !Array.isArray(a.respuestas) ? '' : (a.respuestas[i] === lista[i].correcta ? 1 : 0));
    return [a.fecha.slice(0, 10), u.nombre || a.usuarioId, u.correo || '', u.entidad || '', a.moduloId,
            a.nota, a.nota >= umbral ? 'si' : 'no', a.correctas, a.total, ...marcas];
  });
  return [cab, ...filas];
}

/* ---------- hallazgos redactados automáticamente ----------
   Frases cortas con los datos que más importan para la coordinación.
   Se recalculan con cada corte: no hay texto escrito a mano. */
export function hallazgos({ resumen: s, embudo: e, porModulo: pm, porPregunta: pp, umbral, modulos }) {
  const f = n => String(n).replace('.', ',');
  const out = [];
  if (!s.inscritos) return ['Todavía no hay participantes inscritos.'];

  out.push(`${s.activos} de ${s.inscritos} inscritos (${f(Math.round(s.activos / s.inscritos * 100))}%) iniciaron el curso y ` +
    `${s.finalizaron} (${f(s.tasaFinalizacion)}%) aprobaron los ${modulos.length} módulos.`);

  let peor = null;
  for (let i = 1; i < e.length; i++) {
    const caida = e[i - 1].valor - e[i].valor;
    if (!peor || caida > peor.caida) peor = { caida, de: e[i - 1].etapa, a: e[i].etapa };
  }
  if (peor && peor.caida > 0)
    out.push(`La mayor pérdida de participantes ocurre entre «${peor.de.toLowerCase()}» y «${peor.a.toLowerCase()}»: ${peor.caida} personas.`);

  let salto = null;
  for (let i = 1; i < pm.length; i++) {
    const d = pm[i - 1].pctAprobacion - pm[i].pctAprobacion;
    if (!salto || d > salto.d) salto = { d, a: pm[i - 1], b: pm[i] };
  }
  if (salto && salto.d > 0)
    out.push(`Entre el módulo ${salto.a.numero} y el ${salto.b.numero} la aprobación cae de ${f(salto.a.pctAprobacion)}% a ${f(salto.b.pctAprobacion)}% de los inscritos.`);

  const conNota = pm.filter(m => m.notaPromedio !== null);
  if (conNota.length) {
    const bajo = conNota.reduce((a, b) => (b.notaPromedio < a.notaPromedio ? b : a));
    out.push(`El módulo ${bajo.numero} tiene la nota promedio más baja (${f(bajo.notaPromedio)})` +
      (bajo.intentosHastaAprobar ? ` y exige en promedio ${f(bajo.intentosHastaAprobar)} ${Number(bajo.intentosHastaAprobar) === 1 ? 'intento' : 'intentos'} para aprobar.` : '.'));
  }

  const rev = pp.filter(p => p.revisar).sort((a, b) => a.pctAcierto - b.pctAcierto);
  if (rev.length)
    out.push(`${rev.length} ${rev.length === 1 ? 'pregunta tiene' : 'preguntas tienen'} acierto inferior al ${UMBRAL_REVISAR}%: ` +
      rev.map(p => `M${p.moduloNumero}·P${p.numero} (${f(p.pctAcierto)}%)`).join(', ') + '. Conviene revisar su redacción o reforzar el tema.');

  if (s.aprobacionIntentos !== null)
    out.push(`El ${f(s.aprobacionIntentos)}% de las ${s.evaluaciones} evaluaciones presentadas alcanzó la nota mínima de ${umbral}.`);
  return out;
}
