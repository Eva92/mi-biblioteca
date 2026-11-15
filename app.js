
const $ = id => document.getElementById(id);

let books = [];
let readings = [];
let selectedYear = new Date().getFullYear();

const labels = {
  pendiente: "Pendiente",
  leyendo: "Leyendo",
  leido: "Leído",
  abandonado: "Abandonado"
};

function createId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

// NAVEGACIÓN


function showSection(sectionId) {
  const sections = [
    "nuevoLibro",
    "biblioteca",
    "nuevaLectura",
    "lecturas",
    "copias"
  ];

  if (!sections.includes(sectionId)) {
    sectionId = "nuevoLibro";
  }

  window.location.hash = sectionId;
}

window.addEventListener("hashchange", () => {
  const sectionId = location.hash.substring(1) || "nuevoLibro";

  document.querySelectorAll(".section").forEach(section => {
    section.style.display =
      section.id === sectionId ? "block" : "none";
  });
});

window.addEventListener("DOMContentLoaded", () => {
  const sectionId = location.hash.substring(1) || "nuevoLibro";

  document.querySelectorAll(".section").forEach(section => {
    section.style.display =
      section.id === sectionId ? "block" : "none";
  });
});

// CARGAR DATOS

async function refresh() {
  books = await Database.getBooks();
  readings = await Database.getReadings();

  renderBooks();
  renderReadingOptions();
  renderReadings();
  updateCounters();
}

// ENCABEZADO

function updateCounters() {
  $("totalBooks").textContent = books.length;

  const count = readings.filter(item =>
    Number(item.year) === selectedYear
  ).length;

  $("totalReadings").textContent = count;
}

// BIBLIOTECA

function renderBooks() {
  const search = $("searchBooks").value.toLowerCase().trim();

  const filtered = books.filter(book =>
    `${book.title} ${book.author}`.toLowerCase().includes(search)
  );

  $("bookList").innerHTML = filtered.length
    ? filtered.map(book => `
      <article class="book-card">
        <h3>${safe(book.title)}</h3>

        <p>${safe(book.author)}</p>

        <p><strong>Estado:</strong>
          ${labels[book.status] || "Pendiente"}
        </p>

        ${book.note ? `
          <p><strong>Nota:</strong>
            ${safe(book.note)}
          </p>
        ` : ""}

        <div class="book-actions">
          <button data-action="edit"
                  data-id="${safe(book.id)}">
            Editar
          </button>

          <button class="secondary"
                  data-action="delete"
                  data-id="${safe(book.id)}">
            Eliminar
          </button>
        </div>
      </article>
    `).join("")
    : "<p>No hay libros registrados.</p>";
}

// NUEVO LIBRO Y EDICIÓN

function resetBookForm() {
  $("bookForm").reset();
  $("bookId").value = "";
  $("formTitle").textContent = "Nuevo libro";
  $("saveBook").textContent = "Guardar libro";
  $("cancelEdit").classList.add("hidden");
}

$("bookForm").addEventListener("submit", async event => {
  event.preventDefault();

  const book = {
    id: $("bookId").value || createId(),
    title: $("title").value.trim(),
    author: $("author").value.trim(),
    status: $("status").value,
    note: $("note").value.trim()
  };

  if (!book.title || !book.author) return;

  try {
    await Database.saveBook(book);
    resetBookForm();
    await refresh();

    $("message").textContent = "Libro guardado correctamente.";
  } catch (error) {
    alert("No se pudo guardar el libro.");
  }
});

$("cancelEdit").addEventListener("click", resetBookForm);

$("bookList").addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const book = books.find(item =>
    item.id === button.dataset.id
  );

  if (!book) return;

  if (button.dataset.action === "edit") {
    $("bookId").value = book.id;
    $("title").value = book.title;
    $("author").value = book.author;
    $("status").value = book.status;
    $("note").value = book.note || "";

    $("formTitle").textContent = "Editar libro";
    $("saveBook").textContent = "Guardar cambios";
    $("cancelEdit").classList.remove("hidden");

    showSection("nuevoLibro");
    window.scrollTo(0, 0);
  }

  if (button.dataset.action === "delete") {
    if (confirm(
      "¿Eliminar este libro y todas sus lecturas registradas?"
    )) {
      try {
        await Database.deleteBook(book.id);
        await refresh();
      } catch (error) {
        alert("No se pudo eliminar el libro.");
      }
    }
  }
});

// BUSCADOR

$("searchBooks").addEventListener("input", renderBooks);

// AÑOS

function populateYears(select) {
  select.innerHTML = "";

  const currentYear = new Date().getFullYear();

  for (let year = currentYear; year >= 2000; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    select.appendChild(option);
  }

  select.value = selectedYear;
}

populateYears($("readingYear"));
populateYears($("newReadingYear"));

// CAMBIO DE AÑO

