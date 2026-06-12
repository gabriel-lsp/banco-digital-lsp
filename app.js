"use strict";

const RUTA_DATOS = "datos/diccionario_lsp.json";
const TAMANO_LOTE = 16;

const estado = {
  registros: [],
  resultados: [],
  visibles: TAMANO_LOTE,
};

const elementos = {
  busqueda: document.querySelector("#busqueda"),
  categoria: document.querySelector("#categoria"),
  limpiar: document.querySelector("#limpiar"),
  contador: document.querySelector("#contador"),
  mostrando: document.querySelector("#mostrando"),
  galeria: document.querySelector("#galeria"),
  cargarMas: document.querySelector("#cargar-mas"),
  estadoCarga: document.querySelector("#estado"),
  plantilla: document.querySelector("#plantilla-tarjeta"),
};

function normalizar(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function nombreCategoria(categoria) {
  return String(categoria)
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pluralizar(cantidad) {
  return cantidad === 1 ? "seña encontrada" : "señas encontradas";
}
const ORDEN_NUMEROS = new Map([
  ["cero", 0],
  ["uno", 1],
  ["dos", 2],
  ["tres", 3],
  ["cuatro", 4],
  ["cinco", 5],
  ["seis", 6],
  ["siete", 7],
  ["ocho", 8],
  ["nueve", 9],
  ["diez", 10],
  ["once", 11],
  ["doce", 12],
  ["trece", 13],
  ["catorce", 14],
  ["quince", 15],
  ["dieciseis", 16],
  ["diecisiete", 17],
  ["dieciocho", 18],
  ["diecinueve", 19],
  ["veinte", 20],
  ["veintiuno", 21],
  ["veintidos", 22],
  ["veintitres", 23],
  ["veinticuatro", 24],
  ["veinticinco", 25],
  ["veintiseis", 26],
  ["veintisiete", 27],
  ["veintiocho", 28],
  ["veintinueve", 29],
  ["treinta", 30],
]);

function valorNumero(registro) {
  const palabra = normalizar(registro.palabra)
    .replace(/^numero\s+/, "")
    .replace(/^nro\s+/, "")
    .trim();

  const numeroEnDigitos = palabra.match(/\d+/);

  if (numeroEnDigitos) {
    return Number(numeroEnDigitos[0]);
  }

  return ORDEN_NUMEROS.get(palabra) ?? Number.MAX_SAFE_INTEGER;
}

function ordenarRegistros(registros) {
  return [...registros].sort((a, b) => {
    const categoriaA = normalizar(a.categoria);
    const categoriaB = normalizar(b.categoria);

    if (categoriaA === "numeros" && categoriaB === "numeros") {
      const numeroA = valorNumero(a);
      const numeroB = valorNumero(b);

      if (numeroA !== numeroB) {
        return numeroA - numeroB;
      }
    }

    const ordenCategoria = nombreCategoria(a.categoria).localeCompare(
      nombreCategoria(b.categoria),
      "es",
      {
        numeric: true,
        sensitivity: "base",
      },
    );

    if (ordenCategoria !== 0) {
      return ordenCategoria;
    }

    return String(a.palabra).localeCompare(String(b.palabra), "es", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function cargarCategorias(registros) {
  const categorias = [...new Set(registros.map(({ categoria }) => categoria))]
    .filter(Boolean)
    .sort((a, b) =>
      nombreCategoria(a).localeCompare(nombreCategoria(b), "es", {
        sensitivity: "base",
      }),
    );

  const fragmento = document.createDocumentFragment();
  for (const categoria of categorias) {
    const opcion = document.createElement("option");
    opcion.value = categoria;
    opcion.textContent = nombreCategoria(categoria);
    fragmento.append(opcion);
  }
  elementos.categoria.append(fragmento);
}

function crearTarjeta(registro) {
  const fragmento = elementos.plantilla.content.cloneNode(true);
  const tarjeta = fragmento.querySelector(".tarjeta");
  const imagen = fragmento.querySelector(".imagen-sena");

  imagen.src = registro.archivo_imagen;
  imagen.alt = `Seña para la palabra ${registro.palabra}`;
  imagen.addEventListener("error", () => {
    imagen.classList.add("error-imagen");
    imagen.alt = `Imagen no disponible para ${registro.palabra}`;
  });

  fragmento.querySelector(".palabra-tarjeta").textContent = registro.palabra;
  fragmento.querySelector(".categoria-tarjeta").textContent =
    nombreCategoria(registro.categoria);
  const descripcion = registro.descripcion?.trim();
const descripcionElemento = fragmento.querySelector(".descripcion-tarjeta");

if (descripcion) {
  descripcionElemento.textContent = descripcion;
} else {
  descripcionElemento.hidden = true;
}
  fragmento.querySelector(".fuente-tarjeta").textContent =
    registro.fuente || "Fuente no especificada";
  tarjeta.setAttribute(
    "aria-label",
    `${registro.palabra}, categoría ${nombreCategoria(registro.categoria)}`,
  );

  return fragmento;
}

function renderizar() {
  elementos.galeria.replaceChildren();
  const cantidad = estado.resultados.length;
  const limite = Math.min(estado.visibles, cantidad);
  const fragmento = document.createDocumentFragment();

  for (const registro of estado.resultados.slice(0, limite)) {
    fragmento.append(crearTarjeta(registro));
  }
  elementos.galeria.append(fragmento);

  elementos.contador.textContent = `${cantidad.toLocaleString("es-PE")} ${pluralizar(cantidad)}`;
  elementos.mostrando.textContent =
    cantidad > 0
      ? `Mostrando ${limite.toLocaleString("es-PE")} de ${cantidad.toLocaleString("es-PE")}`
      : "";
  elementos.cargarMas.hidden = limite >= cantidad;

  if (cantidad === 0) {
    elementos.estadoCarga.hidden = false;
    elementos.estadoCarga.classList.remove("error");
    elementos.estadoCarga.textContent =
      "No encontramos señas con esos criterios. Prueba otra palabra o categoría.";
  } else {
    elementos.estadoCarga.hidden = true;
  }
}

function filtrar() {
  const consulta = normalizar(elementos.busqueda.value);
  const categoria = elementos.categoria.value;

  estado.resultados = estado.registros.filter((registro) => {
const filtrados = estado.registros.filter((registro) => {
  const coincidePalabra =
    !consulta || normalizar(registro.palabra).includes(consulta);
  const coincideCategoria =
    !categoria || registro.categoria === categoria;
  return coincidePalabra && coincideCategoria;
});

estado.resultados = ordenarRegistros(filtrados);
  
  estado.visibles = TAMANO_LOTE;
  renderizar();
}

function limpiarFiltros() {
  elementos.busqueda.value = "";
  elementos.categoria.value = "";
  filtrar();
  elementos.busqueda.focus();
}

async function iniciar() {
  try {
    const respuesta = await fetch(RUTA_DATOS);
    if (!respuesta.ok) {
      throw new Error(`No se pudieron cargar los datos (${respuesta.status}).`);
    }

    const datos = await respuesta.json();
    if (!Array.isArray(datos)) {
      throw new Error("El archivo de datos no tiene el formato esperado.");
    }

    estado.registros = datos;
    estado.resultados = ordenarRegistros(datos);
    cargarCategorias(datos);
    renderizar();
  } catch (error) {
    console.error(error);
    elementos.contador.textContent = "Datos no disponibles";
    elementos.estadoCarga.hidden = false;
    elementos.estadoCarga.classList.add("error");
    elementos.estadoCarga.textContent =
      "No fue posible cargar el banco. Verifica que el archivo datos/diccionario_lsp.json esté disponible y que la plataforma se abra desde GitHub Pages o un servidor local.";
  }
}

elementos.busqueda.addEventListener("input", filtrar);
elementos.categoria.addEventListener("change", filtrar);
elementos.limpiar.addEventListener("click", limpiarFiltros);
elementos.cargarMas.addEventListener("click", () => {
  estado.visibles += TAMANO_LOTE;
  renderizar();
});

iniciar();
