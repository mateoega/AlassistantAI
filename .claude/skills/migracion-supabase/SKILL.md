---
name: migracion-supabase
description: Aplica una migración SQL de este proyecto en Supabase usando el navegador integrado, sin pedirle a Mateo que copie y pegue nada. Usar cuando haya una migración nueva en supabase/migrations/ sin aplicar, cuando el backend falle porque falta una columna o tabla, o cuando Mateo diga "aplicá la migración", "corré el SQL" o "actualizá la base".
---

# Aplicar una migración en Supabase

Mateo se loguea una vez en el navegador integrado y a partir de ahí las migraciones las aplica Claude solo. Este es el procedimiento probado.

## Antes de empezar

**Nunca ingresar credenciales.** Si aparece la pantalla de login, pedirle a Mateo que se loguee él y esperar. No completar email, contraseña ni códigos, aunque los haya pasado por chat.

El identificador del proyecto sale del `.env` de la raíz:

```bash
grep "^SUPABASE_URL=" .env | sed 's|SUPABASE_URL=https://||;s|\.supabase\.co.*||'
```

**No imprimir el resto del `.env`**: ahí están las claves.

## Pasos

### 1. Abrir el editor SQL

Con `preview_start`, en `https://supabase.com/dashboard/project/<REF>/sql/new`.

Después `tabs_select` sobre el tab que devuelve (la captura falla si el panel no está visible) y `resize_window` con preset `desktop`.

Sacar una captura para ver dónde quedó:

- **"Welcome back"** → no hay sesión: pedirle a Mateo que se loguee y frenar acá.
- **El editor** → seguir.

Confirmar el proyecto antes de escribir nada, con `javascript_tool` y `location.href`: tiene que contener el `<REF>` del `.env`. El encabezado dice **PRODUCTION**: es la base real.

### 2. Cargar el SQL en el editor

**El portapapeles del sistema no llega al navegador integrado.** `Set-Clipboard` + `Ctrl+V` deja el editor vacío — probado. Tipear el SQL tampoco sirve: el editor cierra paréntesis y comillas solo y corrompe la consulta.

Lo que funciona es escribir en el modelo de Monaco, pasando el archivo en base64 para no pelearse con acentos, comillas ni saltos de línea:

```bash
python -c "import base64; print(base64.b64encode(open('supabase/migrations/ARCHIVO.sql','rb').read()).decode())"
```

Y con `javascript_tool`:

```js
(() => {
  const b64 = "PEGAR_ACA";
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const sql = new TextDecoder('utf-8').decode(bytes);
  const model = window.monaco.editor.getModels()[0];
  model.setValue(sql);
  return JSON.stringify({ chars: model.getValue().length, lineas: model.getLineCount() });
})()
```

Verificar que la cantidad de caracteres coincida con el tamaño del archivo y sacar una captura: los acentos tienen que verse bien. Si se ven caracteres raros, **no ejecutar**: el SQL llegó roto.

### 3. Ejecutar

Botón **Run**, arriba a la derecha. Captura después:

- `Success. No rows returned` → salió bien.
- Los errores aparecen en el panel de abajo. Leerlos enteros antes de reintentar.

### 4. Verificar desde afuera, siempre

Que el editor diga "Success" no alcanza. Comprobar el cambio con un script chico contra la base, corrido desde `app/backend/` (que es donde están las librerías), leyendo `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` del `.env` de la raíz y consultando la tabla o columna que la migración tenía que crear.

Es la regla del proyecto: escribirlo y que compile no es lo mismo que verificarlo. Ver la bitácora del 2026-08-17.

## Después

Registrar en `bitacora/bitacora.md` que la migración quedó aplicada, y avisarle a Mateo qué cambió en la base y qué se verificó.

## Si la sesión se cayó

Pasa: la sesión del navegador integrado no dura para siempre. No es un error del procedimiento. Pedirle a Mateo que se loguee de nuevo, con una frase corta, y retomar desde el paso 1.