$("readingYear").addEventListener("change", () => {
  selectedYear = Number($("readingYear").value);

  $("newReadingYear").value = selectedYear;

  renderReadings();
  updateCounters();
});

$("newReadingYear").addEventListener("change", () => {
  selectedYear = Number($("newReadingYear").value);

  $("readingYear").value = selectedYear;

  renderReadings();
  updateCounters();
});

// LISTA DE LIBROS PARA NUEVAS LECTURAS

function renderReadingOptions() {
  const select = $("readingBook");
  const previous = select.value;

  select.innerHTML =
    '<option value="">Selecciona un libro</option>';

  books.forEach(book => {
    const option = document.createElement("option");

    option.value = book.id;
    option.textContent = `${book.title} — ${book.author}`;

    select.appendChild(option);
  });

  if (books.some(book => book.id === previous)) {
    select.value = previous;
  }
}

// REGISTRAR UNA LECTURA

$("readingForm").addEventListener("submit", async event => {
  event.preventDefault();

  const bookId = $("readingBook").value;
  const year = Number($("newReadingYear").value);

  const book = books.find(item => item.id === bookId);

  if (!book) {
    alert("Selecciona un libro.");
    return;
  }

  const exists = readings.some(item =>
    item.bookId === bookId &&
    Number(item.year) === year
  );

  if (exists) {
    alert("Este libro ya está registrado en ese año.");
    return;
  }

  try {
    // Registrar lectura anual
    await Database.addReading({
      id: createId(),
      bookId,
      year
    });

    // Cambiar automáticamente su estado
    book.status = "leido";

    await Database.saveBook(book);

    $("readingForm").reset();

    await refresh();

    $("message").textContent =
      "Lectura registrada. Estado actualizado a Leído.";

  } catch (error) {
    alert("No se pudo registrar la lectura.");
  }
});

// LECTURAS POR AÑO

function renderReadings() {
  const year = Number($("readingYear").value);

  const selected = readings.filter(item =>
    Number(item.year) === year
  );

  $("yearCount").textContent = selected.length;

  $("readingList").innerHTML = selected.map(item => {
    const book = books.find(b => b.id === item.bookId);

    if (!book) return "";

    return `
      <article class="book-card">
        <h3>${safe(book.title)}</h3>
        <p>${safe(book.author)}</p>

        <button class="secondary"
                data-reading-delete="${safe(item.id)}">
          Quitar de este año
        </button>
      </article>
    `;
  }).join("") || "<p>No hay lecturas registradas este año.</p>";
}

// ELIMINAR UNA LECTURA ANUAL

$("readingList").addEventListener("click", async event => {
  const button = event.target.closest("[data-reading-delete]");

  if (!button) return;

  if (confirm("¿Quitar este libro de las lecturas del año?")) {
    try {
      await Database.deleteReading(button.dataset.readingDelete);
      await refresh();
    } catch (error) {
      alert("No se pudo eliminar la lectura.");
    }
  }
});

// EXPORTAR BASE DE DATOS

$("exportButton").addEventListener("click", async () => {
  try {
    const data = await Database.exportData();

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "mi-biblioteca.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    $("message").textContent = "Copia de seguridad descargada.";

  } catch (error) {
    alert("No se pudo exportar la biblioteca.");
  }
});

// IMPORTAR BASE DE DATOS

$("importFile").addEventListener("change", async event => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    const data = JSON.parse(await file.text());

    if (!Array.isArray(data.books) ||
        !Array.isArray(data.readings)) {
      throw new Error("Archivo no válido.");
    }

    const validBooks = data.books.every(book =>
      book &&
      typeof book.id === "string" &&
      typeof book.title === "string" &&
      typeof book.author === "string" &&
      ["pendiente", "leyendo", "leido", "abandonado"]
        .includes(book.status)
    );

    const validReadings = data.readings.every(reading =>
      reading &&
      typeof reading.id === "string" &&
      typeof reading.bookId === "string" &&
      Number.isInteger(Number(reading.year)) &&
      data.books.some(book => book.id === reading.bookId)
    );

    if (!validBooks || !validReadings) {
      throw new Error("Hay registros incorrectos.");
    }

    if (!confirm(
      "Se sustituirán todos los datos actuales. ¿Continuar?"
    )) return;

    await Database.importData(data);
    resetBookForm();
    await refresh();

    $("message").textContent = "Biblioteca restaurada correctamente.";

  } catch (error) {
    alert("Error al importar: " + error.message);
  } finally {
    event.target.value = "";
  }
});

// INICIAR APLICACIÓN

async function start() {
  try {
    await Database.open();
    await refresh();

    $("message").textContent = "Base de datos preparada.";

    if ("serviceWorker" in navigator &&
        location.protocol === "https:") {
      navigator.serviceWorker.register("./sw.js")
        .catch(() => {});
    }

  } catch (error) {
    $("message").textContent =
      "No se pudo abrir la base de datos.";
  }
}

start();
