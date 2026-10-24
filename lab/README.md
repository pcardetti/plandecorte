# Laboratorio del optimizador

Esta carpeta no se publica (ver `.vercelignore`). Sirve para medir y verificar `optimizer.js`.
No hace falta instalar nada: se usa el motor JavaScript de macOS.

```bash
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc
```

| Archivo | Para qué |
|---|---|
| `baseline.js` | Copia exacta del algoritmo anterior de la app (voraz, 80 combinaciones). |
| `instances.js` | Generadores: muebles reales (bajo mesada, alacena, placard, biblioteca, cajonera…), estrés y clases aleatorias. |
| `official.js` | Generador oficial de las 500 instancias clásicas I–X (Berkey & Wang, Martello & Vigo) con los mejores resultados publicados. |
| `validate.js` | Verificador independiente: dentro del tablero, kerf entre piezas, cortable con guillotina, veta, giros forzados, piezas completas. |
| `run.js` | Compara algoritmos por conjunto: `$JSC lab/run.js -- "muebles:60,muebles-grandes:20" base,pro 1500` |
| `exp.js` | Compara configuraciones de búsqueda con el mismo tiempo. |
| `official_run.js` | Las 500 instancias oficiales: `$JSC lab/official_run.js -- pro 1000` |
| `fuzz.js` | Casos al azar (decimales, márgenes, máximo de tableros, piezas que no entran…): `$JSC lab/fuzz.js -- 500 40 1` |
| `experimental.js` | Métodos probados que no mejoraron (mejora por vaciado, SVC). |

## Resultados (notebook Intel i7-3520M de 2012)

500 instancias oficiales, total de tableros (menos es mejor):

| Método | Tableros |
|---|---|
| Algoritmo anterior de la app | 7131 |
| CHBP (Charalambous & Fleszar 2011) | 7064 |
| SVCRG (2014) | 7035 |
| **optimizer.js, 1 s por instancia** | **7032** |
| Mejor conocido (corridas largas, varios autores) | 6980 |

80 proyectos de muebles reales con kerf y márgenes (`run.js -- "muebles:60,muebles-grandes:20" base,pro 1500`): 267 tableros con el algoritmo anterior y 257–259 con el nuevo (según la carga del equipo). El nuevo llega al mínimo teórico en 65 de 80 proyectos (el anterior en 57), es mejor en 76 y nunca peor.
