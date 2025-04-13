document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFKlZunWd5cvnNdtERuUWEu5CXiq-csMPECnyzBjoC7UO8QDZHQHI9OwPOKizwclFX/exec';
    const INITIAL_DAYS_TO_LOAD = 7;
    // ---------------------

    // --- Elementos del DOM ---
    const form = document.getElementById('workout-form');
    const exerciseSelect = document.getElementById('exercise');
    const customExerciseGroup = document.getElementById('custom-exercise-group');
    const customExerciseInput = document.getElementById('custom-exercise-name');
    const setsInput = document.getElementById('sets');
    const setsInputsContainer = document.getElementById('sets-inputs');
    const historyLog = document.getElementById('history-log');
    // MODIFICADO: Selector más robusto para el título del historial
    const historyTitleElement = document.querySelector('#history-filter + h2'); // Asume que H2 está justo después del filtro
    const submitButton = form.querySelector('button[type="submit"]');
    const filterDateInput = document.getElementById('filter-date');
    const clearFilterBtn = document.getElementById('clear-filter-btn');
    const graphSection = document.getElementById('progress-section');
    const graphExerciseSelect = document.getElementById('graph-exercise-select');
    const showGraphBtn = document.getElementById('show-graph-btn');
    const hideGraphBtn = document.getElementById('hide-graph-btn');
    const graphContainer = document.getElementById('graph-container');
    const chartCanvas = document.getElementById('progress-chart').getContext('2d');

    // --- Variables Globales ---
    let initiallyLoadedData = [];
    let loadedDatesSet = new Set();
    let progressChartInstance = null;
    const baseHistoryTitle = "Historial de Entrenamientos"; // Guardar título base

    // --- Event Listeners ---
    exerciseSelect.addEventListener('change', handleExerciseChange); // <-- MODIFICADO
    setsInput.addEventListener('change', handleSetsChange);       // <-- MODIFICADO
    form.addEventListener('submit', handleFormSubmit);
    filterDateInput.addEventListener('change', handleFilterChange);
    clearFilterBtn.addEventListener('click', handleClearFilter);
    graphExerciseSelect.addEventListener('change', handleGraphExerciseSelectChange);
    showGraphBtn.addEventListener('click', displayExerciseProgressGraph);
    hideGraphBtn.addEventListener('click', hideProgressGraph);


    // --- Funciones del Formulario y Series ---

    // MODIFICADO: Llama a prefillFormWithLastWorkout al seleccionar un ejercicio
    function handleExerciseChange() {
        const selectedValue = exerciseSelect.value;

        if (selectedValue === 'custom') {
            customExerciseGroup.style.display = 'block';
            customExerciseInput.required = true;
            // Limpiar series al elegir custom
            generateSetsInputs(0, false);
        } else {
            customExerciseGroup.style.display = 'none';
            customExerciseInput.required = false;
            customExerciseInput.value = '';

            if (selectedValue) {
                // Intentar pre-rellenar si es un ejercicio válido
                // Asegurarse de que initiallyLoadedData existe y tiene elementos
                if (initiallyLoadedData && initiallyLoadedData.length > 0) {
                    prefillFormWithLastWorkout(selectedValue);
                } else {
                    // Si no hay datos cargados aún, limpiar para evitar errores
                    generateSetsInputs(0, false);
                }
            } else {
                // Limpiar series si se vuelve a "-- Selecciona --"
                generateSetsInputs(0, false);
            }
        }
    }

    // MODIFICADO: Llama a generateSetsInputs SIN intentar pre-rellenar
    function handleSetsChange() {
        const numSets = parseInt(setsInput.value) || 0;
        // Generar inputs, pero SIN pre-rellenar placeholders (acción manual)
        generateSetsInputs(numSets, false);
    }

    // MODIFICADO: Acepta flag y datos para pre-rellenar placeholders
    function generateSetsInputs(numberOfSets, shouldPrefillPlaceholders = false, lastWorkoutData = null) {
        setsInputsContainer.innerHTML = ''; // Limpiar siempre

        // Permitir 0 para limpiar, pero asegurarse de que no sea negativo
        const setsToGenerate = Math.max(0, numberOfSets);

        if (setsToGenerate > 0 && setsToGenerate <= 20) {
            for (let i = 1; i <= setsToGenerate; i++) {
                addSingleSetInput(i);
            }
            // Si se debe pre-rellenar Y tenemos datos válidos, llamar a la función que lo hace
            if (shouldPrefillPlaceholders && lastWorkoutData && lastWorkoutData.sets) {
                // Usar setTimeout para asegurar que el DOM está actualizado
                setTimeout(() => updatePlaceholders(lastWorkoutData), 0);
            }
        } else if (setsToGenerate > 20) {
            setsInputsContainer.innerHTML = '<p style="color:red;">Demasiadas series...</p>';
            // No añadir botón + si hay error
             if (document.getElementById('add-set-button')) {
                 document.getElementById('add-set-button').remove(); // Quitar botón si existe
             }
             updateSetNumbers(); // Actualizar contador aunque haya error
            return;
        }
        // Si numberOfSets es 0 o inválido (después del Math.max), el bucle no se ejecuta
        // y el contenedor queda limpio.

        addAddSetButton(); // Añadir botón + si no hay error de max series
        updateSetNumbers(); // Actualizar contador visualmente
    }

    // SIN CAMBIOS
    function addSingleSetInput(setNumber) {
        const setGroup = document.createElement('div'); setGroup.classList.add('set-group');
        setGroup.innerHTML = `<strong>Serie ${setNumber}:</strong> <label for="reps-set-${setNumber}">Reps:</label> <input type="number" id="reps-set-${setNumber}" name="reps-set-${setNumber}" min="0" required> <label for="weight-set-${setNumber}">Peso (kg):</label> <input type="number" id="weight-set-${setNumber}" name="weight-set-${setNumber}" min="0" step="0.1" required> <button type="button" class="remove-set-btn" onclick="removeSetInput(this)" title="Quitar serie">X</button>`;
        const addButton = document.getElementById('add-set-button');
        if (addButton) { setsInputsContainer.insertBefore(setGroup, addButton); } else { setsInputsContainer.appendChild(setGroup); }
    }

    // SIN CAMBIOS
    function addAddSetButton() {
        if (!document.getElementById('add-set-button')) { const addButton = document.createElement('button'); addButton.type = 'button'; addButton.id = 'add-set-button'; addButton.innerHTML = `<i class="fas fa-plus"></i> Añadir Serie`; addButton.onclick = addSetInput; setsInputsContainer.appendChild(addButton); }
     }

    // SIN CAMBIOS
    window.addSetInput = function() {
        const currentSets = setsInputsContainer.querySelectorAll('.set-group').length; const nextSetNumber = currentSets + 1;
        if (nextSetNumber > 20) { alert("Máximo 20 series."); return; }
        addSingleSetInput(nextSetNumber); updateSetNumbers();
     }

    // SIN CAMBIOS
    window.removeSetInput = function(button) { button.closest('.set-group').remove(); updateSetNumbers(); }

    // MODIFICADO: Asegura que value >= 0
    function updateSetNumbers() {
        const setGroups = setsInputsContainer.querySelectorAll('.set-group');
        const currentNumSets = setGroups.length;
        setGroups.forEach((group, index) => { const setNumber = index + 1; group.querySelector('strong').textContent = `Serie ${setNumber}:`; group.querySelector('label[for^="reps-set"]').setAttribute('for', `reps-set-${setNumber}`); group.querySelector('input[id^="reps-set"]').id = `reps-set-${setNumber}`; group.querySelector('input[id^="reps-set"]').name = `reps-set-${setNumber}`; group.querySelector('label[for^="weight-set"]').setAttribute('for', `weight-set-${setNumber}`); group.querySelector('input[id^="weight-set"]').id = `weight-set-${setNumber}`; group.querySelector('input[id^="weight-set"]').name = `weight-set-${setNumber}`; });
        // Actualizar el input numérico, asegurando que no sea negativo
        setsInput.value = currentNumSets >= 0 ? currentNumSets : '';
     }

     // --- NUEVAS Funciones para Pre-rellenar ---

     /** Busca el último workout para un ejercicio en los datos cargados inicialmente */
    function findLastWorkoutForExercise(exerciseName) {
        console.log(`Buscando en datos locales (${initiallyLoadedData.length} registros) para: ${exerciseName}`);
        // Iterar en orden inverso (asumiendo que initiallyLoadedData está ordenado ASC por fecha después de procesar)
        // O simplemente usar find si asumimos que el backend devuelve el más reciente primero dentro de los últimos días.
        // Vamos a usar find asumiendo que el backend ordena bien.
        return initiallyLoadedData.find(entry => entry.exercise === exerciseName) || null;
    }

    /** Intenta pre-rellenar el formulario basado en el último workout encontrado */
    function prefillFormWithLastWorkout(exerciseName) {
        const lastWorkout = findLastWorkoutForExercise(exerciseName);

        if (lastWorkout && lastWorkout.sets && lastWorkout.sets.length > 0) {
            console.log("Último entreno local encontrado:", lastWorkout);
            const numberOfSets = lastWorkout.sets.length;
            setsInput.value = numberOfSets;
            // Generar inputs Y pasar datos para placeholders
            generateSetsInputs(numberOfSets, true, lastWorkout);
        } else {
            console.log("No se encontró entreno local reciente para este ejercicio.");
            // Limpiar si no se encuentra
            setsInput.value = ''; // Limpiar input de número de series
            generateSetsInputs(0, false); // Limpiar contenedor y añadir botón "+"
        }
    }

    /** Actualiza los placeholders de los inputs de series con datos previos */
    function updatePlaceholders(lastWorkoutData) {
        console.log("Actualizando placeholders con:", lastWorkoutData);
        lastWorkoutData.sets.forEach((setInfo) => {
            // El número de serie viene en setInfo.set
            const setNumber = setInfo.set;
            // Validar que setNumber es un número útil
             if (typeof setNumber !== 'number' || setNumber <= 0) {
                 console.warn("Saltando set con número inválido:", setInfo);
                 return; // Saltar esta iteración si setNumber no es válido
             }

            const repsInput = document.getElementById(`reps-set-${setNumber}`);
            const weightInput = document.getElementById(`weight-set-${setNumber}`);

            if (repsInput) {
                repsInput.placeholder = setInfo.reps !== undefined ? setInfo.reps : ''; // Asignar al placeholder
                repsInput.value = ''; // Asegurarse de que el valor esté vacío
                 console.log(`Placeholder reps S${setNumber}: ${repsInput.placeholder}`);
            } else {
                 console.warn(`Input de reps no encontrado para set ${setNumber}`);
            }
            if (weightInput) {
                weightInput.placeholder = setInfo.weight !== undefined ? setInfo.weight : ''; // Asignar al placeholder
                weightInput.value = ''; // Asegurarse de que el valor esté vacío
                 console.log(`Placeholder peso S${setNumber}: ${weightInput.placeholder}`);
            } else {
                 console.warn(`Input de peso no encontrado para set ${setNumber}`);
            }
        });
    }
    // --- FIN Funciones Pre-rellenar ---


    // --- Función de Guardado (SIN CAMBIOS) ---
    async function handleFormSubmit(event) { /* ... sin cambios ... */
        event.preventDefault(); if (!SCRIPT_URL) { alert("URL script no configurada."); return; } const exerciseName = exerciseSelect.value === 'custom' ? customExerciseInput.value.trim() : exerciseSelect.value; const setGroups = setsInputsContainer.querySelectorAll('.set-group'); const numberOfSets = setGroups.length; const setsData = []; if (!exerciseName) { alert("Selecciona o introduce un ejercicio."); return; } if (numberOfSets === 0) { alert("Añade al menos una serie."); return; } let formIsValid = true; for (let i = 0; i < numberOfSets; i++) { const setGroup = setGroups[i]; const setNumber = i + 1; const repsInput = setGroup.querySelector(`input[id^="reps-set"]`); const weightInput = setGroup.querySelector(`input[id^="weight-set"]`); if (!repsInput || !weightInput || repsInput.value === '' || weightInput.value === '') { alert(`Completa Reps y Peso para la Serie ${setNumber}.`); formIsValid = false; break; } setsData.push({ set: setNumber, reps: parseInt(repsInput.value), weight: parseFloat(weightInput.value) }); } if (!formIsValid) { return; } const workoutEntry = { exercise: exerciseName, sets: setsData }; setLoading(true, 'Guardando...'); try { const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'save', data: workoutEntry }) }); const result = await response.json(); if (result.status === 'success') { alert('¡Guardado!'); form.reset(); customExerciseGroup.style.display = 'none'; setsInputsContainer.innerHTML = ''; addAddSetButton(); setsInput.value = ''; loadInitialHistory(); } else { console.error('Error script:', result.message); alert(`Error: ${result.message}`); } } catch (error) { console.error('Error fetch:', error); alert(`Error conexión: ${error.message}.`); } finally { setLoading(false); }
     }

    // --- Funciones de Carga y Filtro Historial ---

    // SIN CAMBIOS
    async function fetchHistoryData(specificDate = null) {
        if (!SCRIPT_URL) { console.error("URL script no configurada."); return { status: "error", message: "URL script no configurada." }; }
        let fetchUrl = SCRIPT_URL + (specificDate ? `?load=specific&date=${specificDate}` : `?load=recent&days=${INITIAL_DAYS_TO_LOAD}`);
        console.log("Fetching:", fetchUrl); try { const response = await fetch(fetchUrl, { method: 'GET', mode: 'cors' }); const result = await response.json(); console.log("Received:", result); return result; } catch (error) { console.error('Error fetch historial:', error); return { status: "error", message: `Error conexión: ${error.message}` }; }
     }

    // MODIFICADA: Para mostrar contador de días y manejar posible H2 nulo
    async function loadInitialHistory() {
        historyLog.innerHTML = '<p>Cargando historial reciente...</p>';
        filterDateInput.value = '';
        hideProgressGraph();
        // Asegurarse de que historyTitleElement existe antes de usarlo
        if (historyTitleElement) {
            historyTitleElement.textContent = baseHistoryTitle + '...'; // Indicar carga
        }

        const result = await fetchHistoryData();

        if (result.status === 'success') {
            initiallyLoadedData = result.data || []; // Asegurar que sea un array
            loadedDatesSet.clear();
            initiallyLoadedData.forEach(entry => {
                 // Añadir validación de timestamp antes de crear Date
                 if (entry.timestamp && typeof entry.timestamp === 'number') {
                    const dateStr = new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    loadedDatesSet.add(dateStr);
                 } else {
                     console.warn("Entrada sin timestamp válido:", entry);
                 }
            });
            console.log("Fechas iniciales cargadas:", loadedDatesSet);

            // Mostrar contador si viene del backend
            if (historyTitleElement) {
                 if (result.totalWorkoutDays !== undefined && result.totalWorkoutDays !== null) {
                    historyTitleElement.textContent = `${baseHistoryTitle} (Total: ${result.totalWorkoutDays} días)`;
                 } else {
                    historyTitleElement.textContent = baseHistoryTitle; // Si no viene, mostrar título base
                 }
            }

            displayGroupedHistory(initiallyLoadedData);
            populateGraphExerciseSelect(initiallyLoadedData);
        } else {
            historyLog.innerHTML = `<p style="color:red;">${result.message || 'Error desconocido al cargar historial.'}</p>`;
            initiallyLoadedData = [];
            loadedDatesSet.clear();
            populateGraphExerciseSelect([]);
            if (historyTitleElement) { historyTitleElement.textContent = baseHistoryTitle; } // Resetear título en error
        }
    }

    // MODIFICADA: Para actualizar el título al cargar fecha específica y manejar H2 nulo
    async function loadSpecificDateHistory(dateYYYYMMDD) {
         historyLog.innerHTML = `<p>Cargando datos para ${dateYYYYMMDD}...</p>`;
         hideProgressGraph();
         const result = await fetchHistoryData(dateYYYYMMDD);
         if (result.status === 'success') {
             displayGroupedHistory(result.data);
             // Actualizar título para indicar que se muestra fecha específica
              if (historyTitleElement) {
                  try {
                       const dateObj = new Date(dateYYYYMMDD + 'T00:00:00'); // Asumir UTC para evitar problemas de un día más/menos
                       const displayDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                       historyTitleElement.textContent = `Historial para ${displayDate}`;
                  } catch (e) {
                       historyTitleElement.textContent = `Historial para ${dateYYYYMMDD}`; // Fallback si la fecha no es válida
                  }
              }
         } else {
             historyLog.innerHTML = `<p style="color:red;">${result.message || 'Error desconocido.'}</p>`;
             if (historyTitleElement) historyTitleElement.textContent = baseHistoryTitle; // Resetear en error
         }
     }

     // MODIFICADA: Añadidas validaciones para datos potencialmente incompletos
    function displayGroupedHistory(historyData) {
        historyLog.innerHTML = '';
        if (!historyData || historyData.length === 0) { historyLog.innerHTML = filterDateInput.value ? `<p>No hay registros para ${filterDateInput.value}.</p>` : '<p>No hay registros recientes.</p>'; return; }
        const groupedByDate = historyData.reduce((acc, entry) => {
             // Validar existencia de timestamp y formato de fecha
             if (!entry || !entry.timestamp || typeof entry.timestamp !== 'number') {
                 console.warn("Saltando entrada sin timestamp válido:", entry);
                 return acc;
             }
             let dateStr;
             try {
                dateStr = new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
             } catch (e) {
                 console.warn("Error formateando fecha para entrada:", entry, e);
                 return acc; // Saltar si la fecha no es válida
             }

             if (!acc[dateStr]) acc[dateStr] = [];
             acc[dateStr].push(entry);
             return acc;
         }, {});
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => { const [dA, mA, yA] = a.split('/').map(Number); const [dB, mB, yB] = b.split('/').map(Number); return new Date(yB, mB - 1, dB) - new Date(yA, mA - 1, dA); });
        sortedDates.forEach(date => { const dateHeading = document.createElement('h2'); dateHeading.classList.add('history-date-header'); dateHeading.innerHTML = `<i class="fas fa-calendar-alt"></i> ${date}`; historyLog.appendChild(dateHeading); const entries = groupedByDate[date]; entries.forEach(entry => { const entryDiv = document.createElement('div'); entryDiv.classList.add('history-entry'); let setsHTML = (entry.sets || []).sort((a, b) => (a.set || 0) - (b.set || 0)).map(s => `<li class="history-set-item">Serie ${s.set || '?'}: <strong>${s.reps || 0}</strong> reps → <strong>${s.weight || 0}</strong> kg</li>`).join(''); entryDiv.innerHTML = `<h3 class="history-exercise-title"><i class="fas fa-dumbbell"></i> ${entry.exercise || 'Ejercicio Desconocido'}</h3><ul class="history-sets-list">${setsHTML}</ul><div class="history-entry-actions"><button class="button-delete" onclick="deleteEntry('${entry.id || ''}')"><i class="fas fa-trash-alt"></i> Eliminar</button><button class="button-edit" disabled onclick="editEntry('${entry.id || ''}')"><i class="fas fa-pencil-alt"></i> Editar</button></div>`; historyLog.appendChild(entryDiv); }); });
     }

    // MODIFICADA: Para resetear/actualizar el título del historial y manejar H2 nulo
    function handleFilterChange() {
        const selectedDate = filterDateInput.value;
        if (!selectedDate) {
            loadInitialHistory(); // Recargar para mostrar contador total y datos recientes
            return;
        }
        const [y, m, d] = selectedDate.split('-'); const dateToCheck = `${d}/${m}/${y}`;

        // Quitar contador mientras se filtra por fecha específica
        if (historyTitleElement) { historyTitleElement.textContent = baseHistoryTitle; }

        if (loadedDatesSet.has(dateToCheck)) {
             console.log("Filtrando localmente");
             const filtered = initiallyLoadedData.filter(e => e.timestamp && new Date(e.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) === dateToCheck);
             displayGroupedHistory(filtered);
             // Actualizar título para indicar fecha específica
             if (historyTitleElement) {
                 try {
                    const dateObj = new Date(selectedDate + 'T00:00:00'); // Asumir UTC
                    const displayDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    historyTitleElement.textContent = `Historial para ${displayDate}`;
                 } catch(e) { historyTitleElement.textContent = `Historial para ${selectedDate}`;}
              }
        } else {
            console.log("Pidiendo fecha específica");
            loadSpecificDateHistory(selectedDate); // Esta función ya actualiza el título
        }
     }

    // SIN CAMBIOS
    function handleClearFilter() { console.log("Limpiando filtro"); loadInitialHistory(); }


    // --- Funciones para la Gráfica (Añadidas Validaciones) ---
    function populateGraphExerciseSelect(data) {
        const exercises = [...new Set((data || []).map(e => e ? e.exercise : null).filter(ex => ex))].sort(); // Filtrar nulos/undefined
        graphExerciseSelect.innerHTML = '<option value="" disabled selected>-- Selecciona --</option>';
        exercises.forEach(ex => { const o = document.createElement('option'); o.value = ex; o.textContent = ex; graphExerciseSelect.appendChild(o); });
        graphExerciseSelect.value = ""; showGraphBtn.disabled = true; hideProgressGraph();
    }

    function handleGraphExerciseSelectChange() { /* ... sin cambios ... */ showGraphBtn.disabled = !graphExerciseSelect.value; }

    function calculateEpleyE1RM(weight, reps) { /* ... sin cambios ... */ if (reps <= 0 || weight <= 0 || typeof weight !== 'number' || typeof reps !== 'number') return 0; return weight * (1 + (reps / 30)); }

    function calculateAverageDailyE1RM(allData, exerciseName) {
        const exerciseEntries = (allData || []).filter(e => e && e.exercise === exerciseName);
        const dailyE1RMValues = {};
        exerciseEntries.forEach(entry => {
            if (!entry.timestamp || typeof entry.timestamp !== 'number') return; // Validar timestamp
            const dateKey = new Date(entry.timestamp).toISOString().split('T')[0];
            if (!dailyE1RMValues[dateKey]) dailyE1RMValues[dateKey] = [];
            (entry.sets || []).forEach(set => {
                if (set) { // Validar que set existe
                    const e1rm = calculateEpleyE1RM(set.weight, set.reps);
                    if (e1rm > 0) dailyE1RMValues[dateKey].push(e1rm);
                }
            });
        });
        const chartData = [];
        for (const dateKey in dailyE1RMValues) { const e1rms = dailyE1RMValues[dateKey]; if (e1rms.length > 0) { const sum = e1rms.reduce((a, b) => a + b, 0); const average = sum / e1rms.length; chartData.push({ date: dateKey, avgE1RM: parseFloat(average.toFixed(2)) }); } }
        chartData.sort((a, b) => new Date(a.date) - new Date(b.date));
        return chartData;
    }

    function displayExerciseProgressGraph() { /* ... Añadida validación de e1RM medio ... */
        const selectedExercise=graphExerciseSelect.value; if(!selectedExercise)return; console.log(`Generando gráfica: ${selectedExercise}`);
        const progressData=calculateAverageDailyE1RM(initiallyLoadedData,selectedExercise);
        if(progressData.length<2){alert(`No hay suficientes datos (${progressData.length}) para ${selectedExercise}.`); return;}
        const labels=progressData.map(item=>{const d=new Date(item.date+'T00:00:00'); return d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'});});
        const dataPoints=progressData.map(item=>item.avgE1RM);
        // Validar que hay al menos un punto con valor > 0
        if (!dataPoints.some(p => p > 0)) {
             alert(`Todos los valores calculados para ${selectedExercise} son 0. Revisa los datos.`);
             return;
        }
        if(progressChartInstance)progressChartInstance.destroy(); try{progressChartInstance=new Chart(chartCanvas,{type:'line',data:{labels:labels,datasets:[{label:`Progreso e1RM (kg) - ${selectedExercise}`,data:dataPoints,borderColor:'rgb(75, 192, 192)',backgroundColor:'rgba(75, 192, 192, 0.2)',tension:0.1,fill:true,pointRadius:4,pointBackgroundColor:'rgb(75, 192, 192)'}]},options:{responsive:true,maintainAspectRatio:true,scales:{y:{beginAtZero:false,title:{display:true,text:'e1RM Medio (kg)'}},x:{title:{display:true,text:'Fecha (DD/MM)'}}},plugins:{tooltip:{callbacks:{title:function(items){if(!items.length)return''; const i=items[0].dataIndex; if(progressData[i]){const d=progressData[i].date; return new Date(d+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});} return '';},label:function(ctx){if(ctx.parsed?.y !== undefined){return `e1RM Medio: ${ctx.parsed.y.toFixed(2)} kg`;} return '';}}}}}}); console.log("Gráfica creada."); graphContainer.style.display='block'; hideGraphBtn.style.display='inline-block';}catch(err){console.error("Error gráfica:",err); alert("Error al generar gráfica."); hideProgressGraph();}
    }

    function hideProgressGraph() { /* ... sin cambios ... */ if(progressChartInstance){progressChartInstance.destroy(); progressChartInstance=null; console.log("Gráfica destruida.");} graphContainer.style.display='none'; hideGraphBtn.style.display='none'; }


    // --- Funciones de Borrado, Edición y setLoading (SIN CAMBIOS) ---
    window.deleteEntry = async function(id) { /* ... sin cambios ... */ if(!id){console.error("ID inválido");return;} if(confirm(`¿Seguro? (${id})`)){if(!SCRIPT_URL){alert("URL script no configurada.");return;} setLoading(true,'Eliminando...'); try{const r=await fetch(SCRIPT_URL,{method:'POST',mode:'cors',body:JSON.stringify({action:'delete',id:id})}); const res=await r.json(); if(res.status==='success'){alert(res.message||'Eliminado.'); loadInitialHistory();}else{alert(`Error: ${res.message}`);}}catch(err){alert(`Error conexión: ${err.message}.`);}finally{setLoading(false);}} }
    window.editEntry = function(id) { /* ... sin cambios ... */ alert(`Editar ID ${id} no implementado.`); }
    function setLoading(isLoading, message = 'Procesando...') { /* ... sin cambios ... */ const defaultIcon='<i class="fas fa-save"></i> '; const loadingIcon='<i class="fas fa-spinner fa-spin"></i> '; if(isLoading){submitButton.disabled=true; submitButton.innerHTML=`${loadingIcon} ${message}`;}else{submitButton.disabled=false; submitButton.innerHTML=`${defaultIcon} Guardar Entrenamiento`;} }

    // --- Inicialización ---
    if (submitButton) {
        submitButton.innerHTML = `<i class="fas fa-save"></i> Guardar Entrenamiento`;
    }
    loadInitialHistory(); // Carga inicial que ahora también setea el título
    // handleExerciseChange(); // No llamar aquí, se llama cuando el usuario interactúa
    addAddSetButton(); // Asegurar que el botón "+" existe
});