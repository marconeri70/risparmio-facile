let movimenti = JSON.parse(localStorage.getItem("movimenti")) || [];

let stipendio =
Number(localStorage.getItem("stipendio")) || 0;

let obiettivo =
Number(localStorage.getItem("obiettivo")) || 0;

let chart;

const euro = new Intl.NumberFormat("it-IT",{
  style:"currency",
  currency:"EUR"
});

document.getElementById("stipendio").value = stipendio;
document.getElementById("obiettivo").value = obiettivo;

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
    id:Date.now(),
    data,
    descrizione,
    importo,
    categoria
  });

  salvaMovimenti();

  document.getElementById("descrizione").value="";
  document.getElementById("importo").value="";

  aggiornaDashboard();
}

function salvaMovimenti(){
  localStorage.setItem(
    "movimenti",
    JSON.stringify(movimenti)
  );
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
  (risparmio - obiettivo)/4;

  document.getElementById("totEntrate")
  .innerText = euro.format(entrate);

  document.getElementById("totUscite")
  .innerText = euro.format(uscite);

  document.getElementById("totRisparmio")
  .innerText = euro.format(risparmio);

  document.getElementById("budgetSettimanale")
  .innerText = euro.format(
    budgetSettimanale > 0
    ? budgetSettimanale
    : 0
  );

  aggiornaLista();
  aggiornaGrafico();
}

function aggiornaLista(){

  const lista =
  document.getElementById("listaMovimenti");

  lista.innerHTML="";

  movimenti
  .sort((a,b)=>new Date(b.data)-new Date(a.data))
  .forEach(m=>{

    const classe =
    m.importo >=0
    ? "positivo"
    : "negativo";

    lista.innerHTML += `
      <div class="movimento">

        <strong>${m.descrizione}</strong><br>

        <small>
        ${m.categoria}
        •
        ${formattaData(m.data)}
        </small>

        <h3 class="${classe}">
          ${euro.format(m.importo)}
        </h3>

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
      labels:labels,

      datasets:[{
        data:data
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

function importaCSV(){

  const file =
  document.getElementById("csvFile")
  .files[0];

  if(!file){
    alert("Seleziona un file CSV");
    return;
  }

  const reader = new FileReader();

  reader.onload = function(event){

    const testo =
    event.target.result;

    const righe =
    testo.split("\n");

    righe.forEach((riga,index)=>{

      if(index===0)return;

      const colonne =
      riga.split(";");

      if(colonne.length < 3)return;

      const data =
      colonne[0];

      const descrizione =
      colonne[1];

      const importo =
      parseFloat(
        colonne[2]
        .replace(",",".")

      );

      if(isNaN(importo))return;

      const categoria =
      riconosciCategoria(
        descrizione,
        importo
      );

      movimenti.push({
        id:Date.now()+Math.random(),
        data,
        descrizione,
        importo,
        categoria
      });

    });

    salvaMovimenti();
    aggiornaDashboard();

    alert("CSV importato con successo");

  };

  reader.readAsText(file);
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
    d.includes("amazon") ||
    d.includes("paypal")
  ){
    return "Shopping";
  }

  if(
    d.includes("eni") ||
    d.includes("q8") ||
    d.includes("benzina")
  ){
    return "Benzina";
  }

  if(
    d.includes("conad") ||
    d.includes("coop") ||
    d.includes("eurospin")
  ){
    return "Spesa";
  }

  if(
    d.includes("netflix") ||
    d.includes("spotify") ||
    d.includes("dazn")
  ){
    return "Abbonamenti";
  }

  if(
    d.includes("ristorante") ||
    d.includes("bar") ||
    d.includes("pizzeria")
  ){
    return "Ristorante";
  }

  if(
    d.includes("enel") ||
    d.includes("tim") ||
    d.includes("vodafone")
  ){
    return "Bollette";
  }

  return "Altro";
}

function formattaData(data){

  return new Date(data)
  .toLocaleDateString("it-IT");

}

aggiornaDashboard();
