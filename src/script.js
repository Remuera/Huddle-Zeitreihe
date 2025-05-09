window.onload = function () {
  // Excel-Datei laden (die Datei "Huddle Daten IT SGKB.xlsx" liegt im gleichen Ordner)
  fetch("Huddle Daten IT SGKB.xlsx")
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => {
      // Lese das erste Sheet mit SheetJS (header:1 als Array von Arrays)
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      
      // Überschriften und Datenzeilen
      const header = data[0];
      const rows = data.slice(1);



      // Relevante Spalten (0-basierend):
      // F (Index 5): Zeitpunkt (z.B. "2025_02")
      // G (Index 6): Team
      // H (Index 7): Frage 1 – Stimmung
      // I (Index 8): Frage 2 – AuslastungF
      // J (Index 9): Frage 3 – Veränderungen
      const zeitIndex = 5;
      const teamIndex = 6;
      const questionIndices = [7, 8, 9];
      
      // Erstelle eindeutige Dropdownwerte
      const zeitSet = new Set();
      const teamSet = new Set();
      rows.forEach(row => {
        let zeit = row[zeitIndex].toString().trim();
        let team = row[teamIndex].toString().trim();
        if (zeit !== "") zeitSet.add(zeit);
        if (team !== "") teamSet.add(team);
      });
      const zeiten = Array.from(zeitSet).sort();
      const teams = Array.from(teamSet).sort();
      
      const zeitSelect = document.getElementById("zeitSelect");
      const teamSelect = document.getElementById("teamSelect");

      let lastValueZeit = null; // Variable für den letzten Wert
      let lastValueTeam = null; // Variable für den letzten Wert
      
      zeiten.forEach(z => {
        let option = document.createElement("option");
        option.value = z;
        option.textContent = z;
        zeitSelect.appendChild(option);
        lastValueZeit = z; // Speichert den letzten Wert
      });
      zeitSelect.value = lastValueZeit; // Setzt den letzten Wert als ausgewählte Option
      
      teams.forEach(t => {
        let option = document.createElement("option");
        option.value = t;
        option.textContent = t;
        teamSelect.appendChild(option);
        lastValueTeam = t;
      });
 //     teamSelect.value = lastValueTeam;
      
      // Filterfunktion für aktuelle Kombination
      function filterRows(selectedZeit, selectedTeam) {
        return rows.filter(row =>
          row[zeitIndex].toString().trim() === selectedZeit &&
          row[teamIndex].toString().trim() === selectedTeam
        );
      }
      
      // Gruppierung aller Daten eines Teams über alle Zeiten für den Area Chart (für eine bestimmte Frage)
      function groupTimeDataForQuestion(selectedTeam, qIndex) {
        const teamRows = rows.filter(row => row[teamIndex].toString().trim() === selectedTeam);
        const dataByTime = {};
        teamRows.forEach(row => {
          const zeit = row[zeitIndex].toString().trim();
          const ans = row[qIndex].toString().trim();
          if (zeit !== "") {
            if (!dataByTime[zeit]) dataByTime[zeit] = {};
            dataByTime[zeit][ans] = (dataByTime[zeit][ans] || 0) + 1;
          }
        });
        const sortedTimes = Object.keys(dataByTime).sort();
        return { sortedTimes, dataByTime };
      }
      
      // Definierte Fragen und deren Überschriften
      const questions = [
        { keyIndex: 7, header: header[7] },
        { keyIndex: 8, header: header[8] },
        { keyIndex: 9, header: header[9] }
      ];
      
      // Definiere Farbschemata und Reihenfolgen für die drei Fragen
      function getColorMappingAndOrder(qIndex) {
        if (qIndex === 7) {  // Spalte H – Stimmung
          return {
            mapping: {
              "Sehr gut": "#009E73",       
              "Zufrieden": "#56B4E9",        
              "Unzufrieden": "#CC79A7",      
              "Sehr unzufrieden": "#D55E00"  
            },
            order: ["Sehr gut", "Zufrieden", "Unzufrieden", "Sehr unzufrieden"]
          };
        } else if (qIndex === 8) {  // Spalte I – Auslastung
          return {
            mapping: {
              "Freie Kapazität": "#56B4E9",      
              "Im Rahmen der Arbeitszeit": "#009E73",
              "Leicht erhöht": "#CC79A7",         
              "Hoch": "#D55E00"                   
            },
            order: ["Freie Kapazität", "Im Rahmen der Arbeitszeit", "Leicht erhöht", "Hoch"]
          };
        } else if (qIndex === 9) {  // Spalte J – Veränderungen
          return {
            mapping: {
              "Spielend": "#009E73",         
              "Meist ganz gut": "#56B4E9",   
              "Es ist anstrengend": "#CC79A7"  
            },
            order: ["Spielend", "Meist ganz gut", "Es ist anstrengend"]
          };
        }
      }
      
      // Renderfunktion: Erstelle sowohl die 3 Pie Charts (für die gefilterte Kombination) als auch 3 gestapelte Area Charts (Verlauf über alle Zeiten für das ausgewählte Team)
      function renderCharts() {
        const selectedZeit = zeitSelect.value;
        const selectedTeam = teamSelect.value;
        const filtered = filterRows(selectedZeit, selectedTeam);
        
        // Aktualisiere den Gesamttitel
        const overallTitle = document.getElementById("overallTitle");
        overallTitle.textContent = selectedTeam + " " + selectedZeit;
        
        // Leere die Chart-Container
        document.getElementById("pieCharts").innerHTML = "";
        document.getElementById("areaCharts").innerHTML = "";
        
        // Für jede Frage
        questions.forEach(q => {
          const { mapping, order } = getColorMappingAndOrder(q.keyIndex);
          
          // --- Pie Chart ---
          // Berechne Häufigkeiten in den gefilterten Zeilen
          const counts = {};
          filtered.forEach(row => {
            const ans = row[q.keyIndex].toString().trim();
            if (ans !== "") {
              counts[ans] = (counts[ans] || 0) + 1;
            }
          });
          const pieLabels = Object.keys(counts);
          const pieData = Object.values(counts);
          const totalPie = pieData.reduce((sum, val) => sum + val, 0);
          
          // Erzeuge ein Array mit benutzerdefinierten Farben – anhand der Antwort
          const customColors = pieLabels.map(label => mapping[label] || "#888888");
          const pieWrapper = document.createElement("div");
          pieWrapper.className = "chart-wrapper";
          const pieCanvas = document.createElement("canvas");
          pieWrapper.appendChild(pieCanvas);
          document.getElementById("pieCharts").appendChild(pieWrapper);
          
          new Chart(pieCanvas, {
            type: "pie",
            data: {
              labels: pieLabels,
              datasets: [{
                data: pieData,
                backgroundColor: customColors
              }]
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: selectedTeam + " " + selectedZeit + " – " + q.header,
                  font: { size: 18 }
                },
                legend: { position: "bottom" },
                datalabels: {
                  formatter: (value) => {
                    let perc = ((value / totalPie) * 100).toFixed(1);
                    return perc + "%";
                  },
                  color: "#fff",
                  font: { weight: "bold", size: 14 }
                }
              }
            },
            plugins: [ChartDataLabels]
          });
          
          // --- Area Chart (100% gestapelt) ---
          // Gruppiere alle Daten für das ausgewählte Team (ohne Zeitfilter)
          const { sortedTimes, dataByTime } = groupTimeDataForQuestion(selectedTeam, q.keyIndex);
          // Erzeuge Datensätze in der gewünschten Reihenfolge (order)
          const areaDatasets = order.map(option => {
            let dataArray = sortedTimes.map(zeit => {
              const cnt = dataByTime[zeit][option] || 0;
              // Berechne Summe aller Antworten für diesen Zeitpunkt
              const total = Object.values(dataByTime[zeit]).reduce((a, b) => a + b, 0);
              return total > 0 ? (cnt / total * 100).toFixed(1) : 0;
            });
            return {
              label: option,
              data: dataArray,
              backgroundColor: mapping[option],
              borderColor: mapping[option],
              fill: true,
              tension: 0.3
            };
          });
          
          const areaWrapper = document.createElement("div");
          areaWrapper.className = "chart-wrapper area-chart";
          const areaCanvas = document.createElement("canvas");
          areaWrapper.appendChild(areaCanvas);
          document.getElementById("areaCharts").appendChild(areaWrapper);
          
          new Chart(areaCanvas, {
            type: "line",
            data: {
              labels: sortedTimes,
              datasets: areaDatasets
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: "Entwicklung (" + q.header + ")",
                  font: { size: 18 }
                },
                legend: { position: "bottom" },
                tooltip: {
                  mode: 'index',
                  intersect: false
                }
              },
              interaction: {
                mode: 'index',
                intersect: false
              },
              scales: {
                x: {
                //  title: { display: true, text: "Zeitpunkt" },
                  stacked: true
                },
                y: {
                  title: { display: true, text: "Prozent" },
                  min: 0,
                  max: 100,
                  stacked: true
                }
              }
            }
          });
        });

            // --- Kommentare: Container leeren und Tabelle neu erstellen ---
            const commentsContainer = document.getElementById("commentsTable");
            commentsContainer.innerHTML = ""; // Vorherige Inhalte entfernen

            // Filtere nur Zeilen, bei denen Spalte K (Index 10) nicht leer ist
            const commentRows = filtered.filter(row => row[10].toString().trim() !== "");

            if (commentRows.length > 0) {
            // Überschrift "Kommentare" einfügen
            const commentsTitle = document.createElement("h3");
            commentsTitle.textContent = "Kommentare";
            commentsContainer.appendChild(commentsTitle);

              // Tabelle erstellen
const table = document.createElement("table");
table.style.borderCollapse = "collapse"; // Sorgt für einzelne, nicht doppelte Ränder
table.style.width = "100%"; // Optional: volle Breite

// Tabellenkopf
const thead = document.createElement("thead");
const headerRow = document.createElement("tr");

const thTeam = document.createElement("th");
thTeam.textContent = "Team";
thTeam.style.textAlign = "left";
thTeam.style.border = "1px solid black";  // Rahmen hinzufügen
thTeam.style.padding = "4px";               // Etwas Innenabstand

const thComment = document.createElement("th");
thComment.textContent = "Kommentare";
thComment.style.textAlign = "left";
thComment.style.border = "1px solid black";
thComment.style.padding = "4px";

headerRow.appendChild(thTeam);
headerRow.appendChild(thComment);
thead.appendChild(headerRow);
table.appendChild(thead);

// Tabellenteil
const tbody = document.createElement("tbody");
commentRows.forEach(row => {
    const tr = document.createElement("tr");
    
    const tdTeam = document.createElement("td");
    // Teamname plus 4 Nicht-Brechende Leerzeichen
    tdTeam.textContent = row[6].toString().trim() + "\u00A0\u00A0\u00A0\u00A0";
    tdTeam.style.border = "1px solid black";
    tdTeam.style.padding = "4px";
    
    const tdComment = document.createElement("td");
    tdComment.textContent = row[10].toString().trim();
    tdComment.style.textAlign = "left"; // Kommentare linksbündig
    tdComment.style.border = "1px solid black";
    tdComment.style.padding = "4px";

    tr.appendChild(tdTeam);
    tr.appendChild(tdComment);
    tbody.appendChild(tr);
});
table.appendChild(tbody);
commentsContainer.appendChild(table);

            }

      } // Ende renderCharts
      
      // Initiale Darstellung: Verwende die jeweils ersten Einträge beider Menüs
      renderCharts();
      
      // Neu rendern bei Änderung der Dropdowns
      zeitSelect.addEventListener("change", renderCharts);
      teamSelect.addEventListener("change", renderCharts);
      
    })
    .catch(error => console.error("Fehler beim Laden der Excel-Daten:", error));
};
