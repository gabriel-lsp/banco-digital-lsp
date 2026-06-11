# Extractor de fichas de Lengua de Señas Peruana

Aplicación en Python para detectar, recortar y catalogar las fichas visuales de
una guía PDF de Lengua de Señas Peruana (LSP).

Cada recorte conserva:

- el título superior;
- la ilustración central;
- el borde de color;
- el recuadro inferior con la descripción.

La detección localiza paneles rectangulares con centro blanco y confirma que
tengan borde amarillo o anaranjado, verde, morado o lila. Las páginas sin
tarjetas se omiten; las páginas con resultados insuficientes se copian a
`salida/revision/paginas_para_calibrar/`.

## Estructura

```text
entrada/
  guia_lsp.pdf
salida/
  imagenes/
  excel/
  revision/
config/
  categorias_paginas.csv
  paginas_excluidas.csv
  config.yaml
src/
  render_pdf.py
  detectar_tarjetas.py
  extraer_texto.py
  organizar_categorias.py
  exportar_excel.py
  utilidades.py
main.py
requirements.txt
requirements-ocr.txt
README.md
```

## Requisitos

- Python 3.10 o posterior.
- El PDF de la guía en `entrada/guia_lsp.pdf`.
- Tesseract es opcional y solo se necesita para aplicar OCR a páginas sin texto
  PDF embebido.

## Instalación

### Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Linux o macOS

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Las dependencias principales son PyMuPDF, OpenCV, NumPy, pandas, openpyxl y
PyYAML.

## Configuración de categorías

Edite `config/categorias_paginas.csv` con la numeración real del archivo PDF:

```csv
categoria,pagina_inicio,pagina_fin
Alimentos,120,130
Salud,131,140
```

Reglas:

1. La numeración comienza en 1.
2. `pagina_inicio` y `pagina_fin` son inclusivas.
3. Los intervalos deben corresponder al orden de la guía.
4. Una página no incluida en el CSV se registra como `Sin categoría`.
5. Antes del modo completo se deben reemplazar los intervalos de ejemplo por
   los intervalos reales de la guía.

En modo completo, una ficha de la categoría `Alimentos` se guarda dentro de
`salida/imagenes/alimentos/`.

## Páginas excluidas

`config/paginas_excluidas.csv` es opcional. Si existe, sus páginas se omiten
antes de renderizar, detectar tarjetas o extraer texto. La numeración comienza
en 1 y corresponde a la página del PDF.

```csv
pagina,motivo
105,Portada de categoria
106,Pagina en blanco
```

Puede dejar el archivo solo con el encabezado cuando no necesite exclusiones.
El motivo se copia al Excel y a
`salida/revision/paginas_omitidas.txt`.

También puede usar otro archivo:

```powershell
python main.py --modo completo --exclusiones config/mis_exclusiones.csv
```

## Calibración de `config.yaml`

### Renderizado

```yaml
render:
  dpi: 300
```

Un DPI mayor mejora el detalle y el OCR, pero consume más memoria y tarda más.
Para calibración rápida puede usarse 150 o 200 DPI. Para recortes finales se
recomienda 300 DPI.

### Rango general de páginas

```yaml
paginas:
  inicio: 1
  fin: null
```

`null` procesa hasta la última página. Este rango se usa en modo completo
cuando no se proporciona `--paginas`.

### Colores de borde

```yaml
deteccion:
  rangos_hsv_bordes:
    - nombre: amarillo_anaranjado
      min: [5, 40, 80]
      max: [42, 255, 255]
    - nombre: verde
      min: [35, 20, 80]
      max: [100, 255, 255]
    - nombre: morado_lila
      min: [115, 20, 80]
      max: [179, 255, 255]
```

Los rangos aceptan bordes amarillos o anaranjados, verdes y morados o lilas.
Estos colores solo sirven para detectar y validar la forma de la tarjeta. La
categoría nunca se deduce del color; siempre proviene de
`config/categorias_paginas.csv`.

### Área y geometría

```yaml
deteccion:
  area_minima: 0.03
  area_maxima: 0.20
```

Un valor entre 0 y 1 se interpreta como proporción del área total de la página.
Un valor mayor que 1 se interpreta como píxeles. Las proporciones son
independientes del DPI y normalmente resultan más fáciles de mantener.

También se pueden ajustar:

- `ancho_min_relativo` y `ancho_max_relativo`;
- `alto_min_relativo` y `alto_max_relativo`;
- `relacion_aspecto_min` y `relacion_aspecto_max`;
- `rectangularidad_minima`;
- `proporcion_blanca_minima`.

