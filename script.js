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
    const historyTitleElement = document.querySelector('#history-filter + h2');
    const submitButton = form.querySelector('button[type="submit"]');
    const filterDateInput = document.getElementById('filter-date');
    const clearFilterBtn = document.getElementById('clear-filter-btn');
    const graphSection = document.getElementById('progress-section');
    const graphExerciseSelect = document.getElementById('graph-exercise-select');
    const showGraphBtn = document.getElementById('show-graph-btn');
    const hideGraphBtn = document.getElementById('hide-graph-btn');
    const graphContainer = document.getElementById('graph-container');
    const chartCanvas = document.getElementById('progress-chart').getContext('2d');
    // AÑADIDO: Referencia al spinner del historial
    const historySpinner = document.getElementById('history-spinner');

    // --- Variables Globales ---
    let initiallyLoadedData = [];
    let loadedDatesSet = new Set();
    let progressChartInstance = null;
    const baseHistoryTitle = "Historial de Entrenamientos";

    // --- Event Listeners ---
    exerciseSelect.addEventListener('change', handleExerciseChange);
    setsInput.addEventListener('change', handleSetsChange);
    form.addEventListener('submit', handleFormSubmit);
    filterDateInput.addEventListener('change', handleFilterChange);
    clearFilterBtn.addEventListener('click', handleClearFilter);
    graphExerciseSelect.addEventListener('change', handleGraphExerciseSelectChange);
    showGraphBtn.addEventListener('click', displayExerciseProgressGraph);
    hideGraphBtn.addEventListener('click', hideProgressGraph);

    // --- Funciones de Notificación Toast (AÑADIDO) ---
    /**
     * Muestra una notificación toast temporal.
     * @param {string} message El mensaje a mostrar.
     * @param {string} type 'success', 'error', o 'info'.
     * @param {number} duration Tiempo en milisegundos para mostrar el mensaje (default 3000).
     */
    function showNotification(message, type = 'info', duration = 3000) {
        const notificationArea = document.getElementById('notification-area');
        if (!notificationArea) {
            console.error("Área de notificación '#notification-area' no encontrada en el HTML.");
            // Fallback muy básico si el contenedor no existe
            console.warn(`NOTIFICACIÓN (${type}): ${message}`);
            return;
        }

        const notification = document.createElement('div');
        notification.classList.add('toast-notification', type); // Añade clase base y tipo
        notification.textContent = message;

        // Añadir al principio para que las nuevas aparezcan arriba
        notificationArea.insertBefore(notification, notificationArea.firstChild);

        // Temporizador para iniciar la animación de salida y eliminar
        const timer = setTimeout(() => {
            notification.classList.add('fade-out');
            // Esperar a que termine la animación CSS antes de eliminar del DOM
            notification.addEventListener('animationend', () => {
                // Verificar si todavía existe en el DOM antes de intentar eliminar
                if (notification.parentNode === notificationArea) {
                    notificationArea.removeChild(notification);
                }
            }, { once: true }); // Asegurar que el listener se ejecute solo una vez
        }, duration);

        // Permitir cerrar la notificación haciendo clic en ella
        notification.addEventListener('click', () => {
            clearTimeout(timer); // Cancelar el temporizador de auto-cierre
            notification.classList.add('fade-out');
            notification.addEventListener('animationend', () => {
                if (notification.parentNode === notificationArea) {
                    notificationArea.removeChild(notification);
                }
            }, { once: true });
        }, { once: true }); // El listener de click también se ejecuta una vez
    }

    // --- Funciones de Spinner (AÑADIDO) ---
    function showHistorySpinner(message = "Procesando...") {
        if (historySpinner) {
            const pElement = historySpinner.querySelector('p');
            if (pElement) pElement.textContent = message; // Actualizar mensaje
            historySpinner.style.display = 'flex'; // Mostrar spinner (usamos flex por el CSS)
        }
         // Limpiamos el log ANTES de mostrar el spinner para evitar contenido detrás
        if(historyLog && historySpinner) { // Asegurarse que ambos existen
           // Eliminar todo excepto el spinner
           Array.from(historyLog.children).forEach(child => {
              if(child.id !== 'history-spinner') {
                 historyLog.removeChild(child);
              }
           });
           // O una forma más simple si el spinner es el primero:
           // historyLog.innerHTML = ''; // Limpia todo
           // historyLog.appendChild(historySpinner); // Vuelve a añadir el spinner
           // historySpinner.style.display = 'flex'; // Y lo muestra
           // Por seguridad, mantenemos la primera forma por si el orden cambia.
        }
    }

    function hideHistorySpinner() {
        if (historySpinner) {
            historySpinner.style.display = 'none'; // Ocultar spinner
        }
    }


    // --- Funciones del Formulario y Series (Llamadas a alert reemplazadas) ---

    function handleExerciseChange() {
        const selectedValue = exerciseSelect.value;
        if (selectedValue === 'custom') {
            customExerciseGroup.style.display = 'block'; customExerciseInput.required = true; generateSetsInputs(0, false);
        } else {
            customExerciseGroup.style.display = 'none'; customExerciseInput.required = false; customExerciseInput.value = '';
            if (selectedValue) {
                if (initiallyLoadedData && initiallyLoadedData.length > 0) { prefillFormWithLastWorkout(selectedValue); }
                else { generateSetsInputs(0, false); }
            } else { generateSetsInputs(0, false); }
        }
    }

    function handleSetsChange() {
        const numSets = parseInt(setsInput.value) || 0;
        generateSetsInputs(numSets, false);
    }

    function generateSetsInputs(numberOfSets, shouldPrefillPlaceholders = false, lastWorkoutData = null) {
        setsInputsContainer.innerHTML = '';
        const setsToGenerate = Math.max(0, numberOfSets);
        if (setsToGenerate > 0 && setsToGenerate <= 20) {
            for (let i = 1; i <= setsToGenerate; i++) { addSingleSetInput(i); }
            if (shouldPrefillPlaceholders && lastWorkoutData && lastWorkoutData.sets) { setTimeout(() => updatePlaceholders(lastWorkoutData), 0); }
        } else if (setsToGenerate > 20) {
            showNotification("Máximo 20 series permitidas.", 'info', 4000); // Reemplaza alert
            // No añadir botón + si hay error
             if (document.getElementById('add-set-button')) { document.getElementById('add-set-button').remove(); }
             updateSetNumbers();
            return;
        }
        addAddSetButton(); updateSetNumbers();
    }

    function addSingleSetInput(setNumber) { /* ... sin cambios internos ... */
        const setGroup = document.createElement('div'); setGroup.classList.add('set-group');
        setGroup.innerHTML = `<strong>Serie ${setNumber}:</strong> <label for="reps-set-${setNumber}">Reps:</label> <input type="number" id="reps-set-${setNumber}" name="reps-set-${setNumber}" min="0" required> <label for="weight-set-${setNumber}">Peso (kg):</label> <input type="number" id="weight-set-${setNumber}" name="weight-set-${setNumber}" min="0" step="0.1" required> <button type="button" class="remove-set-btn" onclick="removeSetInput(this)" title="Quitar serie">X</button>`;
        const addButton = document.getElementById('add-set-button');
        if (addButton) { setsInputsContainer.insertBefore(setGroup, addButton); } else { setsInputsContainer.appendChild(setGroup); }
    }

    function addAddSetButton() { /* ... sin cambios internos ... */
        if (!document.getElementById('add-set-button')) { const addButton = document.createElement('button'); addButton.type = 'button'; addButton.id = 'add-set-button'; addButton.innerHTML = `<i class="fas fa-plus"></i> Añadir Serie`; addButton.onclick = addSetInput; setsInputsContainer.appendChild(addButton); }
     }

    window.addSetInput = function() {
        const currentSets = setsInputsContainer.querySelectorAll('.set-group').length; const nextSetNumber = currentSets + 1;
        if (nextSetNumber > 20) {
            showNotification("Máximo 20 series permitidas.", 'info', 4000); // Reemplaza alert
            return;
        }
        addSingleSetInput(nextSetNumber); updateSetNumbers();
     }

    window.removeSetInput = function(button) { /* ... sin cambios internos ... */ button.closest('.set-group').remove(); updateSetNumbers(); }

    function updateSetNumbers() { /* ... sin cambios internos ... */
        const setGroups = setsInputsContainer.querySelectorAll('.set-group'); const currentNumSets = setGroups.length; setGroups.forEach((group, index) => { const setNumber = index + 1; group.querySelector('strong').textContent = `Serie ${setNumber}:`; group.querySelector('label[for^="reps-set"]').setAttribute('for', `reps-set-${setNumber}`); group.querySelector('input[id^="reps-set"]').id = `reps-set-${setNumber}`; group.querySelector('input[id^="reps-set"]').name = `reps-set-${setNumber}`; group.querySelector('label[for^="weight-set"]').setAttribute('for', `weight-set-${setNumber}`); group.querySelector('input[id^="weight-set"]').id = `weight-set-${setNumber}`; group.querySelector('input[id^="weight-set"]').name = `weight-set-${setNumber}`; }); setsInput.value = currentNumSets >= 0 ? currentNumSets : '';
     }

     // --- Funciones para Pre-rellenar (Sin cambios) ---
    function findLastWorkoutForExercise(exerciseName) { /* ... sin cambios ... */ console.log(`Buscando en datos locales (${initiallyLoadedData.length} registros) para: ${exerciseName}`); return initiallyLoadedData.find(entry => entry.exercise === exerciseName) || null; }
    function prefillFormWithLastWorkout(exerciseName) { /* ... sin cambios ... */ const lastWorkout = findLastWorkoutForExercise(exerciseName); if (lastWorkout && lastWorkout.sets && lastWorkout.sets.length > 0) { console.log("Último entreno local encontrado:", lastWorkout); const numberOfSets = lastWorkout.sets.length; setsInput.value = numberOfSets; generateSetsInputs(numberOfSets, true, lastWorkout); } else { console.log("No se encontró entreno local reciente para este ejercicio."); setsInput.value = ''; generateSetsInputs(0, false); } }
    function updatePlaceholders(lastWorkoutData) { /* ... sin cambios ... */ console.log("Actualizando placeholders con:", lastWorkoutData); lastWorkoutData.sets.forEach((setInfo) => { const setNumber = setInfo.set; if (typeof setNumber !== 'number' || setNumber <= 0) { console.warn("Saltando set con número inválido:", setInfo); return; } const repsInput = document.getElementById(`reps-set-${setNumber}`); const weightInput = document.getElementById(`weight-set-${setNumber}`); if (repsInput) { repsInput.placeholder = setInfo.reps !== undefined ? setInfo.reps : ''; repsInput.value = ''; console.log(`Placeholder reps S${setNumber}: ${repsInput.placeholder}`); } else { console.warn(`Input de reps no encontrado para set ${setNumber}`); } if (weightInput) { weightInput.placeholder = setInfo.weight !== undefined ? setInfo.weight : ''; weightInput.value = ''; console.log(`Placeholder peso S${setNumber}: ${weightInput.placeholder}`); } else { console.warn(`Input de peso no encontrado para set ${setNumber}`); } }); }


    // --- Función de Guardado (Reemplaza alerts) ---
    async function handleFormSubmit(event) {
        event.preventDefault();
        if (!SCRIPT_URL) {
            showNotification("Error: URL del script no configurada.", 'error', 5000); // Reemplaza alert
            return;
        }
        const exerciseName = exerciseSelect.value === 'custom' ? customExerciseInput.value.trim() : exerciseSelect.value;
        const setGroups = setsInputsContainer.querySelectorAll('.set-group');
        const numberOfSets = setGroups.length;
        const setsData = [];

        if (!exerciseName) {
            showNotification("Selecciona o introduce un ejercicio.", 'error', 4000); // Reemplaza alert
            return;
        }
        if (numberOfSets === 0) {
            showNotification("Añade al menos una serie.", 'error', 4000); // Reemplaza alert
            return;
        }

        let formIsValid = true;
        for (let i = 0; i < numberOfSets; i++) {
            const setGroup = setGroups[i];
            const setNumber = i + 1;
            const repsInput = setGroup.querySelector(`input[id^="reps-set"]`);
            const weightInput = setGroup.querySelector(`input[id^="weight-set"]`);
            if (!repsInput || !weightInput || repsInput.value === '' || weightInput.value === '') {
                showNotification(`Completa Reps y Peso para la Serie ${setNumber}.`, 'error', 4000); // Reemplaza alert
                formIsValid = false;
                break;
            }
            setsData.push({ set: setNumber, reps: parseInt(repsInput.value), weight: parseFloat(weightInput.value) });
        }

        if (!formIsValid) { return; }

        const workoutEntry = { exercise: exerciseName, sets: setsData };
        setLoading(true, 'Guardando...'); // Esto ya usa el spinner en el botón

        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'save', data: workoutEntry }) });
            const result = await response.json();
            if (result.status === 'success') {
                showNotification('¡Entrenamiento Guardado!', 'success'); // Reemplaza alert
                form.reset(); // Limpiar formulario
                customExerciseGroup.style.display = 'none'; // Ocultar campo custom
                setsInputsContainer.innerHTML = ''; // Limpiar series
                addAddSetButton(); // Añadir botón +
                setsInput.value = ''; // Limpiar input numérico de series
                loadInitialHistory(); // Recargar historial
            } else {
                console.error('Error devuelto por el script:', result.message);
                showNotification(`Error al guardar: ${result.message || 'Desconocido'}`, 'error', 5000); // Reemplaza alert
            }
        } catch (error) {
            console.error('Error en fetch al guardar:', error);
            showNotification(`Error de conexión al guardar: ${error.message}`, 'error', 5000); // Reemplaza alert
        } finally {
            setLoading(false); // Restaura el botón
        }
     }

    // --- Funciones de Carga y Filtro Historial (Integración Spinner) ---

    async function fetchHistoryData(specificDate = null) {
        // ... (sin cambios, pero los errores ahora se manejarán mejor en las funciones que lo llaman)
        if (!SCRIPT_URL) { console.error("URL script no configurada."); return { status: "error", message: "URL script no configurada." }; }
        let fetchUrl = SCRIPT_URL + (specificDate ? `?load=specific&date=${specificDate}` : `?load=recent&days=${INITIAL_DAYS_TO_LOAD}`);
        console.log("Fetching:", fetchUrl);
        try {
             const response = await fetch(fetchUrl, { method: 'GET', mode: 'cors' });
             // Añadir manejo básico de errores HTTP
             if (!response.ok) {
                 throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
             }
             const result = await response.json();
             console.log("Received:", result);
             return result;
        } catch (error) {
            console.error('Error fetch historial:', error);
            return { status: "error", message: `Error conexión: ${error.message}` };
        }
    }

    // MODIFICADO: Usa show/hideHistorySpinner
    async function loadInitialHistory() {
        filterDateInput.value = '';
        hideProgressGraph(); // Ocultar gráfica si estaba visible
        if (historyTitleElement) { historyTitleElement.textContent = baseHistoryTitle + '...'; }

        showHistorySpinner("Cargando historial reciente..."); // MOSTRAR SPINNER

        try {
            const result = await fetchHistoryData();

            hideHistorySpinner(); // OCULTAR SPINNER antes de mostrar contenido/error

            if (result.status === 'success') {
                initiallyLoadedData = result.data || [];
                loadedDatesSet.clear();
                initiallyLoadedData.forEach(entry => {
                    if (entry.timestamp && typeof entry.timestamp === 'number') {
                        try { // Añadir try-catch para el formateo de fecha
                           const dateStr = new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                           loadedDatesSet.add(dateStr);
                        } catch(e) { console.warn("Error formateando timestamp a fecha:", entry.timestamp, e); }
                    } else { console.warn("Entrada sin timestamp válido:", entry); }
                });
                console.log("Fechas iniciales cargadas:", loadedDatesSet);

                if (historyTitleElement) {
                     if (result.totalWorkoutDays !== undefined && result.totalWorkoutDays !== null) {
                        historyTitleElement.textContent = `${baseHistoryTitle} (Total: ${result.totalWorkoutDays} días)`;
                     } else { historyTitleElement.textContent = baseHistoryTitle; }
                }

                displayGroupedHistory(initiallyLoadedData); // Mostrar datos
                populateGraphExerciseSelect(initiallyLoadedData); // Poblar select de gráfica
            } else {
                // Error devuelto por el script
                displayGroupedHistory([]); // Mostrar mensaje de "no hay registros"
                showNotification(`Error al cargar historial: ${result.message || 'Desconocido'}`, 'error');
                initiallyLoadedData = []; loadedDatesSet.clear(); populateGraphExerciseSelect([]);
                if (historyTitleElement) { historyTitleElement.textContent = baseHistoryTitle; }
            }
        } catch (error) {
             // Error de red o en fetchHistoryData
             hideHistorySpinner(); // Asegurar que el spinner se oculte
             console.error("Error crítico en loadInitialHistory:", error);
             displayGroupedHistory([]); // Mostrar mensaje de "no hay registros"
             showNotification(`Error de conexión al cargar historial. Inténtalo de nuevo.`, 'error', 5000);
             initiallyLoadedData = []; loadedDatesSet.clear(); populateGraphExerciseSelect([]);
             if (historyTitleElement) { historyTitleElement.textContent = baseHistoryTitle; }
        }
    }

    // MODIFICADO: Usa show/hideHistorySpinner
    async function loadSpecificDateHistory(dateYYYYMMDD) {
         hideProgressGraph();
         if (historyTitleElement) { historyTitleElement.textContent = baseHistoryTitle + '...'; } // Indicar carga en título

         showHistorySpinner(`Cargando datos para ${dateYYYYMMDD}...`); // MOSTRAR SPINNER

         try {
             const result = await fetchHistoryData(dateYYYYMMDD);

             hideHistorySpinner(); // OCULTAR SPINNER antes de mostrar

             if (result.status === 'success') {
                 displayGroupedHistory(result.data); // Mostrar datos
                 // Actualizar título (ya se hacía, mantenido)
                 if (historyTitleElement) {
                      try {
                           const dateObj = new Date(dateYYYYMMDD + 'T00:00:00');
                           const displayDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                           historyTitleElement.textContent = `Historial para ${displayDate}`;
                      } catch (e) { historyTitleElement.textContent = `Historial para ${dateYYYYMMDD}`; }
                 }
             } else {
                 displayGroupedHistory([]); // Mostrar "No hay registros para..."
                 showNotification(`Error al cargar fecha ${dateYYYYMMDD}: ${result.message || 'Desconocido'}`, 'error');
                 if (historyTitleElement) historyTitleElement.textContent = baseHistoryTitle;
             }
        } catch(error) {
            hideHistorySpinner(); // Asegurar ocultar
            console.error("Error crítico en loadSpecificDateHistory:", error);
            displayGroupedHistory([]);
            showNotification(`Error de conexión al cargar fecha ${dateYYYYMMDD}.`, 'error', 5000);
            if (historyTitleElement) historyTitleElement.textContent = baseHistoryTitle;
        }
     }

     // MODIFICADO: Limpia el log ANTES de mostrar el spinner si es necesario
    function displayGroupedHistory(historyData) {
        // Ocultar spinner explícitamente por si acaso
        hideHistorySpinner();

        // Limpiar el log AHORA, justo antes de añadir nuevo contenido
        historyLog.innerHTML = '';
        // Re-añadir el spinner oculto por si se limpió todo
        if(historySpinner && !historyLog.contains(historySpinner)) {
            historyLog.appendChild(historySpinner);
            historySpinner.style.display = 'none';
        }


        if (!historyData || historyData.length === 0) {
            const message = filterDateInput.value
                ? `No hay registros para la fecha seleccionada.`
                : 'No hay registros recientes.';
            const p = document.createElement('p');
            p.textContent = message;
            historyLog.appendChild(p); // Añadir mensaje de vacío
            return;
        }

        // --- Lógica de agrupación y visualización (sin cambios internos) ---
        const groupedByDate = historyData.reduce((acc, entry) => {
             if (!entry || !entry.timestamp || typeof entry.timestamp !== 'number') { console.warn("Saltando entrada sin timestamp válido:", entry); return acc; }
             let dateStr; try { dateStr = new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (e) { console.warn("Error formateando fecha para entrada:", entry, e); return acc; }
             if (!acc[dateStr]) acc[dateStr] = []; acc[dateStr].push(entry); return acc;
         }, {});
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => { const [dA, mA, yA] = a.split('/').map(Number); const [dB, mB, yB] = b.split('/').map(Number); return new Date(yB, mB - 1, dB) - new Date(yA, mA - 1, dA); });

        sortedDates.forEach(date => {
            const dateHeading = document.createElement('h2'); dateHeading.classList.add('history-date-header'); dateHeading.innerHTML = `<i class="fas fa-calendar-alt"></i> ${date}`; historyLog.appendChild(dateHeading);
            const entries = groupedByDate[date];
            entries.forEach(entry => {
                const entryDiv = document.createElement('div'); entryDiv.classList.add('history-entry');
                // Formato de series ya corregido anteriormente
                let setsHTML = (entry.sets || []).sort((a, b) => (a.set || 0) - (b.set || 0)).map(s => `<li class="history-set-item">Serie ${s.set || '?'}: <strong>${s.reps || 0}</strong> reps → <strong>${s.weight || 0}</strong> kg</li>`).join('');
                // Validar ID para el botón de borrar
                const entryId = entry.id || '';
                const deleteButtonHTML = `<button class="button-delete" onclick="deleteEntry('${entryId}')" ${!entryId ? 'disabled title="No se puede eliminar (ID inválido)"' : 'title="Eliminar registro"'}><i class="fas fa-trash-alt"></i> Eliminar</button>`;
                const editButtonHTML = `<button class="button-edit" disabled onclick="editEntry('${entryId}')" ${!entryId ? 'disabled title="No se puede editar (ID inválido)"' : 'title="Editar registro (No implementado)"'}><i class="fas fa-pencil-alt"></i> Editar</button>`;

                entryDiv.innerHTML = `
                    <h3 class="history-exercise-title"><i class="fas fa-dumbbell"></i> ${entry.exercise || 'Ejercicio Desconocido'}</h3>
                    <ul class="history-sets-list">${setsHTML}</ul>
                    <div class="history-entry-actions">
                        ${deleteButtonHTML}
                        ${editButtonHTML}
                    </div>`;
                historyLog.appendChild(entryDiv);
            });
        });
     }

    // MODIFICADO: Manejo de título y posible carga de historial
    function handleFilterChange() {
        const selectedDate = filterDateInput.value;
        if (!selectedDate) {
            loadInitialHistory(); // Carga los recientes y resetea título
            return;
        }
        const [y, m, d] = selectedDate.split('-');
        if (!y || !m || !d) { // Validación básica del formato
             showNotification("Formato de fecha inválido.", "error");
             return;
        }
        const dateToCheck = `${d}/${m}/${y}`;

        // No mostramos spinner para filtrado local, es instantáneo
        hideHistorySpinner(); // Asegurar que no haya spinner de carga previa

        if (historyTitleElement) { historyTitleElement.textContent = baseHistoryTitle; } // Quitar contador

        if (loadedDatesSet.has(dateToCheck)) {
             console.log("Filtrando localmente para", dateToCheck);
             const filtered = initiallyLoadedData.filter(e => {
                 if (!e.timestamp || typeof e.timestamp !== 'number') return false;
                 try {
                     return new Date(e.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) === dateToCheck;
                 } catch { return false; }
             });
             displayGroupedHistory(filtered); // Mostrar filtrados
             // Actualizar título
             if (historyTitleElement) {
                 try {
                    const dateObj = new Date(selectedDate + 'T00:00:00');
                    const displayDate = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    historyTitleElement.textContent = `Historial para ${displayDate}`;
                 } catch(e) { historyTitleElement.textContent = `Historial para ${selectedDate}`;}
              }
        } else {
            console.log("Pidiendo fecha específica:", selectedDate);
            // Llamar a la función que ya maneja el spinner y el título
            loadSpecificDateHistory(selectedDate);
        }
     }

    // MODIFICADO: Llama a loadInitialHistory que maneja el spinner
    function handleClearFilter() {
        console.log("Limpiando filtro y mostrando recientes");
        loadInitialHistory();
    }


    // --- Funciones para la Gráfica (Reemplaza alerts) ---
    function populateGraphExerciseSelect(data) { /* ... sin cambios internos ... */ const exercises = [...new Set((data || []).map(e => e ? e.exercise : null).filter(ex => ex))].sort(); graphExerciseSelect.innerHTML = '<option value="" disabled selected>-- Selecciona --</option>'; exercises.forEach(ex => { const o = document.createElement('option'); o.value = ex; o.textContent = ex; graphExerciseSelect.appendChild(o); }); graphExerciseSelect.value = ""; showGraphBtn.disabled = true; hideProgressGraph(); }
    function handleGraphExerciseSelectChange() { /* ... sin cambios internos ... */ showGraphBtn.disabled = !graphExerciseSelect.value; }
    function calculateEpleyE1RM(weight, reps) { /* ... sin cambios internos ... */ if (reps <= 0 || weight <= 0 || typeof weight !== 'number' || typeof reps !== 'number') return 0; return weight * (1 + (reps / 30)); }
    function calculateAverageDailyE1RM(allData, exerciseName) { /* ... sin cambios internos ... */ const exerciseEntries = (allData || []).filter(e => e && e.exercise === exerciseName); const dailyE1RMValues = {}; exerciseEntries.forEach(entry => { if (!entry.timestamp || typeof entry.timestamp !== 'number') return; const dateKey = new Date(entry.timestamp).toISOString().split('T')[0]; if (!dailyE1RMValues[dateKey]) dailyE1RMValues[dateKey] = []; (entry.sets || []).forEach(set => { if (set) { const e1rm = calculateEpleyE1RM(set.weight, set.reps); if (e1rm > 0) dailyE1RMValues[dateKey].push(e1rm); } }); }); const chartData = []; for (const dateKey in dailyE1RMValues) { const e1rms = dailyE1RMValues[dateKey]; if (e1rms.length > 0) { const sum = e1rms.reduce((a, b) => a + b, 0); const average = sum / e1rms.length; chartData.push({ date: dateKey, avgE1RM: parseFloat(average.toFixed(2)) }); } } chartData.sort((a, b) => new Date(a.date) - new Date(b.date)); return chartData; }

    function displayExerciseProgressGraph() {
        const selectedExercise = graphExerciseSelect.value;
        if (!selectedExercise) return;
        console.log(`Generando gráfica: ${selectedExercise}`);
        const progressData = calculateAverageDailyE1RM(initiallyLoadedData, selectedExercise);

        if (progressData.length < 2) {
            showNotification(`No hay suficientes datos (${progressData.length}) para graficar ${selectedExercise}. Se necesitan al menos 2 días.`, 'info', 4000); // Reemplaza alert
            return;
        }
        const labels = progressData.map(item => { const d = new Date(item.date + 'T00:00:00'); return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }); });
        const dataPoints = progressData.map(item => item.avgE1RM);

        if (!dataPoints.some(p => p > 0)) {
             showNotification(`No se pudo calcular el e1RM para ${selectedExercise}. Revisa los pesos/reps registrados.`, 'info', 4000); // Reemplaza alert
             return;
        }

        if (progressChartInstance) progressChartInstance.destroy();
        try {
            progressChartInstance = new Chart(chartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `Progreso - ${selectedExercise}`, // Leyenda acortada
                        data: dataPoints,
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1,
                        fill: true,
                        pointRadius: 4,
                        pointBackgroundColor: 'rgb(75, 192, 192)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Para mejor ajuste en móvil
                    scales: {
                        y: { beginAtZero: false, title: { display: true, text: 'e1RM Medio (kg)' } },
                        x: { title: { display: false } } // Título eje X oculto
                    },
                    plugins: {
                        legend: { display: true, position: 'top' }, // Leyenda arriba (por defecto)
                        tooltip: {
                            callbacks: {
                                title: function(items) {
                                    // Intenta obtener fecha completa del array original
                                    if (!items.length) return '';
                                    const i = items[0].dataIndex;
                                    // Asegurarse que progressData está disponible aquí
                                    // Esta función podría necesitar acceso a 'progressData' calculado antes
                                    if (progressData && progressData[i]) {
                                        const d = progressData[i].date;
                                        try { return new Date(d + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
                                        catch { return items[0].label || '';} // Fallback a la etiqueta si falla
                                    }
                                    return items[0].label || ''; // Fallback si no se encuentra
                                },
                                label: function(ctx) {
                                    if (ctx.parsed?.y !== undefined) { return `e1RM Medio: ${ctx.parsed.y.toFixed(2)} kg`; }
                                    return '';
                                }
                            }
                        }
                    }
                }
            });
            console.log("Gráfica creada.");
            graphContainer.style.display = 'block';
            hideGraphBtn.style.display = 'inline-block';
        } catch (err) {
            console.error("Error al crear la gráfica:", err);
            showNotification("Error al generar la gráfica.", 'error'); // Reemplaza alert
            hideProgressGraph();
        }
    }

    function hideProgressGraph() { /* ... sin cambios internos ... */ if(progressChartInstance){progressChartInstance.destroy(); progressChartInstance=null; console.log("Gráfica destruida.");} graphContainer.style.display='none'; hideGraphBtn.style.display='none'; }


    // --- Funciones de Borrado, Edición (Reemplaza alerts y usa spinner) ---
    window.deleteEntry = async function(id) {
        if (!id) { console.error("ID inválido para eliminar."); return; }
        // Usamos confirm por ahora, ya que requiere acción explícita del usuario.
        // Podría reemplazarse por un modal personalizado en el futuro.
        if (confirm(`¿Seguro que quieres eliminar este registro?`)) {
            if (!SCRIPT_URL) {
                showNotification("Error: URL del script no configurada.", 'error', 5000); // Reemplaza alert
                return;
            }

            showHistorySpinner('Eliminando registro...'); // MOSTRAR SPINNER en el historial

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'cors',
                    body: JSON.stringify({ action: 'delete', id: id })
                });
                const result = await response.json();

                // Ocultar spinner ANTES de la notificación y recarga
                // hideHistorySpinner(); // loadInitialHistory() lo oculta ahora

                if (result.status === 'success') {
                    showNotification(result.message || 'Registro eliminado.', 'success'); // Reemplaza alert
                    loadInitialHistory(); // Recarga (y maneja su propio spinner)
                } else {
                    showNotification(`Error al eliminar: ${result.message || 'Desconocido'}`, 'error', 5000); // Reemplaza alert
                    // Ocultar spinner explícitamente si falla la eliminación antes de recargar
                    hideHistorySpinner();
                    // Quizás recargar igualmente para ver estado actual? O no?
                    // loadInitialHistory();
                }
            } catch (error) {
                hideHistorySpinner(); // Asegurar ocultar en error de red
                console.error('Error en fetch al eliminar:', error);
                showNotification(`Error de conexión al eliminar: ${error.message}`, 'error', 5000); // Reemplaza alert
            }
            // No necesitamos finally si el spinner se gestiona en try/catch y loadInitialHistory
        }
    }

    window.editEntry = function(id) {
        showNotification(`Función Editar (ID: ${id}) aún no implementada.`, 'info'); // Reemplaza alert
    }

    // MODIFICADO: Usa spinner en el botón de submit
    function setLoading(isLoading, message = 'Procesando...') {
        const defaultIconHTML = '<i class="fas fa-save"></i> Guardar Entrenamiento';
        const loadingIconHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Icono giratorio

        if (isLoading) {
            submitButton.disabled = true;
            submitButton.innerHTML = `${loadingIconHTML} ${message}`;
        } else {
            submitButton.disabled = false;
            submitButton.innerHTML = defaultIconHTML;
        }
    }

    // --- Inicialización ---
    if (submitButton) {
        submitButton.innerHTML = `<i class="fas fa-save"></i> Guardar Entrenamiento`; // Estado inicial
    }
    loadInitialHistory(); // Carga inicial (ahora maneja spinner)
    addAddSetButton(); // Asegurar que el botón "+" existe al inicio
});