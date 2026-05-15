let movimenti = JSON.parse(localStorage.getItem("movimenti")) || [];

let stipendio = Number(localStorage.getItem("stipendio")) || 0;
let obiettivo = Number(localStorage.getItem("obiettivo")) || 0;

let chart;

const euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR"
});

document.getElementById("stipendio").value = stipendio || "";
document.getElementById("obiettivo").value = obiettivo || "";
document.getElementById("dataMov").valueAsDate = new Date();

function salvaImpostazioni(){

  stipendio = Number(document.getElementById("stipendio").value) || 0;
  obiettivo = Number(document.getElementById("obiettivo").value) || 0;

  localStorage.setItem("stipendio", stipendio);
  localStorage.setItem("obiettivo", obiettivo);

  aggiornaDashboard();
}

function aggiungiMovimento(){

  const data = document.getElementById("dataMov").value;
  const descrizione = document.getElementById("descrizione").value.trim();
  const importo = Number(document.getElementById("importo").value);
  const categoria = document.getElementById("categoria").value;

  if(!descrizione || !importo){
    alert("Inserisci descrizione e importo");
    return;
  }

  movimenti.push({
    id: Date.now() + Math.random(),
    data,
    descrizione,
    importo,
    categoria
  });

  salvaMovimenti();

  document.getElementById("descrizione").value = "";
  document.getElementById("importo").value = "";

  aggiornaDashboard();
}

