# Publicar la demo en GitHub Pages

GitHub Pages es gratuito. La demo queda en una dirección como
`https://USUARIO.github.io/curso-ctei-casanare/` y no necesita servidor, porque el
proyecto es estático.

Hay dos caminos. El **A** no requiere instalar nada. El **B** es mejor para seguir
actualizando la demo.

---

## A. Desde el navegador (sin instalar nada)

### 1. Crear la cuenta y el repositorio

1. Entrar a <https://github.com> y crear una cuenta. Sirve el correo personal o el
   institucional.
2. Arriba a la derecha, pulsar **+ → New repository**.
3. Llenar el formulario:
   - **Repository name:** `curso-ctei-casanare`. Este nombre forma parte de la dirección
     final.
   - **Visibility:** **Public**. Con una cuenta gratuita, Pages solo publica repositorios
     públicos.
   - Dejar **sin marcar** «Add a README file». El proyecto ya trae uno.
4. Pulsar **Create repository**.

### 2. Subir los archivos

1. Descomprimir `curso-ctei-casanare-proyecto.zip` en el computador.
2. En la página del repositorio recién creado, pulsar el enlace
   **uploading an existing file**.
3. Abrir la carpeta descomprimida y **seleccionar su contenido**: `index.html`, `paginas`,
   `css`, `js`, `assets`, `contenido`, `docs` y los demás. No hay que arrastrar la carpeta
   que los contiene, porque `index.html` tiene que quedar en la raíz del repositorio.
   Arrastrar todo junto a la zona de carga. Las subcarpetas se conservan.
4. Esperar a que termine la carga. Abajo, en «Commit changes», escribir
   `Primera versión de la demo` y pulsar **Commit changes**.

> **Archivos ocultos:** `.nojekyll` y `.gitignore` empiezan por punto y algunos sistemas no
> los muestran.
>
> - En Windows: Explorador → **Vista → Mostrar → Elementos ocultos**.
> - En Mac: **Cmd + Shift + .**
>
> Si `.nojekyll` no se subió, créalo en GitHub: **Add file → Create new file**, nombre
> `.nojekyll`, contenido vacío, **Commit**.

### 3. Activar GitHub Pages

1. En el repositorio, entrar a **Settings** (pestaña de arriba).
2. En el menú izquierdo, abrir **Pages**.
3. En **Build and deployment → Source**, elegir **Deploy from a branch**.
4. En **Branch**, elegir `main` y la carpeta `/ (root)`, y pulsar **Save**.
5. Esperar uno o dos minutos y recargar la página. Aparece el aviso
   **«Your site is live at https://USUARIO.github.io/curso-ctei-casanare/»**.

### 4. Verificar

Abrir la dirección y comprobar esto:

- [ ] Carga la pantalla de ingreso con el escudo y la mascota.
- [ ] Antes, haber seguido [`puesta-en-marcha.md`](puesta-en-marcha.md) (Supabase y cuentas).
- [ ] Entrar con una cuenta de participante, abrir un módulo y ver la infografía.
- [ ] Presentar una evaluación y ver el resultado.
- [ ] Salir y entrar con la cuenta de coordinación. Se ven las gráficas en
      **Seguimiento y resultados**.
- [ ] **Generar informe PDF → Descargar PDF → Guardar como PDF** produce el informe.
- [ ] **Exportar datos (CSV)** descarga el archivo y abre en Excel.
- [ ] Probar desde el celular.

---

## B. Con Git (para actualizar seguido)

Instalar Git (<https://git-scm.com>) y, en una terminal dentro de la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Primera versión de la demo"
git branch -M main
git remote add origin https://github.com/USUARIO/curso-ctei-casanare.git
git push -u origin main
```

La primera vez, GitHub pide iniciar sesión en el navegador. Después se activa Pages igual
que en el paso **A.3**.

Para publicar cambios posteriores:

```bash
git add .
git commit -m "Describe el cambio"
git push
```

La página se actualiza sola en uno o dos minutos.

**GitHub Desktop** (<https://desktop.github.com>) hace lo mismo con botones si se prefiere
no usar la terminal.

---

## Actualizar la demo sin Git

Entrar al repositorio y abrir la carpeta del archivo que se quiere cambiar. Luego
**Add file → Upload files**, arrastrar la versión nueva con el mismo nombre y pulsar
**Commit changes**. GitHub la reemplaza.

---

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| Error 404 en la dirección | Pages tarda hasta 10 minutos la primera vez. Revisar también que `index.html` esté en la raíz del repositorio y no dentro de otra carpeta. |
| La página carga sin estilos ni imágenes | Se subió la carpeta contenedora en vez de su contenido. Mover todo a la raíz. |
| Los módulos salen vacíos | Falta la carpeta `contenido/` o algún `.json` quedó sin subir. |
| Cambié algo y no se ve | Esperar dos minutos y recargar con **Ctrl + F5**. |
| «Falta configurar la conexión con Supabase» | Completar `SUPABASE_URL` y `SUPABASE_ANON_KEY` en `js/config.js`. |

---

## Antes de mostrarla al cliente

- **El repositorio es público.** No subir nunca `claves.sql` ni la clave `service_role`.
- **Dominio propio.** Más adelante se puede apuntar un dominio (por ejemplo
  `curso.cteicasanare.gov.co`) desde **Settings → Pages → Custom domain**. Eso requiere que
  la Gobernación configure el DNS.
