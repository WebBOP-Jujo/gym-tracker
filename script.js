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
    const historyTitleElement = document.querySelector('#history-filter + h2'); // Selector ajustado si H2 está después
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
            console.warn(`NOTIFICACIÓN (${type}): ${message}`);
            return;
        }

        const notification = document.createElement('div');
        notification.classList.add('toast-notification', type);
        notification.textContent = message;

        notificationArea.insertBefore(notification, notificationArea.firstChild);

        const timer = setTimeout(() => {
            notification.classList.add('fade-out');
            notification.addEventListener('animationend', () => {
                if (notification.parentNode === notificationArea) {
                    notificationArea.removeChild(notification);
                }
            }, { once: true });
        }, duration);

        notification.addEventListener('click', () => {
            clearTimeout(timer);
            notification.classList.add('fade-out');
            notification.addEventListener('animationend', () => {
                if (notification.parentNode === notificationArea) {
                    notificationArea.removeChild(notification);
                }
            }, { once: true });
        }, { once: true });
    }

    // --- Funciones de Spinner (AÑADIDO) ---
    function showHistorySpinner(message = "Procesando...") {
        if (historySpinner) {
            const pElement = historySpinner.querySelector('p');
            if (pElement) pElement.textContent = message;
            historySpinner.style.display = 'flex';
        }
         if(historyLog && historySpinner) {
           Array.from(historyLog.children).forEach(child => {
              if(child.id !== 'history-spinner') {
                 historyLog.removeChild(child);
              }
           });
        }
    }

    function hideHistorySpinner() {
        if (historySpinner) {
            historySpinner.style.display = 'none';
        }
    }


    // --- Funciones del Formulario y Series ---

    function handleExerciseChange() {
        const selectedValue = exerciseSelect.value;
        if (selectedValue === 'custom') {
            customExerciseGroup.style.display = 'block';
            customExerciseInput.required = true;
            generateSetsInputs(0, false); // Al elegir 'Otro', empezar sin series
        } else {
            customExerciseGroup.style.display = 'none';
            customExerciseInput.required = false;
            customExerciseInput.value = '';
            if (selectedValue) { // Se selecciona un ejercicio real
                if (initiallyLoadedData && initiallyLoadedData.length > 0) {
                    prefillFormWithLastWorkout(selectedValue); // Intenta pre-rellenar
                } else {
                    // CASO: No hay datos iniciales cargados
                    // MODIFICADO: Establecer 1 serie por defecto
                    console.log("No hay datos iniciales. Estableciendo 1 serie por defecto.");
                    setsInput.value = 1; // Actualizar input numérico
                    generateSetsInputs(1, false); // Generar 1 serie
                }
            } else {
                // Caso: Se selecciona "-- Selecciona --"
                generateSetsInputs(0, false); // Limpiar series
            }
        }
    }

    function handleSetsChange() {
        const numSets = parseInt(setsInput.value) || 0;
        // No pre-rellenar al cambiar manualmente el número
        generateSetsInputs(numSets, false);
    }

    function generateSetsInputs(numberOfSets, shouldPrefillPlaceholders = false, lastWorkoutData = null) {
        setsInputsContainer.innerHTML = ''; // Limpiar siempre antes de generar
        const setsToGenerate = Math.max(0, numberOfSets);
        if (setsToGenerate > 0 && setsToGenerate <= 20) {
            for (let i = 1; i <= setsToGenerate; i++) {
                addSingleSetInput(i); // Añadir cada input de serie
            }
            // Solo pre-rellenar placeholders si se indica Y hay datos para ello
            if (shouldPrefillPlaceholders && lastWorkoutData && lastWorkoutData.sets) {
                // Usar setTimeout 0 para asegurar que los elementos estén en el DOM
                setTimeout(() => updatePlaceholders(lastWorkoutData), 0);
            }
        } else if (setsToGenerate > 20) {
            showNotification("Máximo 20 series permitidas.", 'info', 4000);
            // Opcional: ¿Limitar el valor del input #sets a 20?
            // setsInput.value = 20;
        }
        // Siempre añadir el botón "+" al final (incluso si hay 0 series)
        addAddSetButton();
        updateSetNumbers(); // Actualizar numeración y el input #sets (si se generaron series)
    }

    function addSingleSetInput(setNumber) {
        const setGroup = document.createElement('div');
        setGroup.classList.add('set-group');
        // Usar placeholders vacíos por defecto, se llenan luego si aplica
        setGroup.innerHTML = `
            <strong>Serie ${setNumber}:</strong>
            <label for="reps-set-${setNumber}">Reps:</label>
            <input type="number" id="reps-set-${setNumber}" name="reps-set-${setNumber}" min="0" required placeholder="Reps">
            <label for="weight-set-${setNumber}">Peso (kg):</label>
            <input type="number" id="weight-set-${setNumber}" name="weight-set-${setNumber}" min="0" step="0.1" required placeholder="kg">
            <button type="button" class="remove-set-btn" onclick="removeSetInput(this)" title="Quitar serie">X</button>`;
        const addButton = document.getElementById('add-set-button');
        if (addButton) {
            setsInputsContainer.insertBefore(setGroup, addButton); // Insertar antes del botón '+'
        } else {
            setsInputsContainer.appendChild(setGroup); // Añadir si el botón aún no existe
        }
    }

    function addAddSetButton() {
        if (!document.getElementById('add-set-button')) {
            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.id = 'add-set-button';
            addButton.innerHTML = `<i class="fas fa-plus"></i> Añadir Serie`;
            addButton.onclick = addSetInput; // Llama a la función global
            setsInputsContainer.appendChild(addButton);
        }
     }

    window.addSetInput = function() {
        const currentSets = setsInputsContainer.querySelectorAll('.set-group').length;
        const nextSetNumber = currentSets + 1;
        if (nextSetNumber > 20) {
            showNotification("Máximo 20 series permitidas.", 'info', 4000);
            return;
        }
        addSingleSetInput(nextSetNumber);
        updateSetNumbers(); // Actualiza números y el input #sets
     }

    window.removeSetInput = function(button) {
        button.closest('.set-group').remove();
        updateSetNumbers(); // Actualiza números y el input #sets
    }

    function updateSetNumbers() {
        const setGroups = setsInputsContainer.querySelectorAll('.set-group');
        const currentNumSets = setGroups.length;
        setGroups.forEach((group, index) => {
            const setNumber = index + 1;
            group.querySelector('strong').textContent = `Serie ${setNumber}:`;
            // Actualizar IDs y fors para labels e inputs
            const repsLabel = group.querySelector('label[for^="reps-set"]');
            const repsInput = group.querySelector('input[id^="reps-set"]');
            const weightLabel = group.querySelector('label[for^="weight-set"]');
            const weightInput = group.querySelector('input[id^="weight-set"]');

            if (repsLabel) repsLabel.setAttribute('for', `reps-set-${setNumber}`);
            if (repsInput) { repsInput.id = `reps-set-${setNumber}`; repsInput.name = `reps-set-${setNumber}`; }
            if (weightLabel) weightLabel.setAttribute('for', `weight-set-${setNumber}`);
            if (weightInput) { weightInput.id = `weight-set-${setNumber}`; weightInput.name = `weight-set-${setNumber}`; }
        });
        // Actualizar el input numérico principal
        setsInput.value = currentNumSets >= 0 ? currentNumSets : '';
     }

     // --- Funciones para Pre-rellenar ---
    function findLastWorkoutForExercise(exerciseName) {
        console.log(`Buscando en datos locales (${initiallyLoadedData.length} registros) para: ${exerciseName}`);
        // Encuentra la última entrada (más reciente) para ese ejercicio
        // Asume que initiallyLoadedData ya está más o menos ordenado por fecha descendente
        // o que la primera coincidencia es suficientemente buena.
        // Para ser más preciso, deberíamos ordenar por timestamp aquí, pero puede ser costoso.
        // Por ahora, find funciona bien si el backend devuelve los datos ordenados.
        return initiallyLoadedData.find(entry => entry.exercise === exerciseName) || null;
    }

    // MODIFICADO: Lógica 'else' para mostrar 1 serie por defecto
    function prefillFormWithLastWorkout(exerciseName) {
        const lastWorkout = findLastWorkoutForExercise(exerciseName);
        if (lastWorkout && lastWorkout.sets && lastWorkout.sets.length > 0) {
            console.log("Último entreno local encontrado:", lastWorkout);
            const numberOfSets = lastWorkout.sets.length;
            setsInput.value = numberOfSets;
            // Generar inputs y LUEGO actualizar placeholders
            generateSetsInputs(numberOfSets, true, lastWorkout);
        } else {
            // CASO: No se encontró entrenamiento para ESTE ejercicio específico
            // MODIFICADO: Establecer 1 serie por defecto
            console.log("No se encontró entreno local reciente para este ejercicio. Estableciendo 1 serie por defecto.");
            setsInput.value = 1; // Poner 1 en el input numérico
            generateSetsInputs(1, false); // Generar 1 serie (sin pre-rellenar placeholders)
        }
    }

    function updatePlaceholders(lastWorkoutData) {
        console.log("Actualizando placeholders con:", lastWorkoutData);
        // Ordenar sets del último entreno por número de serie por si acaso
        const sortedSets = (lastWorkoutData.sets || []).sort((a, b) => (a.set || 0) - (b.set || 0));

        sortedSets.forEach((setInfo) => {
            const setNumber = setInfo.set;
            // Validar número de serie
            if (typeof setNumber !== 'number' || setNumber <= 0) {
                console.warn("Saltando set con número inválido en datos de pre-relleno:", setInfo);
                return;
            }
            const repsInput = document.getElementById(`reps-set-${setNumber}`);
            const weightInput = document.getElementById(`weight-set-${setNumber}`);

            if (repsInput) {
                repsInput.placeholder = setInfo.reps !== undefined && setInfo.reps !== null ? String(setInfo.reps) : 'Reps';
                repsInput.value = ''; // Asegurar que el valor esté vacío, solo cambia placeholder
                console.log(`Placeholder reps S${setNumber}: ${repsInput.placeholder}`);
            } else {
                console.warn(`Input de reps no encontrado para set ${setNumber} durante pre-relleno.`);
            }
            if (weightInput) {
                weightInput.placeholder = setInfo.weight !== undefined && setInfo.weight !== null ? String(setInfo.weight) : 'kg';
                weightInput.value = ''; // Asegurar que el valor esté vacío
                console.log(`Placeholder peso S${setNumber}: ${weightInput.placeholder}`);
            } else {
                console.warn(`Input de peso no encontrado para set ${setNumber} durante pre-relleno.`);
            }
        });
    }


    // --- Función de Guardado ---
    async function handleFormSubmit(event) {
        event.preventDefault();
        if (!SCRIPT_URL) {
            showNotification("Error: URL del script no configurada.", 'error', 5000);
            return;
        }
        const exerciseName = exerciseSelect.value === 'custom'
            ? customExerciseInput.value.trim()
            : exerciseSelect.value;
        const setGroups = setsInputsContainer.querySelectorAll('.set-group');
        const numberOfSets = setGroups.length;
        const setsData = [];

        if (!exerciseName) {
            showNotification("Selecciona o introduce un ejercicio.", 'error', 4000);
            exerciseSelect.focus(); // Ayudar al usuario
            return;
        }
        if (numberOfSets === 0) {
            showNotification("Añade al menos una serie.", 'error', 4000);
             // Opcional: hacer focus al botón de añadir serie si existe
             const addBtn = document.getElementById('add-set-button');
             if(addBtn) addBtn.focus();
            return;
        }

        let formIsValid = true;
        for (let i = 0; i < numberOfSets; i++) {
            const setGroup = setGroups[i];
            const setNumber = i + 1; // El número real de la serie en la UI
            const repsInput = setGroup.querySelector(`input[id='reps-set-${setNumber}']`);
            const weightInput = setGroup.querySelector(`input[id='weight-set-${setNumber}']`);

            // Validar que los inputs existen y tienen valor
            if (!repsInput || !weightInput || repsInput.value.trim() === '' || weightInput.value.trim() === '') {
                showNotification(`Completa Reps y Peso para la Serie ${setNumber}.`, 'error', 4000);
                if (repsInput && repsInput.value.trim() === '') repsInput.focus();
                else if (weightInput) weightInput.focus();
                formIsValid = false;
                break; // Detener validación al primer error
            }
             // Validar que sean números válidos (aunque el type="number" ayuda)
             const repsValue = parseInt(repsInput.value);
             const weightValue = parseFloat(weightInput.value);
             if (isNaN(repsValue) || isNaN(weightValue) || repsValue < 0 || weightValue < 0) {
                 showNotification(`Valores inválidos en Serie ${setNumber}. Reps y Peso deben ser números no negativos.`, 'error', 4000);
                 if (isNaN(repsValue) || repsValue < 0) repsInput.focus();
                 else weightInput.focus();
                 formIsValid = false;
                 break;
             }

            setsData.push({
                set: setNumber, // Usar el número de serie de la UI
                reps: repsValue,
                weight: weightValue
            });
        }

        if (!formIsValid) { return; }

        const workoutEntry = { exercise: exerciseName, sets: setsData };
        setLoading(true, 'Guardando...'); // Mostrar spinner en botón

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                // No añadir 'Content-Type' explícito aquí, dejar que fetch lo infiera
                // para evitar problemas con la redirección de Apps Script.
                // mode: 'cors', // 'cors' es el default, no necesario si el script está bien configurado
                // A veces es necesario 'no-cors' para Apps Script si hay redirección, pero pierdes la respuesta.
                // Probar sin 'mode' o con 'cors' primero.
                body: JSON.stringify({ action: 'save', data: workoutEntry })
            });

             // Apps Script a veces devuelve OK pero con contenido HTML de error/login.
             // O devuelve una redirección si hay un error de permisos/script.
             // Intentamos parsear como JSON, pero si falla, verificamos status.
             let result;
             try {
                 result = await response.json();
             } catch (parseError) {
                  // Si falla el parseo a JSON, podría ser un error inesperado del script
                  console.error("Error al parsear respuesta JSON:", parseError);
                  console.error("Respuesta recibida (texto):", await response.text()); // Loguear texto crudo
                  // Comprobar si la respuesta HTTP fue OK (2xx)
                  if (!response.ok) {
                       throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
                  } else {
                       // Si fue OK pero no es JSON, podría ser un éxito 'silencioso' o un error inesperado
                       // Asumir error si no podemos confirmar éxito con JSON
                       throw new Error("Respuesta inesperada del servidor (no JSON).");
                  }
             }


            if (result && result.status === 'success') {
                showNotification('¡Entrenamiento Guardado!', 'success');
                form.reset(); // Limpiar formulario
                customExerciseGroup.style.display = 'none';
                // Llamar a generateSetsInputs(0) en lugar de limpiar manualmente para asegurar estado correcto
                generateSetsInputs(0, false);
                // Opcional: Resetear select a valor por defecto
                // exerciseSelect.value = "";
                loadInitialHistory(); // Recargar historial (incluye datos nuevos)
            } else {
                // Error devuelto explícitamente por el script en el JSON
                console.error('Error devuelto por el script:', result ? result.message : 'Respuesta vacía');
                showNotification(`Error al guardar: ${result?.message || 'Respuesta inválida'}`, 'error', 5000);
            }
        } catch (error) {
            // Error de red, fetch, o el error lanzado arriba si la respuesta no fue OK o no fue JSON
            console.error('Error en fetch al guardar:', error);
            showNotification(`Error de conexión o servidor al guardar: ${error.message}`, 'error', 5000);
        } finally {
            setLoading(false); // Restaurar el botón
        }
     }

    // --- Funciones de Carga y Filtro Historial ---

    async function fetchHistoryData(specificDate = null) {
        if (!SCRIPT_URL) {
            console.error("URL del script no configurada.");
            return { status: "error", message: "URL script no configurada." };
        }
        // Construir URL con parámetros GET
        const params = new URLSearchParams();
        if (specificDate) {
            params.append('load', 'specific');
            params.append('date', specificDate); // Espera YYYY-MM-DD
        } else {
            params.append('load', 'recent');
            params.append('days', INITIAL_DAYS_TO_LOAD);
        }
        const fetchUrl = `${SCRIPT_URL}?${params.toString()}`;

        console.log("Fetching historial:", fetchUrl);
        try {
             // Usar GET explícito (aunque fetch lo infiere)
             const response = await fetch(fetchUrl, { method: 'GET', mode: 'cors' });

             // Manejo robusto de errores HTTP
             if (!response.ok) {
                 // Intentar leer el cuerpo del error si existe
                 let errorBody = await response.text();
                 console.error(`Error HTTP ${response.status}: ${response.statusText}`, errorBody);
                 throw new Error(`Error ${response.status} del servidor. ${response.statusText}`);
             }

             // Intentar parsear como JSON
             const result = await response.json();
             console.log("Historial recibido:", result);
             return result;

        } catch (error) {
            // Captura errores de red, errores HTTP (del throw anterior), y errores de parseo JSON
            console.error('Error fetch historial:', error);
            // Devolver un objeto de error consistente
            return { status: "error", message: `Error cargando historial: ${error.message}` };
        }
    }

    // Carga inicial o al limpiar filtro
    async function loadInitialHistory() {
        filterDateInput.value = ''; // Limpiar input de fecha
        hideProgressGraph(); // Ocultar gráfica
        if (historyTitleElement) { historyTitleElement.textContent = baseHistoryTitle + '...'; }

        showHistorySpinner("Cargando historial reciente...");

        const result = await fetchHistoryData(); // Llama sin fecha

        hideHistorySpinner(); // Ocultar spinner ANTES de procesar/mostrar

        if (result.status === 'success') {
            initiallyLoadedData = result.data || [];
            // Recalcular fechas cargadas localmente
            loadedDatesSet.clear();
            initiallyLoadedData.forEach(entry => {
                if (entry.timestamp && typeof entry.timestamp === 'number') {
                    try {
                       // Usar el formato que coincide con el input date y el filtro local
                       const dateStr = new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                       loadedDatesSet.add(dateStr); // Formato DD/MM/YYYY
                    } catch(e) { console.warn("Error formateando timestamp a fecha:", entry.timestamp, e); }
                } else { console.warn("Entrada sin timestamp válido:", entry); }
            });
            console.log("Fechas iniciales cargadas (DD/MM/YYYY):", loadedDatesSet);

            // Actualizar título con contador total
            if (historyTitleElement) {
                 if (result.totalWorkoutDays !== undefined && result.totalWorkoutDays !== null) {
                    historyTitleElement.textContent = `${baseHistoryTitle} (Total: ${result.totalWorkoutDays} días)`;
                 } else { historyTitleElement.textContent = baseHistoryTitle; }
            }

            displayGroupedHistory(initiallyLoadedData);
            populateGraphExerciseSelect(initiallyLoadedData);
        } else {
            // Error devuelto por el script o en fetchHistoryData
            displayGroupedHistory([]); // Mostrar mensaje de "no hay registros"
            showNotification(result.message || 'Error desconocido al cargar historial.', 'error');
            initiallyLoadedData = []; loadedDatesSet.clear(); populateGraphExerciseSelect([]);
            if (historyTitleElement) { historyTitleElement.textContent = baseHistoryTitle; }
        }
        // No necesita try/catch aquí porque fetchHistoryData ya maneja sus errores internos
    }

    // Carga para una fecha específica (si no está en local)
    async function loadSpecificDateHistory(dateYYYYMMDD) {
         hideProgressGraph();
         if (historyTitleElement) { historyTitleElement.textContent = baseHistoryTitle + '...'; }

         // Formatear la fecha para mostrar en el spinner
         let displayDateForSpinner = dateYYYYMMDD;
         try {
             const dateObj = new Date(dateYYYYMMDD + 'T00:00:00'); // Asegurar que se interpreta como local
             displayDateForSpinner = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
         } catch(e) { /* usar YYYY-MM-DD si falla */ }
         showHistorySpinner(`Cargando datos para ${displayDateForSpinner}...`);

         const result = await fetchHistoryData(dateYYYYMMDD); // Llama con fecha YYYY-MM-DD

         hideHistorySpinner();

         if (result.status === 'success') {
             // Actualizar título con la fecha específica
             if (historyTitleElement) {
                  try {
                       // Re-formatear para el título (ya lo teníamos del spinner)
                       historyTitleElement.textContent = `Historial para ${displayDateForSpinner}`;
                  } catch (e) { historyTitleElement.textContent = `Historial para ${dateYYYYMMDD}`; }
             }
             displayGroupedHistory(result.data || []);
         } else {
             displayGroupedHistory([]);
             showNotification(result.message || `Error desconocido al cargar fecha ${displayDateForSpinner}.`, 'error');
             if (historyTitleElement) historyTitleElement.textContent = baseHistoryTitle; // Volver a título base en error
         }
         // No necesita try/catch aquí porque fetchHistoryData ya maneja sus errores internos
     }

     // Muestra los datos en el historial (sea inicial, filtrado local o específico)
    function displayGroupedHistory(historyData) {
        hideHistorySpinner(); // Asegurar que esté oculto

        historyLog.innerHTML = ''; // Limpiar contenido anterior
        // Re-adjuntar spinner oculto si fue eliminado
        if(historySpinner && !historyLog.contains(historySpinner)) {
            historyLog.appendChild(historySpinner);
            hideHistorySpinner(); // Ocultarlo de nuevo
        }

        if (!historyData || historyData.length === 0) {
            const message = filterDateInput.value
                ? `No hay registros para la fecha seleccionada.`
                : 'Aún no hay registros.'; // Mensaje genérico si no hay filtro
            const p = document.createElement('p');
            p.textContent = message;
            historyLog.appendChild(p);
            return;
        }

        // Agrupar por fecha (DD/MM/YYYY) usando el timestamp
        const groupedByDate = historyData.reduce((acc, entry) => {
             if (!entry || !entry.timestamp || typeof entry.timestamp !== 'number') {
                 console.warn("Saltando entrada sin timestamp válido:", entry);
                 return acc;
             }
             let dateStr;
             try {
                 // Formato consistente DD/MM/YYYY para agrupar y mostrar
                 dateStr = new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
             } catch (e) {
                 console.warn("Error formateando fecha para entrada:", entry, e);
                 return acc; // Saltar si la fecha es inválida
             }
             if (!acc[dateStr]) acc[dateStr] = [];
             acc[dateStr].push(entry);
             return acc;
         }, {});

        // Ordenar fechas (claves del objeto) de más reciente a más antigua
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
            // Convertir DD/MM/YYYY a objeto Date para comparar correctamente
            const [dA, mA, yA] = a.split('/').map(Number);
            const [dB, mB, yB] = b.split('/').map(Number);
            // Month es 0-indexed en Date constructor
            return new Date(yB, mB - 1, dB) - new Date(yA, mA - 1, dA);
        });

        // Renderizar cada grupo de fecha
        sortedDates.forEach(date => {
            const dateHeading = document.createElement('h2');
            dateHeading.classList.add('history-date-header');
            dateHeading.innerHTML = `<i class="fas fa-calendar-alt"></i> ${date}`;
            historyLog.appendChild(dateHeading);

            const entriesForDate = groupedByDate[date];
            // Dentro de cada fecha, ordenar entradas (quizás por ejercicio o timestamp si necesario, opcional)
             // Por ahora, las mostramos en el orden en que llegaron de processAndGroupData (ordenadas por timestamp desc)

            entriesForDate.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.classList.add('history-entry');
                entryDiv.dataset.workoutId = entry.id || ''; // Guardar ID para referencia

                // Formato de series
                let setsHTML = (entry.sets || [])
                    .sort((a, b) => (a.set || 0) - (b.set || 0)) // Ordenar series por número
                    .map(s => `<li class="history-set-item">Serie ${s.set || '?'}: <strong>${s.reps || 0}</strong> reps → <strong>${s.weight || 0}</strong> kg</li>`)
                    .join('');

                // Botones de acción
                const entryId = entry.id || ''; // Usar ID real para las funciones
                const deleteButtonHTML = `
                    <button class="button-delete"
                            onclick="deleteEntry('${entryId}')"
                            ${!entryId ? 'disabled title="No se puede eliminar (ID inválido)"' : 'title="Eliminar este registro completo"'} >
                        <i class="fas fa-trash-alt"></i> Eliminar
                    </button>`;
                const editButtonHTML = `
                    <button class="button-edit"
                            disabled
                            onclick="editEntry('${entryId}')"
                            ${!entryId ? 'disabled title="No se puede editar (ID inválido)"' : 'title="Editar registro (Próximamente)"'} >
                        <i class="fas fa-pencil-alt"></i> Editar
                    </button>`; // Botón editar deshabilitado

                entryDiv.innerHTML = `
                    <h3 class="history-exercise-title">
                        <i class="fas fa-dumbbell"></i> ${entry.exercise || 'Ejercicio Desconocido'}
                    </h3>
                    <ul class="history-sets-list">${setsHTML || '<li>No hay series registradas.</li>'}</ul>
                    <div class="history-entry-actions">
                        ${editButtonHTML}
                        ${deleteButtonHTML}
                    </div>`;
                historyLog.appendChild(entryDiv);
            });
        });
     }

    // Maneja el cambio en el input de fecha
    function handleFilterChange() {
        const selectedDate = filterDateInput.value; // Formato YYYY-MM-DD

        if (!selectedDate) {
            loadInitialHistory(); // Si se borra la fecha, cargar recientes
            return;
        }

        // Validar formato básico YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
             showNotification("Formato de fecha inválido. Usa el selector.", "error");
             filterDateInput.value = ''; // Limpiar input inválido
             return;
        }

        // Convertir YYYY-MM-DD a DD/MM/YYYY para comparar con loadedDatesSet
        let dateToCheck_DDMMYYYY;
        try {
            const [y, m, d] = selectedDate.split('-');
            dateToCheck_DDMMYYYY = `${d}/${m}/${y}`;
        } catch (e) {
            showNotification("Error al procesar fecha seleccionada.", "error");
            return;
        }


        hideHistorySpinner(); // No spinner para filtro local

        // Intentar filtrar localmente
        if (loadedDatesSet.has(dateToCheck_DDMMYYYY)) {
             console.log("Filtrando localmente para", dateToCheck_DDMMYYYY);
             const filtered = initiallyLoadedData.filter(e => {
                 if (!e.timestamp || typeof e.timestamp !== 'number') return false;
                 try {
                     const entryDateStr = new Date(e.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                     return entryDateStr === dateToCheck_DDMMYYYY;
                 } catch { return false; }
             });

             // Actualizar título para la fecha filtrada
             if (historyTitleElement) {
                  try {
                     // Usar la fecha ya formateada
                     historyTitleElement.textContent = `Historial para ${dateToCheck_DDMMYYYY}`;
                  } catch(e) { historyTitleElement.textContent = `Historial para ${selectedDate}`;}
             }
             displayGroupedHistory(filtered); // Mostrar datos filtrados

        } else {
            // Si la fecha no está en los datos locales, pedirla al servidor
            console.log("Fecha no encontrada localmente. Pidiendo al servidor:", selectedDate);
            loadSpecificDateHistory(selectedDate); // Llama con YYYY-MM-DD
        }
     }

    // Botón "Mostrar Recientes"
    function handleClearFilter() {
        console.log("Limpiando filtro y mostrando recientes");
        // filterDateInput.value = ''; // loadInitialHistory ya lo hace
        loadInitialHistory();
    }


    // --- Funciones para la Gráfica ---
    function populateGraphExerciseSelect(data) {
        // Obtener lista única y ordenada de ejercicios de los datos
        const exercises = [...new Set((data || [])
                .map(e => e ? e.exercise : null)
                .filter(ex => ex) // Filtrar nulos o vacíos
            )]
            .sort(); // Ordenar alfabéticamente

        // Limpiar y rellenar el select
        graphExerciseSelect.innerHTML = '<option value="" disabled selected>-- Selecciona ejercicio --</option>';
        exercises.forEach(ex => {
            const o = document.createElement('option');
            o.value = ex;
            o.textContent = ex;
            graphExerciseSelect.appendChild(o);
        });

        // Resetear estado
        graphExerciseSelect.value = ""; // Deseleccionar
        showGraphBtn.disabled = true; // Deshabilitar botón mostrar
        hideProgressGraph(); // Ocultar gráfica si estaba visible
    }

    function handleGraphExerciseSelectChange() {
        // Habilitar botón "Mostrar Gráfica" solo si se ha seleccionado un ejercicio
        showGraphBtn.disabled = !graphExerciseSelect.value;
        // Opcional: Ocultar gráfica si se cambia de ejercicio?
        // hideProgressGraph();
    }

    function calculateEpleyE1RM(weight, reps) {
        // Asegurar que weight y reps son números válidos y positivos
        if (typeof weight !== 'number' || typeof reps !== 'number' || isNaN(weight) || isNaN(reps) || weight <= 0 || reps <= 0) {
            return 0; // No se puede calcular
        }
        // Fórmula de Epley: e1RM = weight * (1 + reps / 30)
        return weight * (1 + (reps / 30));
    }

    function calculateAverageDailyE1RM(allData, exerciseName) {
        // Filtrar entradas solo para el ejercicio seleccionado
        const exerciseEntries = (allData || []).filter(e => e && e.exercise === exerciseName);

        // Agrupar e1RM por día
        const dailyE1RMValues = {};
        exerciseEntries.forEach(entry => {
            if (!entry.timestamp || typeof entry.timestamp !== 'number') return; // Saltar si no hay timestamp

            // Usar YYYY-MM-DD como clave para agrupar y ordenar fácilmente
            let dateKey;
            try {
                dateKey = new Date(entry.timestamp).toISOString().split('T')[0];
            } catch (e) { return; } // Saltar si la fecha es inválida

            if (!dailyE1RMValues[dateKey]) dailyE1RMValues[dateKey] = [];

            // Calcular e1RM para cada set válido y añadirlo al día correspondiente
            (entry.sets || []).forEach(set => {
                if (set) {
                    const e1rm = calculateEpleyE1RM(set.weight, set.reps);
                    if (e1rm > 0) { // Solo añadir si el cálculo fue válido
                        dailyE1RMValues[dateKey].push(e1rm);
                    }
                }
            });
        });

        // Calcular promedio diario y preparar datos para Chart.js
        const chartData = [];
        for (const dateKey in dailyE1RMValues) {
            const e1rms = dailyE1RMValues[dateKey];
            if (e1rms.length > 0) { // Solo si hubo cálculos válidos para ese día
                const sum = e1rms.reduce((a, b) => a + b, 0);
                const average = sum / e1rms.length;
                chartData.push({
                    date: dateKey, // YYYY-MM-DD
                    avgE1RM: parseFloat(average.toFixed(2)) // Redondear a 2 decimales
                });
            }
        }

        // Ordenar por fecha ascendente (importante para gráfica de líneas)
        chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

        return chartData;
    }

    function displayExerciseProgressGraph() {
        const selectedExercise = graphExerciseSelect.value;
        if (!selectedExercise) return;

        console.log(`Generando gráfica para: ${selectedExercise}`);
        // Usar initiallyLoadedData como fuente para la gráfica
        const progressData = calculateAverageDailyE1RM(initiallyLoadedData, selectedExercise);

        // Validar si hay suficientes datos para una gráfica útil
        if (progressData.length < 2) {
            showNotification(`Se necesitan al menos 2 días con registros válidos para graficar ${selectedExercise}.`, 'info', 4000);
            hideProgressGraph(); // Ocultar si no hay datos suficientes
            return;
        }

        // Preparar labels (fechas cortas DD/MM) y dataPoints (e1RM)
        const labels = progressData.map(item => {
            try {
                // Convertir YYYY-MM-DD a Date y luego a DD/MM
                const d = new Date(item.date + 'T00:00:00'); // Evitar problemas UTC
                return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
            } catch (e) { return '?'; } // Fallback
        });
        const dataPoints = progressData.map(item => item.avgE1RM);

        // Verificar que haya algún dato > 0 (evitar gráficas planas en cero)
        if (!dataPoints.some(p => p > 0)) {
             showNotification(`No se pudo calcular un e1RM válido para ${selectedExercise}. Revisa los pesos/reps registrados.`, 'info', 4000);
             hideProgressGraph();
             return;
        }

        // Destruir instancia anterior si existe
        if (progressChartInstance) progressChartInstance.destroy();

        try {
            // Crear nueva instancia de Chart.js
            progressChartInstance = new Chart(chartCanvas, {
                type: 'line',
                data: {
                    labels: labels, // Eje X: Fechas DD/MM
                    datasets: [{
                        label: `Progreso - ${selectedExercise}`, // Leyenda
                        data: dataPoints, // Eje Y: e1RM Medio
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1, // Ligeramente suavizado
                        fill: true, // Rellenar área bajo la línea
                        pointRadius: 4,
                        pointBackgroundColor: 'rgb(75, 192, 192)'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Clave para responsividad móvil
                    scales: {
                        y: {
                            beginAtZero: false, // Empezar eje Y cerca del valor mínimo
                            title: { display: true, text: 'e1RM Medio (kg)' }
                        },
                        x: {
                            title: { display: false } // Ocultar título eje X ("Fecha")
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top', // Leyenda arriba
                            labels: { padding: 15 }
                        },
                        tooltip: {
                            // Tooltips personalizados para mostrar más info
                            callbacks: {
                                title: function(tooltipItems) {
                                    // Mostrar fecha completa (DD/MM/YYYY) en el título del tooltip
                                    if (!tooltipItems.length) return '';
                                    const dataIndex = tooltipItems[0].dataIndex;
                                    // Acceder a progressData (calculada antes) para obtener fecha completa
                                    if (progressData && progressData[dataIndex]) {
                                        const fullDate = progressData[dataIndex].date; // YYYY-MM-DD
                                        try {
                                            const d = new Date(fullDate + 'T00:00:00');
                                            return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                        } catch { return labels[dataIndex] || ''; } // Fallback a DD/MM
                                    }
                                    return labels[dataIndex] || ''; // Fallback
                                },
                                label: function(context) {
                                    // Mostrar "e1RM Medio: VALOR kg" en el cuerpo del tooltip
                                    let label = context.dataset.label || '';
                                    if (label) { label += ': '; }
                                    if (context.parsed?.y !== null && context.parsed?.y !== undefined) {
                                        label = `e1RM Medio: ${context.parsed.y.toFixed(2)} kg`;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
            console.log("Gráfica creada/actualizada.");
            // Mostrar contenedor y botón de ocultar
            graphContainer.style.display = 'block';
            hideGraphBtn.style.display = 'inline-block';
            // Opcional: Scroll hacia la gráfica
            // graphSection.scrollIntoView({ behavior: 'smooth' });

        } catch (err) {
            console.error("Error al crear la gráfica con Chart.js:", err);
            showNotification("Error interno al generar la gráfica.", 'error');
            hideProgressGraph(); // Asegurarse de ocultar todo si falla
        }
    }

    function hideProgressGraph() {
        if(progressChartInstance){
            progressChartInstance.destroy();
            progressChartInstance = null;
            console.log("Gráfica destruida.");
        }
        graphContainer.style.display = 'none';
        hideGraphBtn.style.display = 'none';
        // No resetear el select aquí, permitir al usuario ver otro ejercicio
    }


    // --- Funciones de Borrado, Edición ---
    window.deleteEntry = async function(id) {
        if (!id) {
            console.error("ID inválido para eliminar.");
            showNotification("No se puede eliminar: ID de registro no encontrado.", 'error');
            return;
        }

        // Confirmación del usuario (importante para borrado)
        // Podría reemplazarse por un modal personalizado
        if (confirm(`¿Estás seguro de que quieres eliminar este registro completo?\nWorkout ID: ${id}\n\nEsta acción no se puede deshacer.`)) {

            if (!SCRIPT_URL) {
                showNotification("Error: URL del script no configurada.", 'error', 5000);
                return;
            }

            // Mostrar spinner sobre el historial mientras se procesa
            showHistorySpinner(`Eliminando registro ${id}...`);

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    // mode: 'cors', // Probar sin mode
                    body: JSON.stringify({ action: 'delete', id: id })
                });

                // Parsear respuesta
                let result;
                 try {
                     result = await response.json();
                 } catch (parseError) {
                      console.error("Error al parsear respuesta JSON de eliminación:", parseError);
                      const responseText = await response.text();
                      console.error("Respuesta de eliminación (texto):", responseText);
                      if (!response.ok) {
                           throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
                      } else {
                           throw new Error("Respuesta inesperada del servidor al eliminar (no JSON).");
                      }
                 }


                // El spinner se oculta dentro de loadInitialHistory() si tiene éxito
                // O se oculta explícitamente en el catch o si el script devuelve error

                if (result && result.status === 'success') {
                    showNotification(result.message || 'Registro eliminado con éxito.', 'success');
                    // Recargar historial para reflejar el cambio (esto oculta el spinner también)
                    loadInitialHistory();
                } else {
                    // Error devuelto por el script
                    hideHistorySpinner(); // Ocultar spinner manualmente si falla
                    showNotification(`Error al eliminar: ${result?.message || 'Respuesta inválida'}`, 'error', 5000);
                }

            } catch (error) {
                hideHistorySpinner(); // Asegurar que se oculte en error de red/fetch/parse
                console.error('Error en fetch al eliminar:', error);
                showNotification(`Error de conexión o servidor al eliminar: ${error.message}`, 'error', 5000);
            }
            // No se necesita finally si la gestión del spinner está cubierta
        } else {
             console.log("Eliminación cancelada por el usuario.");
        }
    }

    window.editEntry = function(id) {
        // Placeholder para funcionalidad futura
        showNotification(`Función Editar (ID: ${id}) aún no implementada.`, 'info');
        console.log("Intento de editar ID:", id);
        // Aquí iría la lógica para:
        // 1. Encontrar los datos de 'id' en 'initiallyLoadedData'.
        // 2. Poblar el formulario principal con esos datos.
        // 3. Cambiar el botón de "Guardar" a "Actualizar".
        // 4. Modificar handleFormSubmit para enviar 'action: update' con el 'id'.
        // 5. El backend necesitaría manejar 'action: update'.
    }

    // --- Utilidad para estado de carga del botón Submit ---
    function setLoading(isLoading, message = 'Guardando...') {
        const saveIconHTML = '<i class="fas fa-save"></i> Guardar Entrenamiento';
        const loadingIconHTML = '<i class="fas fa-spinner fa-spin"></i>'; // Icono giratorio

        if (!submitButton) return; // Salir si el botón no existe

        if (isLoading) {
            submitButton.disabled = true;
            // Usar textContent para el mensaje para evitar inyección si message viniera de fuera
            submitButton.innerHTML = `${loadingIconHTML} <span class="button-text">${message}</span>`;
        } else {
            submitButton.disabled = false;
            submitButton.innerHTML = saveIconHTML;
        }
    }

    // --- Inicialización al cargar la página ---
    function initializeApp() {
        console.log("Inicializando Gym Tracker App...");
        // Establecer estado inicial del botón guardar
        if (submitButton) {
            submitButton.innerHTML = `<i class="fas fa-save"></i> Guardar Entrenamiento`;
            submitButton.disabled = false; // Asegurar que esté habilitado al inicio
        }
        // Asegurar que el botón "+" para añadir series exista desde el principio
        addAddSetButton();
        // Cargar el historial inicial (esto también poblará el select de la gráfica)
        loadInitialHistory();
        // Opcional: poner focus en el primer campo útil (selector de ejercicio)
        // exerciseSelect.focus();
    }

    // Ejecutar inicialización
    initializeApp();

}); // Fin DOMContentLoaded