function importaCSV(){

  const file = document.getElementById("csvFile").files[0];

  if(!file){
    alert("Seleziona un file CSV");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(event){

    const testo = event.target.result;
    const righe = testo.split(/\r?\n/).filter(r => r.trim() !== "");

    let importati = 0;

    righe.forEach((riga, index) => {

      if(index === 0 && /data|descrizione|importo|amount|date/i.test(riga)){
        return;
      }

      const colonne = separaCSV(riga);

      const movimento = creaMovimentoDaColonne(colonne);

      if(movimento){
        movimenti.push(movimento);
        importati++;
      }

    });

    salvaMovimenti();
    aggiornaDashboard();

    alert("CSV importato. Movimenti trovati: " + importati);
  };

  reader.readAsText(file, "UTF-8");
}

function separaCSV(riga){

  const separatore = riga.includes(";") ? ";" : ",";
  const risultato = [];
  let valore = "";
  let dentroVirgolette = false;

  for(let i = 0; i < riga.length; i++){

    const char = riga[i];

    if(char === '"'){
      dentroVirgolette = !dentroVirgolette;
    } else if(char === separatore && !dentroVirgolette){
      risultato.push(pulisciValore(valore));
      valore = "";
    } else {
      valore += char;
    }
  }

  risultato.push(pulisciValore(valore));

  return risultato;
}

function pulisciValore(valore){
  return valore.replace(/^"|"$/g, "").trim();
}

function creaMovimentoDaColonne(colonne){

  if(colonne.length < 2) return null;

  const data = trovaData(colonne) || new Date().toISOString().slice(0,10);
  const importo = trovaImporto(colonne);

  if(importo === null || isNaN(importo)) return null;

  let descrizione = colonne
    .filter(c => c && !sembraData(c) && normalizzaImporto(c) === null)
    .join(" ")
    .trim();

  if(!descrizione){
    descrizione = "Movimento importato";
  }

  const categoria = riconosciCategoria(descrizione, importo);

  return {
    id: Date.now() + Math.random(),
    data,
    descrizione,
    importo,
    categoria
  };
}

function importaPDF(){

  const file = document.getElementById("pdfFile").files[0];

  if(!file){
    alert("Seleziona un file PDF");
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const reader = new FileReader();

  reader.onload = async function(){

    const typedarray = new Uint8Array(this.result);

    try{

      const pdf = await pdfjsLib.getDocument(typedarray).promise;

      let testoCompleto = "";

      for(let i = 1; i <= pdf.numPages; i++){

        const pagina = await pdf.getPage(i);
        const contenuto = await pagina.getTextContent();

        const testoPagina = contenuto.items
          .map(item => item.str)
          .join(" ");

        testoCompleto += testoPagina + "\n";
      }

      analizzaTestoPDF(testoCompleto);

    } catch(error){
      alert("Errore nella lettura del PDF. Il file potrebbe essere una scansione o protetto.");
      console.error(error);
    }
  };

  reader.readAsArrayBuffer(file);
}

function analizzaTestoPDF(testo){

  const righe = testo.split(/(?=\d{2}\/\d{2}\/\d{4})|(?=\d{2}-\d{2}-\d{4})/);

  let importati = 0;

  righe.forEach(riga => {

    riga = riga.trim();

    if(!riga) return;

    const dataMatch = riga.match(/\d{2}[\/-]\d{2}[\/-]\d{4}/);

    const importiMatch = riga.match(/-?\d{1,3}(?:\.\d{3})*,\d{2}/g);

    if(!dataMatch || !importiMatch) return;

    const dataOriginale = dataMatch[0];

    const importoTesto = importiMatch[importiMatch.length - 1];

    const importo = Number(
      importoTesto
        .replace(/\./g, "")
        .replace(",", ".")
    );

    if(isNaN(importo)) return;

    let descrizione = riga
      .replace(dataOriginale, "")
      .replace(importoTesto, "")
      .replace(/\s+/g, " ")
      .trim();

    if(!descrizione){
      descrizione = "Movimento da PDF";
    }

    const categoria = riconosciCategoria(descrizione, importo);

    movimenti.push({
      id: Date.now() + Math.random(),
      data: convertiDataPDF(dataOriginale),
      descrizione,
      importo,
      categoria
    });

    importati++;
  });

  salvaMovimenti();
  aggiornaDashboard();

  alert("PDF importato. Movimenti trovati: " + importati);
}

function trovaData(colonne){

  const valore = colonne.find(sembraData);

  if(!valore) return null;

  if(/\d{4}-\d{2}-\d{2}/.test(valore)){
    return valore;
  }

  const parti = valore.includes("/") ? valore.split("/") : valore.split("-");

  const giorno = parti[0].padStart(2, "0");
  const mese = parti[1].padStart(2, "0");
  const anno = parti[2].length === 2 ? "20" + parti[2] : parti[2];

  return `${anno}-${mese}-${giorno}`;
}

function sembraData(valore){
  return /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/.test(valore) ||
         /\b\d{4}-\d{2}-\d{2}\b/.test(valore);
}

function convertiDataPDF(data){

  const parti = data.includes("/") ? data.split("/") : data.split("-");

  const giorno = parti[0].padStart(2, "0");
  const mese = parti[1].padStart(2, "0");
  const anno = parti[2];

  return `${anno}-${mese}-${giorno}`;
}

function trovaImporto(colonne){

  const numeri = colonne
    .map(normalizzaImporto)
    .filter(v => v !== null && !isNaN(v));

  if(numeri.length === 0) return null;

  return numeri[numeri.length - 1];
}

function normalizzaImporto(valore){

  if(!valore) return null;

  let v = valore
    .replace("€", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  if(!/^-?\d+(\.\d+)?$/.test(v)){
    return null;
  }

  return Number(v);
}

function riconosciCategoria(descrizione, importo){

  const d = descrizione.toLowerCase();

  if(importo > 0) return "Entrate";

  if(/amazon|paypal|zalando|ebay|shopping/.test(d)){
    return "Shopping";
  }

  if(/eni|q8|ip |tamoil|benzina|diesel|carburante|esso/.test(d)){
    return "Benzina";
  }

  if(/conad|coop|eurospin|lidl|md |carrefour|esselunga|supermercato|alimentari/.test(d)){
    return "Spesa";
  }

  if(/netflix|spotify|dazn|sky|disney|prime|abbonamento/.test(d)){
    return "Abbonamenti";
  }

  if(/ristorante|bar |pizzeria|pub|caffe|caffè|glovo|deliveroo|just eat/.test(d)){
    return "Ristorante";
  }

  if(/enel|acea|gas|luce|acqua|bolletta|tim|vodafone|wind|iliad/.test(d)){
    return "Bollette";
  }

  if(/farmacia|parafarmacia|sanitaria/.test(d)){
    return "Farmacia";
  }

  return "Altro";
}

function aggiornaDashboard(){

  const entrateMovimenti = movimenti
    .filter(m => m.importo > 0)
    .reduce((tot, m) => tot + m.importo, 0);

  const entrate = stipendio + entrateMovimenti;

  const uscite = Math.abs(
    movimenti
      .filter(m => m.importo < 0)
      .reduce((tot, m) => tot + m.importo, 0)
  );

  const risparmio = entrate - uscite;

  const budgetSettimanale = Math.max((risparmio - obiettivo) / 4, 0);

  document.getElementById("totEntrate").innerText = euro.format(entrate);
  document.getElementById("totUscite").innerText = euro.format(uscite);
  document.getElementById("totRisparmio").innerText = euro.format(risparmio);
  document.getElementById("budgetSettimanale").innerText = euro.format(budgetSettimanale);

  aggiornaSemaforo(risparmio, entrate, uscite);
  aggiornaLista();
  aggiornaGrafico();
}

function aggiornaSemaforo(risparmio, entrate, uscite){

  const box = document.getElementById("semaforo");
  const titolo = document.getElementById("semaforoTitolo");
  const testo = document.getElementById("semaforoTesto");

  box.className = "card semaforo";

  if(entrate === 0){
    titolo.innerText = "🟢 Situazione buona";
    testo.innerText = "Inserisci i dati o importa un estratto conto.";
    return;
  }

  if(risparmio >= obiettivo){
    titolo.innerText = "🟢 Ottimo andamento";
    testo.innerText = "Stai rispettando il tuo obiettivo di risparmio.";
  } else if(uscite < entrate){
    box.classList.add("warning");
    titolo.innerText = "🟡 Attenzione";
    testo.innerText = "Stai sotto le entrate, ma il risparmio è inferiore all’obiettivo.";
  } else {
    box.classList.add("danger-alert");
    titolo.innerText = "🔴 Budget superato";
    testo.innerText = "Le uscite hanno superato le entrate.";
  }
}

function aggiornaLista(){

  const lista = document.getElementById("listaMovimenti");

  lista.innerHTML = "";

  const ordinati = [...movimenti].sort((a,b) => new Date(b.data) - new Date(a.data));

  ordinati.forEach(m => {

    const classe = m.importo >= 0 ? "positivo" : "negativo";

    lista.innerHTML += `
      <div class="movimento">

        <div>
          <strong>${m.descrizione}</strong><br>
          <small>${m.categoria} • ${formattaData(m.data)}</small>
          <h3 class="${classe}">${euro.format(m.importo)}</h3>
        </div>

        <div>
          <button class="elimina" onclick="eliminaMovimento('${m.id}')">
            Elimina
          </button>
        </div>

      </div>
    `;
  });
}

function aggiornaGrafico(){

  const categorie = {};

  movimenti
    .filter(m => m.importo < 0)
    .forEach(m => {

      if(!categorie[m.categoria]){
        categorie[m.categoria] = 0;
      }

      categorie[m.categoria] += Math.abs(m.importo);
    });

  const labels = Object.keys(categorie);
  const data = Object.values(categorie);

  const ctx = document.getElementById("graficoCategorie");

  if(chart){
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data
      }]
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: "white"
          }
        }
      }
    }
  });
}

function eliminaMovimento(id){

  movimenti = movimenti.filter(m => String(m.id) !== String(id));

  salvaMovimenti();
  aggiornaDashboard();
}

function cancellaTutto(){

  if(!confirm("Vuoi cancellare tutti i movimenti salvati?")){
    return;
  }

  movimenti = [];

  salvaMovimenti();
  aggiornaDashboard();
}

function salvaMovimenti(){
  localStorage.setItem("movimenti", JSON.stringify(movimenti));
}

function formattaData(data){

  if(!data) return "Senza data";

  return new Date(data).toLocaleDateString("it-IT");
}

aggiornaDashboard();