### Unión de contornos y recorte completo

```yaml
deteccion:
  tolerancia_unir_contornos: 9
  margen_extra: 12
  extension_inferior_ratio: 0.14
```

- `tolerancia_unir_contornos` controla el cierre morfológico de líneas
  separadas. Debe ser un entero impar; el programa ajusta automáticamente un
  valor par al siguiente impar.
- `margen_extra` agrega píxeles alrededor del panel detectado.
- `extension_inferior_ratio` extiende el recorte hacia abajo para incluir el
  recuadro descriptivo. Si la descripción aparece cortada, aumente este valor
  gradualmente, por ejemplo a `0.16`.

### Estrategia secundaria de fondo blanco

```yaml
deteccion:
  saturacion_max_fondo_blanco: 10
  valor_min_fondo_blanco: 210
```

Estos valores aíslan el interior blanco de la ficha. Si el papel escaneado se ve
gris o amarillento, puede ser necesario aumentar
`saturacion_max_fondo_blanco` o reducir `valor_min_fondo_blanco`. Haga los
cambios de uno en uno y compruebe el modo depuración.

### Cantidad mínima

```yaml
deteccion:
  min_tarjetas_esperadas: 2
```

Si el resultado final contiene al menos una tarjeta pero queda por debajo de
este valor, se guarda una copia de la página para revisión manual. Si no hay
ninguna tarjeta válida, la página se omite y se registra en los reportes.

## Extracción de texto

El programa busca primero texto embebido mediante PyMuPDF y lo asigna a la ficha
según sus coordenadas. Cuando el título no está disponible, usa este nombre:

```text
revisar_pagina_153_tarjeta_01.png
```

La palabra provisional también queda registrada en el Excel.

### OCR opcional

Para páginas completamente escaneadas se puede instalar Tesseract y el paquete
opcional:

```powershell
pip install -r requirements-ocr.txt
```

Después, cambie:

```yaml
texto:
  ocr_habilitado: true
  idioma_ocr: spa
  ejecutable_tesseract: null
```

Tesseract debe tener instalado el idioma español. En Windows, si el ejecutable
no está en `PATH`, configure una ruta como:

```yaml
ejecutable_tesseract: "C:/Program Files/Tesseract-OCR/tesseract.exe"
```

El OCR es auxiliar. Todos sus resultados comienzan con
`estado_revision = Pendiente` y deben verificarse.

## Modos de ejecución

### Modo prueba

Procesa únicamente las páginas indicadas, guarda los recortes en
`salida/revision/recortes_prueba/` y genera
`salida/excel/diccionario_lsp_prueba.xlsx`.

```powershell
python main.py --modo prueba --paginas 120-122
```

También acepta páginas separadas y varios rangos:

```powershell
python main.py --modo prueba --paginas 107,153,181-183
```

### Modo depuración

Además de los recortes y el Excel, guarda cada página con rectángulos numerados
en `salida/revision/depuracion/`.

```powershell
python main.py --modo depuracion --paginas 120-122
```

Los rectángulos anaranjados corresponden a detección directa por color y los
verdes a paneles blancos confirmados por su borde de color.

### Modo completo

Procesa el rango definido en `config.yaml`, organiza las imágenes por categoría
y genera el Excel maestro.

```powershell
python main.py --modo completo
```

Archivos principales:

```text
salida/imagenes/NOMBRE_CATEGORIA/nombre_de_la_sena.png
salida/excel/diccionario_lsp.xlsx
salida/revision/paginas_omitidas.txt
```

### Reconstruir el Excel maestro

Cuando las imágenes ya fueron reorganizadas manualmente dentro de
`salida/imagenes/`, reconstruya el banco de señas con:

```powershell
python main.py --modo reconstruir_excel
```

El comando toma el nombre de cada carpeta como categoría, recupera los
metadatos disponibles de `salida/excel/diccionario_lsp.xlsx` y crea:

```text
salida/excel/diccionario_lsp_maestro_actualizado.xlsx
```

El Excel original no se modifica. El archivo actualizado contiene las hojas
`diccionario_lsp`, `resumen_categorias` y `pendientes_revision`.
Si el original fue movido, el comando puede reutilizar
`diccionario_lsp_maestro_respaldo.xlsx` como fuente secundaria, sin
modificarlo.

### Revisar palabras pendientes

