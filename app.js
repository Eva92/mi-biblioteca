
var $ = function(id) {
  return document.getElementById(id);
};

var books = [];
var readings = [];
var selectedYear = new Date().getFullYear();

var sectionNames = [
  "nuevoLibro",
  "biblioteca",
  "nuevaLectura",
  "lecturas",
  "copias"
];

var statusNames = {
  pendiente: "Pendiente",
  leyendo: "Leyendo",
  leido: "Leído",
  abandonado: "Abandonado"
};

function createId() {
  return Date.now().toString(36) +
    Math.random().toString(36).substring(2);
}

function safe(value) {
  return String(value || "").replace(/[&<>"']/g, function(c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c];
  });
}

/* NAVEGACION */

function showSection(id) {

  var i;
  var section;
  var buttons;

  for (i = 0; i < sectionNames.length; i++) {

    section = $(sectionNames[i]);

    if (section) {
      section.style.display = "none";
    }
  }

  buttons = document.getElementsByTagName("button");

  for (i = 0; i < buttons.length; i++) {

    if (buttons[i].getAttribute("data-section")) {
      buttons[i].style.backgroundColor = "#ffffff";
      buttons[i].style.color = "#000000";
    }
  }

  section = $(id);

  if (!section) {
    id = "nuevoLibro";
    section = $(id);
  }

  if (section) {
    section.style.display = "block";
  }

  for (i = 0; i < buttons.length; i++) {

    if (buttons[i].getAttribute("data-section") === id) {
      buttons[i].style.backgroundColor = "#000000";
      buttons[i].style.color = "#ffffff";
    }
  }

  window.scrollTo(0, 0);
}

/* ACTIVAR NAVEGACION INMEDIATAMENTE */

function setupNavigation() {

  var buttons = document.getElementsByTagName("button");
  var i;

  for (i = 0; i < buttons.length; i++) {

    if (buttons[i].getAttribute("data-section")) {

      buttons[i].onclick = function() {
        showSection(this.getAttribute("data-section"));
        return false;
      };

    }
  }

  showSection("nuevoLibro");
}

setupNavigation();

/* ACTUALIZAR CONTADORES */

function updateCounters() {

  $("totalBooks").textContent = books.length;

  var count = 0;

  for (var i = 0; i < readings.length; i++) {
    if (Number(readings[i].year) === selectedYear) {
      count++;
    }
  }

  $("totalReadings").textContent = count;
}

/* ACTUALIZAR DATOS */

async function refresh() {

  books = await Database.getBooks();
  readings = await Database.getReadings();

  renderBooks();
  renderReadingOptions();
  renderReadings();
  updateCounters();

}

/* FORMULARIO DE LIBROS */

function resetBookForm() {

  $("bookForm").reset();
  $("bookId").value = "";
  $("formTitle").textContent = "Nuevo libro";
  $("saveBook").textContent = "Guardar libro";
  $("cancelEdit").style.display = "none";

}

$("cancelEdit").onclick = function() {
  resetBookForm();
  showSection("biblioteca");
};

/* GUARDAR LIBRO */

$("bookForm").onsubmit = async function(event) {

  event.preventDefault();

  var book = {
    id: $("bookId").value || createId(),
    title: $("title").value.trim(),
    author: $("author").value.trim(),
    status: $("status").value,
    note: $("note").value.trim()
  };

  if (!book.title || !book.author) return false;

  try {

    await Database.saveBook(book);
    resetBookForm();
    await refresh();

    showSection("biblioteca");

  } catch (error) {
    alert("No se pudo guardar el libro.");
  }

  return false;
};

/* BIBLIOTECA */

function renderBooks() {

  var search = $("searchBooks").value.toLowerCase().trim();

  var html = "";
  var count = 0;

  for (var i = 0; i < books.length; i++) {

    var book = books[i];

    var text = (book.title + " " + book.author).toLowerCase();

    if (text.indexOf(search) === -1) continue;

    count++;

    html += '<article class="book-card">';
    html += '<h3>' + safe(book.title) + '</h3>';
    html += '<p>' + safe(book.author) + '</p>';
    html += '<p><strong>Estado:</strong> ' +
      (statusNames[book.status] || "Pendiente") + '</p>';

    if (book.note) {
      html += '<p><strong>Nota:</strong> ' + safe(book.note) + '</p>';
    }

    html += '<div class="book-actions">';
    html += '<button type="button" data-action="edit" data-id="' +
      safe(book.id) + '">Editar</button>';
    html += '<button type="button" data-action="delete" data-id="' +
      safe(book.id) + '">Eliminar</button>';
    html += '</div></article>';

  }

  $("bookList").innerHTML = html ||
    "<p>No hay libros registrados.</p>";

}

$("searchBooks").oninput = renderBooks;

