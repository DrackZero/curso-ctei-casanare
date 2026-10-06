# Guía de contenidos

Cómo cambiar el material del curso sin tocar el código.
Todo lo editable vive en la carpeta `contenido/`.

---

## 1. Cambiar un texto de un módulo

Abrir `contenido/modulos.json`, buscar el módulo por su número y editar el campo.

```json
{
  "id": "m2",
  "numero": 2,
  "titulo": "Problemas públicos, retos territoriales y diagnóstico basado en evidencia",
  "duracion": "8 horas",
  "producto": "Árbol de problemas, árbol de objetivos y reto territorial",
  "proposito": "Transformar una necesidad u oportunidad general en un problema…",
  "resultados": ["Diferencia necesidad, problema y solución.", "…"],
  "contenidos": ["De la oportunidad al problema central", "…"]
}
```

**Reglas al editar un JSON**

- Las comillas son siempre dobles `"`, nunca comillas tipográficas.
- Cada elemento de una lista va separado por coma; el último **no** lleva coma.
- Si algo queda mal escrito, la página no carga. Pegar el archivo en <https://jsonlint.com>
  muestra en qué línea está el error.

---

## 2. Cambiar la infografía de un módulo

Dos pasos:

1. Dejar el archivo de imagen en `assets/img/infografias/`, con nombre en minúsculas,
   sin tildes ni espacios: `m3-metodologia-mga.jpg`.
2. Registrarlo en `contenido/materiales.json`:

```json
{
  "id": "inf-mga",
  "tipo": "infografia",
  "archivo": "assets/img/infografias/m3-metodologia-mga.jpg",
  "titulo": "Del problema al proyecto: la ruta de la Metodología General Ajustada",
  "numeroImpreso": 4,
  "moduloAsignado": "m3",
  "estado": "numero-no-coincide",
  "observacion": "La pieza dice MÓDULO 4; la MGA es el módulo 3."
}
```

Y referenciarlo desde el módulo, en `contenido/modulos.json`:

```json
"infografias": [{ "material": "inf-mga", "titulo": "Del problema al proyecto: la ruta MGA" }]
```

Un módulo puede tener varias piezas: se navegan con flechas y miniaturas.

### Estados posibles de un material

| Estado | Significado |
|---|---|
| `coincide` | El número impreso y el módulo asignado coinciden |
| `numero-no-coincide` | El tema corresponde al módulo, pero la pieza trae otro número impreso |
| `compartida` | Una sola pieza cubre contenidos de dos módulos |
| `faltante` | El módulo no tiene pieza propia |

Cuando el estado es distinto de `coincide`, la plataforma muestra la observación como
**nota de revisión** debajo de la infografía, para que nadie se confunda mientras se corrige.

---

## 3. Editar una pregunta de evaluación

Un archivo por módulo: `contenido/preguntas/m2.json`.

```json
{
  "id": "m2-p1",
  "enunciado": "Un problema central bien formulado se redacta como:",
  "opciones": [
    "La ausencia de una solución específica",
    "Una situación negativa existente",
    "La falta de presupuesto",
    "Un objetivo por alcanzar"
  ],
  "correcta": 1,
  "retroalimentacion": "Redactarlo como «falta de» algo esconde la solución dentro del problema.",
  "estado": "por-validar",
  "validadoPor": ""
}
```

- `correcta` es la **posición** de la respuesta correcta, contando desde 0.
  En el ejemplo, `1` significa la segunda opción.
- `retroalimentacion` se muestra al participante después de calificar.
- Al validar la pregunta, cambiar `estado` a `"validada"` y escribir quién la revisó.

---

## 4. Recibir y aplicar la retroalimentación

1. La coordinación entra con el perfil de administración y abre **Revisión de materiales**.
2. Registra la decisión y la observación de cada pieza.
3. Pulsa **Exportar observaciones**: se descarga `revision-materiales-AAAA-MM-DD.json`.
4. El equipo de desarrollo aplica esas decisiones sobre `contenido/materiales.json`
   (y reemplaza las imágenes que haga falta) y sube el cambio al repositorio.

Las observaciones se guardan en el navegador de quien revisa: si revisan varias personas,
cada una debe exportar su archivo.
