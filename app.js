let spese = JSON.parse(localStorage.getItem("spese")) || [];
let stipendio = Number(localStorage.getItem("stipendio")) || 0;

const budgetValue = document.getElementById("budgetValue");
const listaSpese = document.getElementById("listaSpese");

function salvaStipendio() {
  stipendio = Number(document.getElementById("stipendio").value);

  localStorage.setItem("stipendio", stipendio);

  aggiornaDashboard();
}

function aggiungiSpesa() {
  const descrizione = document.getElementById("descrizione").value;
  const importo = Number(document.getElementById("importo").value);
  const categoria = document.getElementById("categoria").value;

  const nuovaSpesa = {
    descrizione,
    importo,
    categoria
  };

  spese.push(nuovaSpesa);

  localStorage.setItem("spese", JSON.stringify(spese));

  aggiornaDashboard();
}

function aggiornaDashboard() {

  const totaleSpese = spese.reduce((tot, s) => tot + s.importo, 0);

  const budget = stipendio - totaleSpese;

  budgetValue.innerText = budget.toFixed(2) + " €";

  listaSpese.innerHTML = "";

  spese.forEach(spesa => {

    listaSpese.innerHTML += `
      <div class="spesa-item">
        <strong>${spesa.descrizione}</strong><br>
        ${spesa.categoria} - ${spesa.importo} €
      </div>
    `;
  });

  aggiornaGrafico();
}

let chart;

function aggiornaGrafico() {

  const categorie = {};

  spese.forEach(spesa => {

    if (!categorie[spesa.categoria]) {
      categorie[spesa.categoria] = 0;
    }

    categorie[spesa.categoria] += spesa.importo;
  });

  const labels = Object.keys(categorie);
  const data = Object.values(categorie);

  const ctx = document.getElementById("grafico");

  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data
      }]
    }
  });
}

aggiornaDashboard();