Genere la revisión visual y la plantilla de correcciones con:

```powershell
python main.py --modo generar_revision_palabras
```

El comando selecciona únicamente palabras que contienen `revisar pagina` o
`revisar_pagina` y crea:

```text
salida/revision/revision_palabras_pendientes.html
salida/revision/correcciones_palabras.csv
```

Abra el HTML para comparar las imágenes y complete la columna
`palabra_corregida`. El modo de aplicación busca primero:

```text
salida/revision/correcciones_palabras.xlsx
```

Si ese archivo no existe, utiliza como respaldo:

```text
salida/revision/correcciones_palabras.csv
```

Ambos archivos deben conservar las columnas `id`, `categoria`,
`archivo_imagen`, `palabra_actual`, `palabra_corregida` y `observacion`.
Las filas donde `palabra_corregida` esté vacía no se modifican.

Después aplique las correcciones:

```powershell
python main.py --modo aplicar_correcciones
```

El resultado se guarda en:

```text
salida/excel/diccionario_lsp_maestro_final.xlsx
```

El archivo `diccionario_lsp_maestro_actualizado.xlsx` no se modifica.

### Preparar archivos para publicación web

Después de generar el maestro final, prepare la versión publicable con:

```powershell
python main.py --modo preparar_web
```

El comando excluye palabras pendientes, filas marcadas `No publicar`,
registros sin categoría, palabra o ruta de imagen y registros cuya imagen
no exista. Genera:

```text
salida/excel/diccionario_lsp_publicable.xlsx
salida/web/diccionario_lsp.csv
salida/web/diccionario_lsp.json
```

El Excel publicable contiene las hojas `diccionario_lsp`,
`resumen_categorias` y `excluidos`. La última conserva las filas no
publicadas junto con `motivo_exclusion`. El archivo
`diccionario_lsp_maestro_final.xlsx` se utiliza solo como fuente y no se
modifica.

## Excel maestro

El archivo contiene únicamente estas hojas:

- `diccionario_lsp`: matriz principal con todas las señas;
- `resumen_categorias`: columnas `categoria` y
  `cantidad_senas_extraidas`;
- `paginas_omitidas`: columnas `pagina_pdf` y `motivo`.

No se crea una hoja por categoría. La hoja `diccionario_lsp` contiene estas
columnas:

- `id`
- `categoria`
- `palabra`
- `descripcion`
- `archivo_imagen`
- `pagina_pdf`
- `numero_tarjeta_en_pagina`
- `x`
- `y`
- `ancho`
- `alto`
- `estado_revision`
- `observacion`
- `fuente`

`estado_revision` se inicia como `Pendiente`. El valor de `fuente` es:

```text
Ministerio de Educación del Perú - Guía de Lengua de Señas Peruana
```

Las coordenadas y tamaños están expresados en píxeles de la imagen renderizada
al DPI configurado.

## Flujo recomendado

1. Configure unos pocos intervalos en `categorias_paginas.csv`.
2. Ejecute el modo depuración sobre páginas representativas.
3. Revise que cada rectángulo incluya la descripción inferior.
4. Ajuste HSV, fondo blanco, área, margen o extensión inferior.
5. Repita la depuración.
6. Complete todos los intervalos de categorías.
7. Ejecute el modo completo.
8. Revise las filas `Pendiente` y los nombres que comienzan con `revisar_`.

## Pruebas

```powershell
python -m unittest discover -s tests -v
```

Las pruebas incluyen el orden de lectura, una cuadrícula sintética de seis
fichas, el análisis de rangos de páginas y la asignación de categorías.

## Solución de problemas

### No se detectan fichas

Ejecute el modo depuración y pruebe, en este orden:

1. reducir `valor_min_fondo_blanco`;
2. aumentar ligeramente `saturacion_max_fondo_blanco`;
3. reducir `area_minima`;
4. aumentar `tolerancia_unir_contornos`.

### Se detectan bloques que no son fichas

Pruebe:

1. aumentar `area_minima`;
2. reducir `area_maxima`;
3. aumentar `rectangularidad_minima`;
4. aumentar `proporcion_blanca_minima`.

### La descripción inferior queda cortada

Aumente `extension_inferior_ratio` o `margen_extra`. Revise que el recorte no
invada la ficha de la fila siguiente.

### No se reconoce el título

Compruebe si la página tiene texto embebido. Si es una imagen escaneada, active
el OCR opcional o mantenga los nombres provisionales para corrección manual.
