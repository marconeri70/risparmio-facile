let movimenti =
JSON.parse(localStorage.getItem("movimenti")) || [];

let stipendio =
Number(localStorage.getItem("stipendio")) || 0;

let obiettivo =
Number(localStorage.getItem("obiettivo")) || 0;

let chart;

const euro = new Intl.NumberFormat("it-IT",{
  style:"currency",
  currency:"EUR"
});

document.getElementById("stipendio").value =
stipendio || "";

document.getElementById("obiettivo").value =
obiettivo || "";

document.getElementById("dataMov").valueAsDate =
new Date();

function salvaImpostazioni(){

  stipendio =
  Number(document.getElementById("stipendio").value);

  obiettivo =
  Number(document.getElementById("obiettivo").value);

  localStorage.setItem("stipendio",stipendio);
  localStorage.setItem("obiettivo",obiettivo);

  aggiornaDashboard();
}

function salvaMovimenti(){

  localStorage.setItem(
    "movimenti",
    JSON.stringify(movimenti)
  );
}

function aggiungiMovimento(){

  const data =
  document.getElementById("dataMov").value;

  const descrizione =
  document.getElementById("descrizione").value;

  const importo =
  Number(document.getElementById("importo").value);

  const categoria =
  document.getElementById("categoria").value;

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

  aggiornaDashboard();

  document.getElementById("descrizione").value="";
  document.getElementById("importo").value="";
}

