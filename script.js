document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFKlZunWd5cvnNdtERuUWEu5CXiq-csMPECnyzBjoC7UO8QDZHQHI9OwPOKizwclFX/exec';
    const INITIAL_DAYS_TO_LOAD = 7; // Número de días distintos a cargar inicialmente
    // ---------------------

    // --- Elementos del DOM ---
    const form = document.getElementById('workout-form');
    const exerciseSelect = document.getElementById('exercise');
    const customExerciseGroup = document.getElementById('custom-exercise-group');
    const customExerciseInput = document.getElementById('custom-exercise-name');
    const setsInput = document.getElementById('sets');
    const setsInputsContainer = document.getElementById('sets-inputs');
    const historyLog = document.getElementById('history-log');
    const submitButton = form.querySelector('button[type="submit"]');
    // Filtro
    const filterDateInput = document.getElementById('filter-date');
    const clearFilterBtn = document.getElementById('clear-filter-btn');
    // Gráfica
    const graphSection = document.getElementById('progress-section'); // Contenedor de la sección
    const graphExerciseSelect = document.getElementById('graph-exercise-select');
    const showGraphBtn = document.getElementById('show-graph-btn');
    const hideGraphBtn = document.getElementById('hide-graph-btn');
    const graphContainer = document.getElementById('graph-container');
    const chartCanvas = document.getElementById('progress-chart').getContext('2d'); // Contexto 2D del canvas

    // --- Variables Globales ---
    let initiallyLoadedData = []; // Datos de la carga inicial
    let loadedDatesSet = new Set(); // Fechas (DD/MM/YYYY) cargadas inicialmente
    let progressChartInstance = null; // Para almacenar la instancia de Chart.js

    // --- Event Listeners ---
    exerciseSelect.addEventListener('change', handleExerciseChange);
    setsInput.addEventListener('change', handleSetsChange);
    form.addEventListener('submit', handleFormSubmit);
    filterDateInput.addEventListener('change', handleFilterChange);
    clearFilterBtn.addEventListener('click', handleClearFilter);
    // Gráfica
    graphExerciseSelect.addEventListener('change', handleGraphExerciseSelectChange);
    showGraphBtn.addEventListener('click', displayExerciseProgressGraph);
    hideGraphBtn.addEventListener('click', hideProgressGraph);


    // --- Funciones del Formulario y Series (Sin cambios) ---
    function handleExerciseChange() { /* ... sin cambios ... */
        if (exerciseSelect.value === 'custom') { customExerciseGroup.style.display = 'block'; customExerciseInput.required = true; }
        else { customExerciseGroup.style.display = 'none'; customExerciseInput.required = false; customExerciseInput.value = ''; }
     }
    function handleSetsChange() { /* ... sin cambios ... */ generateSetsInputs(parseInt(setsInput.value) || 0); }
    function generateSetsInputs(numberOfSets) { /* ... sin cambios ... */
        setsInputsContainer.innerHTML = '';
        if (numberOfSets > 0 && numberOfSets <= 20) { for (let i = 1; i <= numberOfSets; i++) { addSingleSetInput(i); } }
        else if (numberOfSets > 20) { setsInputsContainer.innerHTML = '<p style="color:red;">Demasiadas series...</p>'; return; }
        addAddSetButton(); updateSetNumbers();
     }
    function addSingleSetInput(setNumber) { /* ... sin cambios ... */
        const setGroup = document.createElement('div'); setGroup.classList.add('set-group');
        setGroup.innerHTML = `<strong>Serie ${setNumber}:</strong> <label for="reps-set-${setNumber}">Reps:</label> <input type="number" id="reps-set-${setNumber}" name="reps-set-${setNumber}" min="0" required> <label for="weight-set-${setNumber}">Peso (kg):</label> <input type="number" id="weight-set-${setNumber}" name="weight-set-${setNumber}" min="0" step="0.1" required> <button type="button" class="remove-set-btn" onclick="removeSetInput(this)" title="Quitar serie">X</button>`;
        const addButton = document.getElementById('add-set-button');
        if (addButton) { setsInputsContainer.insertBefore(setGroup, addButton); } else { setsInputsContainer.appendChild(setGroup); }
    }
    function addAddSetButton() { /* ... sin cambios ... */
        if (!document.getElementById('add-set-button')) { const addButton = document.createElement('button'); addButton.type = 'button'; addButton.id = 'add-set-button'; addButton.innerHTML = `<i class="fas fa-plus"></i> Añadir Serie`; addButton.onclick = addSetInput; setsInputsContainer.appendChild(addButton); }
     }
    window.addSetInput = function() { /* ... sin cambios ... */
        const currentSets = setsInputsContainer.querySelectorAll('.set-group').length; const nextSetNumber = currentSets + 1;
        if (nextSetNumber > 20) { alert("Máximo 20 series."); return; }
        addSingleSetInput(nextSetNumber); updateSetNumbers();
     }
    window.removeSetInput = function(button) { /* ... sin cambios ... */ button.closest('.set-group').remove(); updateSetNumbers(); }
    function updateSetNumbers() { /* ... sin cambios ... */
        const setGroups = setsInputsContainer.querySelectorAll('.set-group');
        setGroups.forEach((group, index) => { const setNumber = index + 1; group.querySelector('strong').textContent = `Serie ${setNumber}:`; group.querySelector('label[for^="reps-set"]').setAttribute('for', `reps-set-${setNumber}`); group.querySelector('input[id^="reps-set"]').id = `reps-set-${setNumber}`; group.querySelector('input[id^="reps-set"]').name = `reps-set-${setNumber}`; group.querySelector('label[for^="weight-set"]').setAttribute('for', `weight-set-${setNumber}`); group.querySelector('input[id^="weight-set"]').id = `weight-set-${setNumber}`; group.querySelector('input[id^="weight-set"]').name = `weight-set-${setNumber}`; });
        setsInput.value = setGroups.length;
     }

    // --- Función de Guardado (Sin cambios) ---
    async function handleFormSubmit(event) { /* ... sin cambios ... */
        event.preventDefault();
        if (!SCRIPT_URL) { alert("URL script no configurada."); return; }
        const exerciseName = exerciseSelect.value === 'custom' ? customExerciseInput.value.trim() : exerciseSelect.value;
        const setGroups = setsInputsContainer.querySelectorAll('.set-group'); const numberOfSets = setGroups.length; const setsData = [];
        if (!exerciseName) { alert("Selecciona o introduce un ejercicio."); return; }
        if (numberOfSets === 0) { alert("Añade al menos una serie."); return; }
        let formIsValid = true;
        for (let i = 0; i < numberOfSets; i++) { const setGroup = setGroups[i]; const setNumber = i + 1; const repsInput = setGroup.querySelector(`input[id^="reps-set"]`); const weightInput = setGroup.querySelector(`input[id^="weight-set"]`); if (!repsInput || !weightInput || repsInput.value === '' || weightInput.value === '') { alert(`Completa Reps y Peso para la Serie ${setNumber}.`); formIsValid = false; break; } setsData.push({ set: setNumber, reps: parseInt(repsInput.value), weight: parseFloat(weightInput.value) }); }
        if (!formIsValid) { return; }
        const workoutEntry = { exercise: exerciseName, sets: setsData }; setLoading(true, 'Guardando...'); try { const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'save', data: workoutEntry }) }); const result = await response.json(); if (result.status === 'success') { alert('¡Guardado!'); form.reset(); customExerciseGroup.style.display = 'none'; setsInputsContainer.innerHTML = ''; addAddSetButton(); setsInput.value = ''; loadInitialHistory(); } else { console.error('Error script:', result.message); alert(`Error: ${result.message}`); } } catch (error) { console.error('Error fetch:', error); alert(`Error conexión: ${error.message}.`); } finally { setLoading(false); }
     }

    // --- Funciones de Carga y Filtro Historial (Modificada loadInitialHistory) ---
    async function fetchHistoryData(specificDate = null) { /* ... sin cambios ... */
        if (!SCRIPT_URL) { console.error("URL script no configurada."); return { status: "error", message: "URL script no configurada." }; }
        let fetchUrl = SCRIPT_URL + (specificDate ? `?load=specific&date=${specificDate}` : `?load=recent&days=${INITIAL_DAYS_TO_LOAD}`);
        console.log("Fetching:", fetchUrl); try { const response = await fetch(fetchUrl, { method: 'GET', mode: 'cors' }); const result = await response.json(); console.log("Received:", result); return result; } catch (error) { console.error('Error fetch historial:', error); return { status: "error", message: `Error conexión: ${error.message}` }; }
     }

    async function loadInitialHistory() {
        historyLog.innerHTML = '<p>Cargando historial reciente...</p>';
        filterDateInput.value = '';
        hideProgressGraph(); // Ocultar gráfica al recargar

        const result = await fetchHistoryData();

        if (result.status === 'success') {
            initiallyLoadedData = result.data;
            loadedDatesSet.clear();
            initiallyLoadedData.forEach(entry => { const dateStr = new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); loadedDatesSet.add(dateStr); });
            console.log("Fechas iniciales cargadas:", loadedDatesSet);
            displayGroupedHistory(initiallyLoadedData);
            populateGraphExerciseSelect(initiallyLoadedData); // <-- Poblar select de gráfica
        } else { /* ... manejo error igual ... */
            historyLog.innerHTML = `<p style="color:red;">${result.message}</p>`; initiallyLoadedData = []; loadedDatesSet.clear(); populateGraphExerciseSelect([]); // Limpiar select en caso de error
        }
    }
    async function loadSpecificDateHistory(dateYYYYMMDD) { /* ... sin cambios ... */
         historyLog.innerHTML = `<p>Cargando datos para ${dateYYYYMMDD}...</p>`; hideProgressGraph(); const result = await fetchHistoryData(dateYYYYMMDD);
         if (result.status === 'success') { displayGroupedHistory(result.data); }
         else { historyLog.innerHTML = `<p style="color:red;">${result.message}</p>`; }
     }
    function displayGroupedHistory(historyData) { /* ... sin cambios ... */
        historyLog.innerHTML = '';
        if (!historyData || historyData.length === 0) { historyLog.innerHTML = filterDateInput.value ? `<p>No hay registros para ${filterDateInput.value}.</p>` : '<p>No hay registros recientes.</p>'; return; }
        const groupedByDate = historyData.reduce((acc, entry) => { const dateStr = new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); if (!acc[dateStr]) acc[dateStr] = []; acc[dateStr].push(entry); return acc; }, {});
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => { const [dA, mA, yA] = a.split('/').map(Number); const [dB, mB, yB] = b.split('/').map(Number); return new Date(yB, mB - 1, dB) - new Date(yA, mA - 1, dA); });
        sortedDates.forEach(date => { const dateHeading = document.createElement('h2'); dateHeading.classList.add('history-date-header'); dateHeading.innerHTML = `<i class="fas fa-calendar-alt"></i> ${date}`; historyLog.appendChild(dateHeading); const entries = groupedByDate[date]; entries.forEach(entry => { const entryDiv = document.createElement('div'); entryDiv.classList.add('history-entry'); let setsHTML = ''; entry.sets.sort((a, b) => a.set - b.set).forEach(s => { setsHTML += `<li class="history-set-item">S${s.set}: ${s.reps}r @ ${s.weight}kg</li>`; }); entryDiv.innerHTML = `<h3 class="history-exercise-title"><i class="fas fa-dumbbell"></i> ${entry.exercise}</h3><ul class="history-sets-list">${setsHTML}</ul><div class="history-entry-actions"><button class="button-delete" onclick="deleteEntry('${entry.id}')"><i class="fas fa-trash-alt"></i> Eliminar</button><button class="button-edit" disabled onclick="editEntry('${entry.id}')"><i class="fas fa-pencil-alt"></i> Editar</button></div>`; historyLog.appendChild(entryDiv); }); });
     }
    function handleFilterChange() { /* ... sin cambios ... */
        const selectedDate = filterDateInput.value; if (!selectedDate) { displayGroupedHistory(initiallyLoadedData); return; }
        const [y, m, d] = selectedDate.split('-'); const dateToCheck = `${d}/${m}/${y}`;
        if (loadedDatesSet.has(dateToCheck)) { console.log("Filtrando localmente"); const filtered = initiallyLoadedData.filter(e => new Date(e.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) === dateToCheck); displayGroupedHistory(filtered); }
        else { console.log("Pidiendo fecha específica"); loadSpecificDateHistory(selectedDate); }
     }
    function handleClearFilter() { /* ... sin cambios ... */ console.log("Limpiando filtro"); loadInitialHistory(); }


    // --- Funciones para la Gráfica ---

    /** Rellena el select con los ejercicios disponibles en los datos */
    function populateGraphExerciseSelect(data) {
        // Obtener nombres únicos de ejercicios
        const exercises = [...new Set(data.map(entry => entry.exercise))].sort();

        // Limpiar opciones anteriores (excepto la primera por defecto)
        graphExerciseSelect.innerHTML = '<option value="" disabled selected>-- Selecciona un ejercicio --</option>';

        // Añadir opciones
        exercises.forEach(ex => {
            const option = document.createElement('option');
            option.value = ex;
            option.textContent = ex;
            graphExerciseSelect.appendChild(option);
        });

        // Resetear estado de botones
        graphExerciseSelect.value = ""; // Asegurar que empieza sin selección
        showGraphBtn.disabled = true;
        hideProgressGraph(); // Asegurar que la gráfica esté oculta
    }

    /** Habilita/deshabilita el botón de mostrar gráfica */
    function handleGraphExerciseSelectChange() {
        showGraphBtn.disabled = !graphExerciseSelect.value; // Habilitar si hay valor seleccionado
    }

    /** Calcula el e1RM para una serie usando la fórmula de Epley */
    function calculateEpleyE1RM(weight, reps) {
        if (reps <= 0 || weight <= 0) return 0;
        // La fórmula es menos precisa para reps muy altas, pero la aplicamos igual
        return weight * (1 + (reps / 30));
    }

    /** Calcula la media diaria del e1RM para un ejercicio específico */
    function calculateAverageDailyE1RM(allData, exerciseName) {
        const exerciseEntries = allData.filter(entry => entry.exercise === exerciseName);

        // Agrupar series por día (usando YYYY-MM-DD para clave)
        const dailyE1RMValues = {}; // { 'YYYY-MM-DD': [e1rm1, e1rm2, ...] }

        exerciseEntries.forEach(entry => {
            const dateObj = new Date(entry.timestamp);
            // Usar UTC para evitar problemas de zona horaria al agrupar por día natural
            const dateKey = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD

            if (!dailyE1RMValues[dateKey]) {
                dailyE1RMValues[dateKey] = [];
            }

            entry.sets.forEach(set => {
                const e1rm = calculateEpleyE1RM(set.weight, set.reps);
                if (e1rm > 0) { // Solo incluir valores válidos
                    dailyE1RMValues[dateKey].push(e1rm);
                }
            });
        });

        // Calcular la media para cada día y preparar datos para la gráfica
        const chartData = [];
        for (const dateKey in dailyE1RMValues) {
            const e1rms = dailyE1RMValues[dateKey];
            if (e1rms.length > 0) {
                const sum = e1rms.reduce((a, b) => a + b, 0);
                const average = sum / e1rms.length;
                chartData.push({
                    date: dateKey, // YYYY-MM-DD
                    avgE1RM: parseFloat(average.toFixed(2)) // Redondear a 2 decimales
                });
            }
        }

        // Ordenar por fecha ascendente para la gráfica
        chartData.sort((a, b) => new Date(a.date) - new Date(b.date));

        return chartData;
    }


    /** Muestra la gráfica de progreso para el ejercicio seleccionado */
    function displayExerciseProgressGraph() {
        const selectedExercise = graphExerciseSelect.value;
        if (!selectedExercise) return;

        console.log(`Generando gráfica para: ${selectedExercise}`);

        // Calcular datos de e1RM promedio diario (usando TODOS los datos cargados inicialmente)
        // Consideración futura: pedir todos los datos de este ejercicio si se quiere más precisión
        const progressData = calculateAverageDailyE1RM(initiallyLoadedData, selectedExercise);

        if (progressData.length < 2) {
            alert(`No hay suficientes datos (${progressData.length}) para generar una gráfica de progreso para ${selectedExercise}. Registra más entrenamientos.`);
            return;
        }

        // Preparar datos para Chart.js
        const labels = progressData.map(item => {
             // Formatear fecha a DD/MM para labels más cortos
             const dateObj = new Date(item.date + 'T00:00:00'); // Asegurar parseo correcto
             return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        });
        const dataPoints = progressData.map(item => item.avgE1RM);

        // Destruir instancia anterior si existe
        if (progressChartInstance) {
            progressChartInstance.destroy();
            console.log("Instancia de gráfica anterior destruida.");
        }

        // Crear nueva gráfica
        try {
             progressChartInstance = new Chart(chartCanvas, {
                type: 'line', // Gráfica de líneas
                data: {
                    labels: labels, // Eje X: Fechas (DD/MM)
                    datasets: [{
                        label: `Progreso e1RM Medio (kg) - ${selectedExercise}`,
                        data: dataPoints, // Eje Y: Media e1RM
                        borderColor: 'rgb(75, 192, 192)', // Color de la línea
                        backgroundColor: 'rgba(75, 192, 192, 0.2)', // Color del área bajo la línea (opcional)
                        tension: 0.1, // Suavizado leve de la línea
                        fill: true, // Rellenar área bajo la línea
                        pointRadius: 4, // Tamaño de los puntos
                        pointBackgroundColor: 'rgb(75, 192, 192)', // Color de los puntos
                    }]
                },
                options: {
                    responsive: true, // Hacerla responsive
                    maintainAspectRatio: true, // Mantener aspect ratio (ajustar si se ve mal)
                    scales: {
                        y: {
                            beginAtZero: false, // Empezar eje Y cerca del valor mínimo
                            title: {
                                display: true,
                                text: 'e1RM Medio Estimado (kg)'
                            }
                        },
                        x: {
                             title: {
                                display: true,
                                text: 'Fecha (DD/MM)'
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                // Mostrar fecha completa y valor en tooltip
                                title: function(tooltipItems) {
                                     // Recuperar la fecha YYYY-MM-DD original del índice
                                     const index = tooltipItems[0].dataIndex;
                                     const originalDate = progressData[index].date;
                                     const dateObj = new Date(originalDate + 'T00:00:00');
                                     return dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                },
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        // Extraer el valor numérico del tooltip
                                        label = `e1RM Medio: ${context.parsed.y.toFixed(2)} kg`;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
            console.log("Nueva instancia de gráfica creada.");

            // Mostrar contenedor y botón de ocultar
            graphContainer.style.display = 'block';
            hideGraphBtn.style.display = 'inline-block'; // O 'block' según CSS

        } catch (chartError) {
             console.error("Error al crear la gráfica:", chartError);
             alert("Error al generar la gráfica.");
             hideProgressGraph(); // Ocultar si hay error
        }
    }

    /** Oculta la gráfica y resetea controles */
    function hideProgressGraph() {
        if (progressChartInstance) {
            progressChartInstance.destroy();
            progressChartInstance = null;
            console.log("Instancia de gráfica destruida.");
        }
        graphContainer.style.display = 'none';
        hideGraphBtn.style.display = 'none';
        // Opcional: resetear selección
        // graphExerciseSelect.value = "";
        // showGraphBtn.disabled = true;
    }


    // --- Funciones de Borrado, Edición y setLoading (Sin cambios) ---
    window.deleteEntry = async function(id) { /* ... sin cambios ... */
        if (!id) { console.error("ID inválido"); return; } if (confirm(`¿Seguro? (${id})`)) { if (!SCRIPT_URL) { alert("URL script no configurada."); return; } setLoading(true, 'Eliminando...'); try { const r = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'delete', id: id }) }); const res = await r.json(); if (res.status === 'success') { alert(res.message || 'Eliminado.'); loadInitialHistory(); } else { alert(`Error: ${res.message}`); } } catch (err) { alert(`Error conexión: ${err.message}.`); } finally { setLoading(false); } }
     }
    window.editEntry = function(id) { /* ... sin cambios ... */ alert(`Editar ID ${id} no implementado.`); }
    function setLoading(isLoading, message = 'Procesando...') { /* ... sin cambios ... */
        const defaultIcon = '<i class="fas fa-save"></i> '; const loadingIcon = '<i class="fas fa-spinner fa-spin"></i> ';
        if (isLoading) { submitButton.disabled = true; submitButton.innerHTML = `${loadingIcon} ${message}`; }
        else { submitButton.disabled = false; submitButton.innerHTML = `${defaultIcon} Guardar Entrenamiento`; }
     }

    // --- Inicialización ---
    if (submitButton) { // Icono inicial botón submit
        submitButton.innerHTML = `<i class="fas fa-save"></i> Guardar Entrenamiento`;
    }
    loadInitialHistory(); // Carga inicial
    handleExerciseChange(); // Estado inicial campo custom
    addAddSetButton(); // Botón añadir serie inicial
});