$("bookList").onclick = async function(event) {

  var button = event.target;

  var action = button.getAttribute("data-action");
  var id = button.getAttribute("data-id");

  if (!action || !id) return;

  var book = null;

  for (var i = 0; i < books.length; i++) {
    if (books[i].id === id) book = books[i];
  }

  if (!book) return;

  if (action === "edit") {

    $("bookId").value = book.id;
    $("title").value = book.title;
    $("author").value = book.author;
    $("status").value = book.status;
    $("note").value = book.note || "";

    $("formTitle").textContent = "Editar libro";
    $("saveBook").textContent = "Guardar cambios";
    $("cancelEdit").style.display = "block";

    showSection("nuevoLibro");

  }

  if (action === "delete" && confirm("¿Eliminar este libro?")) {

    await Database.deleteBook(id);
    await refresh();

  }

};

/* AÑOS */

function prepareYears() {

  var selects = [
    $("readingYear"),
    $("newReadingYear")
  ];

  for (var s = 0; s < selects.length; s++) {

    selects[s].innerHTML = "";

    for (var y = new Date().getFullYear(); y >= 2000; y--) {

      var option = document.createElement("option");

      option.value = y;
      option.text = y;

      selects[s].appendChild(option);

    }

    selects[s].value = selectedYear;
  }

}

function changeYear(year) {

  selectedYear = Number(year);

  $("readingYear").value = selectedYear;
  $("newReadingYear").value = selectedYear;

  renderReadings();
  updateCounters();

}

$("readingYear").onchange = function() {
  changeYear(this.value);
};

$("newReadingYear").onchange = function() {
  changeYear(this.value);
};

/* LIBROS PARA REGISTRAR LECTURAS */

function renderReadingOptions() {

  var select = $("readingBook");
  var previous = select.value;

  select.innerHTML = '<option value="">Selecciona un libro</option>';

  for (var i = 0; i < books.length; i++) {

    var option = document.createElement("option");

    option.value = books[i].id;
    option.text = books[i].title + " - " + books[i].author;

    select.appendChild(option);

  }

  select.value = previous;

}

/* REGISTRAR LECTURA */

$("readingForm").onsubmit = async function(event) {

  event.preventDefault();

  var bookId = $("readingBook").value;
  var year = Number($("newReadingYear").value);

  var book = null;

  for (var i = 0; i < books.length; i++) {
    if (books[i].id === bookId) book = books[i];
  }

  if (!book) {
    alert("Selecciona un libro.");
    return false;
  }

  for (var j = 0; j < readings.length; j++) {

    if (
      readings[j].bookId === bookId &&
      Number(readings[j].year) === year
    ) {
      alert("Este libro ya está registrado en ese año.");
      return false;
    }

  }

  try {

    await Database.addReading({
      id: createId(),
      bookId: bookId,
      year: year
    });

    book.status = "leido";

    await Database.saveBook(book);

    $("readingForm").reset();

    await refresh();

    showSection("lecturas");

  } catch (error) {
    alert("No se pudo registrar la lectura.");
  }

  return false;
};

/* LECTURAS POR AÑO */

function renderReadings() {

  var year = Number($("readingYear").value);
  var html = "";
  var count = 0;

  for (var i = 0; i < readings.length; i++) {

    var reading = readings[i];

    if (Number(reading.year) !== year) continue;

    var book = null;

    for (var j = 0; j < books.length; j++) {
      if (books[j].id === reading.bookId) book = books[j];
    }

    if (!book) continue;

    count++;

    html += '<article class="book-card">';
    html += '<h3>' + safe(book.title) + '</h3>';
    html += '<p>' + safe(book.author) + '</p>';
    html += '<button type="button" data-reading-delete="' +
      safe(reading.id) + '">Quitar de este año</button>';
    html += '</article>';

  }

  $("yearCount").textContent = count;

  $("readingList").innerHTML = html ||
    "<p>No hay lecturas registradas este año.</p>";

}

$("readingList").onclick = async function(event) {

  var id = event.target.getAttribute("data-reading-delete");

  if (!id) return;

  if (confirm("¿Quitar esta lectura del año?")) {

    await Database.deleteReading(id);
    await refresh();

  }

};

/* COPIAS */

$("exportButton").onclick = async function() {

  try {

    var data = await Database.exportData();

    var blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    var url = URL.createObjectURL(blob);

    var link = document.createElement("a");

    link.href = url;
    link.download = "mi-biblioteca.json";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(function() {
      URL.revokeObjectURL(url);
    }, 2000);

  } catch (error) {
    alert("No se pudo exportar la biblioteca.");
  }

};

/* IMPORTAR */

$("importFile").onchange = async function(event) {

  var file = event.target.files[0];

  if (!file) return;

  try {

    var data = JSON.parse(await file.text());

    if (!confirm("¿Sustituir la biblioteca por esta copia?")) {
      return;
    }

    await Database.importData(data);

    resetBookForm();
    await refresh();

    alert("Copia restaurada correctamente.");

  } catch (error) {

    alert("No se pudo importar la copia: " + error.message);

  }

  event.target.value = "";

};

/* INICIO */

async function start() {

  try {

    await Database.open();

    prepareYears();

    await refresh();

  } catch (error) {

    $("message").textContent =
      "Error al abrir la base de datos.";

  }

  if (
    "serviceWorker" in navigator &&
    location.protocol === "https:"
  ) {

    navigator.serviceWorker.register("./sw.js")
      .catch(function() {});

  }

}

start();
