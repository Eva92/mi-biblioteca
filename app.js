
let books = [];
let editingId = null;

const $ = id => document.getElementById(id);

function makeElement(tag, text, className) {

  const element = document.createElement(tag);

  element.textContent = text;

  if (className) element.className = className;

  return element;

}

// NAVEGACIÓN

$("showBooks").onclick = () => {

  $("booksSection").hidden = false;
  $("yearSection").hidden = true;

  $("showBooks").classList.add("active");
  $("showYear").classList.remove("active");

};

$("showYear").onclick = async () => {

  $("booksSection").hidden = true;
  $("yearSection").hidden = false;

  $("showYear").classList.add("active");
  $("showBooks").classList.remove("active");

  await renderYear();

};

// INICIO

async function init() {

  try {

    await openDatabase();

    $("dbStatus").textContent = "BASE DE DATOS CONECTADA";

    const yearSelect = $("year");
    const currentYear = new Date().getFullYear();

    for (let year = currentYear - 10; year <= currentYear + 1; year++) {

      const option = makeElement("option", String(year));
      option.value = year;

      if (year === currentYear) option.selected = true;

      yearSelect.appendChild(option);

    }

    await renderBooks();
    await renderSelector();

  } catch (error) {

    console.error(error);

    $("dbStatus").textContent = "ERROR DE BASE DE DATOS";

    alert("No se pudo abrir la base de datos.");

  }

}

// GUARDAR LIBRO

$("bookForm").onsubmit = async event => {

  event.preventDefault();

  const book = {

    title: $("title").value.trim(),
    author: $("author").value.trim(),
    status: $("status").value,
    notes: $("notes").value.trim()

  };

  if (!book.title || !book.author) return;

  try {

    if (editingId !== null) {

      const existing = books.find(b => b.id === editingId);

      await updateBook({
        ...existing,
        ...book
      });

    } else {

      await addBook(book);

    }

    resetForm();

    await renderBooks();
    await renderSelector();

    alert("Libro guardado.");

  } catch (error) {

    alert("Error al guardar el libro.");

  }

};

// LIMPIAR FORMULARIO

function resetForm() {

  $("bookForm").reset();

  editingId = null;

  $("cancelEdit").hidden = true;

}

$("cancelEdit").onclick = resetForm;

// MOSTRAR LIBROS

async function renderBooks() {

  books = await getBooks();

  const list = $("bookList");
  const query = $("search").value.toLowerCase().trim();

  list.innerHTML = "";

  const filtered = books.filter(book =>
    (book.title + " " + book.author)
      .toLowerCase()
      .includes(query)
  );

  if (!filtered.length) {

    list.appendChild(
      makeElement("p", "No hay libros registrados.", "empty")
    );

  }

  filtered.forEach(book => {

    const card = makeElement("article", "", "book");

    card.appendChild(
      makeElement("h3", book.title)
    );

    card.appendChild(
      makeElement("p", "Autor: " + book.author)
    );

    card.appendChild(
      makeElement("p", "Estado: " + book.status)
    );

    if (book.notes) {
      card.appendChild(
        makeElement("p", "Notas: " + book.notes)
      );
    }

    const actions = makeElement("div", "", "book-actions");

    const edit = makeElement("button", "EDITAR");

    edit.onclick = () => {

      editingId = book.id;

      $("title").value = book.title;
      $("author").value = book.author;
      $("status").value = book.status;
      $("notes").value = book.notes;

      $("cancelEdit").hidden = false;

      $("booksSection").scrollIntoView();

    };

    const remove = makeElement("button", "ELIMINAR");

    remove.onclick = async () => {

      if (!confirm("¿Eliminar este libro?")) return;

      await deleteBook(book.id);

      await renderBooks();
      await renderSelector();
      await renderYear();

    };

    actions.append(edit, remove);
    card.appendChild(actions);

    list.appendChild(card);

  });

}

$("search").oninput = renderBooks;

// SELECTOR DE LIBROS

async function renderSelector() {

  books = await getBooks();

  const selector = $("bookSelector");

  selector.innerHTML = "";

  books.forEach(book => {

    const option = makeElement(
      "option",
      book.title + " — " + book.author
    );

    option.value = book.id;

    selector.appendChild(option);

  });

  $("addYearBook").disabled = books.length === 0;

}

// AÑADIR LIBRO AL AÑO

$("addYearBook").onclick = async () => {

  const bookId = Number($("bookSelector").value);
  const year = Number($("year").value);

  if (!bookId) {
    alert("Selecciona un libro.");
    return;
  }

  try {

    const currentReads = await getYearlyReads(year);

    if (currentReads.some(read => read.bookId === bookId)) {
      alert("Este libro ya está en las lecturas del año.");
      return;
    }

    await addYearlyRead(bookId, year);

    await renderYear();

    alert("Libro añadido al historial anual.");

  } catch (error) {

    alert("No se pudo añadir el libro.");

  }

};

// MOSTRAR HISTORIAL ANUAL

async function renderYear() {

  const year = Number($("year").value);

  const reads = await getYearlyReads(year);
  books = await getBooks();

  const list = $("yearList");

  list.innerHTML = "";

  let count = 0;

  for (const read of reads) {

    const book = books.find(b => b.id === read.bookId);

    if (!book) continue;

    count++;

    const card = makeElement("article", "", "year-book");

    card.appendChild(
      makeElement("strong", book.title)
    );

    card.appendChild(
      makeElement("p", book.author)
    );

    const remove = makeElement(
      "button",
      "QUITAR DEL AÑO"
    );

    remove.onclick = async () => {

      if (!confirm("¿Quitar este libro de las lecturas del año?")) return;

      await deleteYearlyRead(read.id);

      await renderYear();

    };

    card.appendChild(remove);

    list.appendChild(card);

  }

  $("yearTotal").textContent =
    count + (count === 1 ? " libro registrado" : " libros registrados");

  if (!count) {

    list.appendChild(
      makeElement("p", "Todavía no has añadido lecturas a este año.", "empty")
    );

  }

}

$("year").onchange = renderYear;

// ARRANCAR

init();