async function importaPDF(){

  const file =
  document.getElementById("pdfFile").files[0];

  if(!file){

    alert("Seleziona un PDF");
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const reader = new FileReader();

  reader.onload = async function(){

    const typedarray =
    new Uint8Array(this.result);

    try{

      const pdf =
      await pdfjsLib
      .getDocument(typedarray)
      .promise;

      let testo = "";

      for(let i=1;i<=pdf.numPages;i++){

        const pagina =
        await pdf.getPage(i);

        const contenuto =
        await pagina.getTextContent();

        testo +=
        contenuto.items
        .map(item=>item.str)
        .join(" ");

        testo += "\n";
      }

      analizzaPDFfineco(testo);

    }catch(error){

      console.error(error);

      alert(
        "Errore lettura PDF"
      );
    }

  };

  reader.readAsArrayBuffer(file);
}

function analizzaPDFfineco(testo){

  const regexMovimento =
  /(\d{2}\.\d{2}\.\d{2})\s+(\d{2}\.\d{2}\.\d{2})\s+([\d\.,]+)\s+(.+?)(?=\d{2}\.\d{2}\.\d{2}\s+\d{2}\.\d{2}\.\d{2}\s+[\d\.,]+|Saldo finale|PAGINA|$)/gs;

  const matches =
  [...testo.matchAll(regexMovimento)];

  let importati = 0;

  matches.forEach(match=>{

    const dataOperazione =
    match[1];

    const importoTesto =
    match[3];

    let descrizione =
    match[4]
    .replace(/\s+/g," ")
    .trim();

    let importo =
    Number(
      importoTesto
      .replace(/\./g,"")
      .replace(",",".")
    );

    if(isNaN(importo)) return;

    const descrizioneLower =
    descrizione.toLowerCase();

    let entrata = false;

    if(
      descrizioneLower.includes("stipendio") ||
      descrizioneLower.includes("ord: inps") ||
      descrizioneLower.includes("sconto canone") ||
      descrizioneLower.includes("ben:") ||
      descrizioneLower.includes("bonifico") ||
      descrizioneLower.includes("accredito")
    ){
      entrata = true;
    }

    if(!entrata){
      importo = -Math.abs(importo);
    }

    const categoria =
    riconosciCategoria(
      descrizione,
      importo
    );

    movimenti.push({

      id: Date.now() + Math.random(),

      data:
      convertiData(dataOperazione),

      descrizione,

      importo,

      categoria
    });

    importati++;

  });

  salvaMovimenti();

  aggiornaDashboard();

  alert(
    "Movimenti importati: " +
    importati
  );
}

function convertiData(data){

  const parti =
  data.split(".");

  return `20${parti[2]}-${parti[1]}-${parti[0]}`;
}

function riconosciCategoria(
  descrizione,
  importo
){

  const d =
  descrizione.toLowerCase();

  if(importo > 0)
  return "Entrate";

  if(
    d.includes("conad") ||
    d.includes("supermercato") ||
    d.includes("deco") ||
    d.includes("angione")
  ){
    return "Spesa";
  }

  if(
    d.includes("eni") ||
    d.includes("ip ") ||
    d.includes("benzina") ||
    d.includes("carburante")
  ){
    return "Benzina";
  }

  if(
    d.includes("paypal") ||
    d.includes("amazon") ||
    d.includes("zalando")
  ){
    return "Shopping";
  }

  if(
    d.includes("fastweb") ||
    d.includes("vodafone") ||
    d.includes("canone") ||
    d.includes("enel")
  ){
    return "Bollette";
  }

  if(
    d.includes("farmacia")
  ){
    return "Farmacia";
  }

  if(
    d.includes("ristorante") ||
    d.includes("pizzeria") ||
    d.includes("bar") ||
    d.includes("mcdonald")
  ){
    return "Ristorante";
  }

  if(
    d.includes("spotify") ||
    d.includes("netflix") ||
    d.includes("prime") ||
    d.includes("xbox")
  ){
    return "Abbonamenti";
  }

  return "Altro";
}

function aggiornaDashboard(){

  const entrate =
  stipendio +
  movimenti
  .filter(m=>m.importo>0)
  .reduce((tot,m)=>tot+m.importo,0);

  const uscite =
  Math.abs(
    movimenti
    .filter(m=>m.importo<0)
    .reduce((tot,m)=>tot+m.importo,0)
  );

  const risparmio =
  entrate - uscite;

  const budgetSettimanale =
  Math.max(
    (risparmio-obiettivo)/4,
    0
  );

  document.getElementById("totEntrate")
  .innerText =
  euro.format(entrate);

  document.getElementById("totUscite")
  .innerText =
  euro.format(uscite);

  document.getElementById("totRisparmio")
  .innerText =
  euro.format(risparmio);

  document.getElementById("budgetSettimanale")
  .innerText =
  euro.format(budgetSettimanale);

  aggiornaSemaforo(
    risparmio,
    entrate,
    uscite
  );

  aggiornaLista();

  aggiornaGrafico();
}

function aggiornaSemaforo(
  risparmio,
  entrate,
  uscite
){

  const titolo =
  document.getElementById("semaforoTitolo");

  const testo =
  document.getElementById("semaforoTesto");

  if(uscite > entrate){

    titolo.innerText =
    "🔴 Budget superato";

    testo.innerText =
    "Le uscite hanno superato le entrate.";

  }else if(risparmio < obiettivo){

    titolo.innerText =
    "🟡 Attenzione";

    testo.innerText =
    "Risparmio inferiore all'obiettivo.";

  }else{

    titolo.innerText =
    "🟢 Ottimo andamento";

    testo.innerText =
    "Stai rispettando il budget.";
  }
}

function aggiornaLista(){

  const lista =
  document.getElementById("listaMovimenti");

  lista.innerHTML="";

  const ordinati =
  [...movimenti]
  .sort((a,b)=>
    new Date(b.data)-new Date(a.data)
  );

  ordinati.forEach(m=>{

    const classe =
    m.importo>=0
    ? "positivo"
    : "negativo";

    lista.innerHTML += `

      <div class="movimento">

        <div>

          <strong>
            ${m.descrizione}
          </strong>

          <br>

          <small>
            ${m.categoria}
            •
            ${formattaData(m.data)}
          </small>

          <h3 class="${classe}">
            ${euro.format(m.importo)}
          </h3>

        </div>

        <div>

          <button
            class="elimina"
            onclick="eliminaMovimento('${m.id}')"
          >
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
  .filter(m=>m.importo<0)
  .forEach(m=>{

    if(!categorie[m.categoria]){

      categorie[m.categoria]=0;
    }

    categorie[m.categoria] +=
    Math.abs(m.importo);

  });

  const labels =
  Object.keys(categorie);

  const data =
  Object.values(categorie);

  const ctx =
  document.getElementById("graficoCategorie");

  if(chart){

    chart.destroy();
  }

  chart = new Chart(ctx,{

    type:"doughnut",

    data:{
      labels,

      datasets:[{
        data
      }]
    },

    options:{
      plugins:{
        legend:{
          labels:{
            color:"white"
          }
        }
      }
    }

  });
}

function eliminaMovimento(id){

  movimenti =
  movimenti.filter(
    m=>String(m.id)!==String(id)
  );

  salvaMovimenti();

  aggiornaDashboard();
}

function cancellaTutto(){

  if(
    !confirm(
      "Vuoi cancellare tutti i movimenti?"
    )
  ) return;

  movimenti=[];

  salvaMovimenti();

  aggiornaDashboard();
}

function formattaData(data){

  return new Date(data)
  .toLocaleDateString("it-IT");
}

aggiornaDashboard();
