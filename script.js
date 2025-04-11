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
    // Nuevos elementos para el filtro
    const filterDateInput = document.getElementById('filter-date');
    const clearFilterBtn = document.getElementById('clear-filter-btn');


    // --- Variables Globales ---
    let initiallyLoadedData = []; // Almacenará solo los datos de la carga inicial (últimos X días)
    let loadedDatesSet = new Set(); // Para saber qué fechas (DD/MM/YYYY) se cargaron inicialmente

    // --- Event Listeners ---
    exerciseSelect.addEventListener('change', handleExerciseChange);
    setsInput.addEventListener('change', handleSetsChange);
    form.addEventListener('submit', handleFormSubmit);
    // Nuevos listeners para el filtro
    filterDateInput.addEventListener('change', handleFilterChange);
    clearFilterBtn.addEventListener('click', handleClearFilter);

    // --- Funciones del Formulario y Series (Sin cambios respecto a la versión anterior) ---
    function handleExerciseChange() { /* ... igual que antes ... */
        if (exerciseSelect.value === 'custom') {
            customExerciseGroup.style.display = 'block';
            customExerciseInput.required = true;
        } else {
            customExerciseGroup.style.display = 'none';
            customExerciseInput.required = false;
            customExerciseInput.value = '';
        }
    }
    function handleSetsChange() { /* ... igual que antes ... */
        generateSetsInputs(parseInt(setsInput.value) || 0);
     }
    function generateSetsInputs(numberOfSets) { /* ... igual que antes ... */
        setsInputsContainer.innerHTML = '';
        if (numberOfSets > 0 && numberOfSets <= 20) {
            for (let i = 1; i <= numberOfSets; i++) { addSingleSetInput(i); }
        } else if (numberOfSets > 20) {
            setsInputsContainer.innerHTML = '<p style="color:red;">Demasiadas series. Introduce un número menor (máx 20).</p>';
            return;
        }
        addAddSetButton();
        updateSetNumbers();
    }
    function addSingleSetInput(setNumber) { /* ... igual que antes ... */
        const setGroup = document.createElement('div');
        setGroup.classList.add('set-group');
        setGroup.innerHTML = `<strong>Serie ${setNumber}:</strong> <label for="reps-set-${setNumber}">Reps:</label> <input type="number" id="reps-set-${setNumber}" name="reps-set-${setNumber}" min="0" required> <label for="weight-set-${setNumber}">Peso (kg):</label> <input type="number" id="weight-set-${setNumber}" name="weight-set-${setNumber}" min="0" step="0.1" required> <button type="button" class="remove-set-btn" onclick="removeSetInput(this)" title="Quitar serie">X</button>`;
        const addButton = document.getElementById('add-set-button');
        if (addButton) { setsInputsContainer.insertBefore(setGroup, addButton); } else { setsInputsContainer.appendChild(setGroup); }
    }
    function addAddSetButton() { /* ... igual que antes ... */
        if (!document.getElementById('add-set-button')) {
            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.id = 'add-set-button';
            addButton.innerHTML = `<i class="fas fa-plus"></i> Añadir Serie`;
            addButton.onclick = addSetInput;
            setsInputsContainer.appendChild(addButton);
        }
    }
    window.addSetInput = function() { /* ... igual que antes ... */
        const currentSets = setsInputsContainer.querySelectorAll('.set-group').length;
        const nextSetNumber = currentSets + 1;
        if (nextSetNumber > 20) { alert("Máximo 20 series alcanzado."); return; }
        addSingleSetInput(nextSetNumber);
        updateSetNumbers();
    }
    window.removeSetInput = function(button) { /* ... igual que antes ... */
        button.closest('.set-group').remove();
        updateSetNumbers();
    }
    function updateSetNumbers() { /* ... igual que antes ... */
        const setGroups = setsInputsContainer.querySelectorAll('.set-group');
        setGroups.forEach((group, index) => {
            const setNumber = index + 1;
            group.querySelector('strong').textContent = `Serie ${setNumber}:`;
            group.querySelector('label[for^="reps-set"]').setAttribute('for', `reps-set-${setNumber}`);
            group.querySelector('input[id^="reps-set"]').id = `reps-set-${setNumber}`;
            group.querySelector('input[id^="reps-set"]').name = `reps-set-${setNumber}`;
            group.querySelector('label[for^="weight-set"]').setAttribute('for', `weight-set-${setNumber}`);
            group.querySelector('input[id^="weight-set"]').id = `weight-set-${setNumber}`;
            group.querySelector('input[id^="weight-set"]').name = `weight-set-${setNumber}`;
        });
        setsInput.value = setGroups.length;
    }

    // --- Función de Guardado (Sin cambios lógicos, pero recarga historial inicial) ---
    async function handleFormSubmit(event) {
        event.preventDefault();
        // ... (Validaciones igual que antes) ...
        if (!SCRIPT_URL) { alert("Error: URL del script no configurada."); return; }
        const exerciseName = exerciseSelect.value === 'custom' ? customExerciseInput.value.trim() : exerciseSelect.value;
        const setGroups = setsInputsContainer.querySelectorAll('.set-group');
        const numberOfSets = setGroups.length;
        const setsData = [];
        if (!exerciseName) { alert("Selecciona o introduce un ejercicio."); return; }
        if (numberOfSets === 0) { alert("Añade al menos una serie."); return; }
        let formIsValid = true;
        for (let i = 0; i < numberOfSets; i++) { /* ... Validación de series igual ... */
            const setGroup = setGroups[i]; const setNumber = i + 1;
            const repsInput = setGroup.querySelector(`input[id^="reps-set"]`); const weightInput = setGroup.querySelector(`input[id^="weight-set"]`);
            if (!repsInput || !weightInput || repsInput.value === '' || weightInput.value === '') { alert(`Completa Reps y Peso para la Serie ${setNumber}.`); formIsValid = false; break; }
            setsData.push({ set: setNumber, reps: parseInt(repsInput.value), weight: parseFloat(weightInput.value) });
        }
        if (!formIsValid) { return; }
        const workoutEntry = { exercise: exerciseName, sets: setsData };

        setLoading(true, 'Guardando...');
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'save', data: workoutEntry }) });
            const result = await response.json();
            if (result.status === 'success') {
                alert('¡Entrenamiento guardado con éxito!');
                form.reset();
                customExerciseGroup.style.display = 'none';
                setsInputsContainer.innerHTML = '';
                addAddSetButton();
                setsInput.value = '';
                loadInitialHistory(); // <--- Recargar la vista inicial (últimos días)
            } else { /* ... manejo de error igual ... */
                console.error('Error del script:', result.message); alert(`Error al guardar: ${result.message}`);
            }
        } catch (error) { /* ... manejo de error igual ... */
            console.error('Error en fetch:', error); alert(`Error de conexión al guardar: ${error.message}.`);
        } finally {
            setLoading(false);
        }
    }

    // --- Funciones de Carga y Visualización del Historial (MODIFICADAS para filtro) ---

    /**
     * Carga el historial desde el script.
     * Puede cargar los últimos X días (por defecto) o una fecha específica.
     * @param {string|null} specificDate - Fecha en formato 'YYYY-MM-DD' o null para carga inicial.
     */
    async function fetchHistoryData(specificDate = null) {
        if (!SCRIPT_URL) {
            console.error("Error: URL del script no configurada.");
            return { status: "error", message: "URL del script no configurada." }; // Devolver objeto de error
        }

        let fetchUrl = SCRIPT_URL;
        if (specificDate) {
            // Pedir fecha específica
            fetchUrl += `?load=specific&date=${specificDate}`;
        } else {
            // Pedir carga inicial (últimos X días)
            fetchUrl += `?load=recent&days=${INITIAL_DAYS_TO_LOAD}`;
        }

        console.log("Fetching data from:", fetchUrl); // Para depuración

        try {
            const response = await fetch(fetchUrl, { method: 'GET', mode: 'cors' });
            const result = await response.json();
            console.log("Data received:", result); // Para depuración
            return result; // Devolver el resultado completo (incluye status y data/message)
        } catch (error) {
            console.error('Error en fetch al cargar historial:', error);
            return { status: "error", message: `Error de conexión al cargar: ${error.message}` }; // Devolver objeto de error
        }
    }

    /** Carga inicial de los últimos días y los muestra */
    async function loadInitialHistory() {
        historyLog.innerHTML = '<p>Cargando historial reciente...</p>';
        filterDateInput.value = ''; // Limpiar el filtro de fecha

        const result = await fetchHistoryData(); // Llama sin fecha específica

        if (result.status === 'success') {
            initiallyLoadedData = result.data; // Guardar datos iniciales
            // Actualizar el set de fechas cargadas
            loadedDatesSet.clear();
            initiallyLoadedData.forEach(entry => {
                const dateStr = new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                loadedDatesSet.add(dateStr);
            });
            console.log("Fechas cargadas inicialmente:", loadedDatesSet); // Para depuración
            displayGroupedHistory(initiallyLoadedData); // Mostrar datos iniciales
        } else {
            historyLog.innerHTML = `<p style="color:red;">${result.message}</p>`;
            initiallyLoadedData = []; // Limpiar si hay error
            loadedDatesSet.clear();
        }
    }

    /** Carga y muestra los datos de una fecha específica */
    async function loadSpecificDateHistory(dateYYYYMMDD) {
         historyLog.innerHTML = `<p>Cargando datos para ${dateYYYYMMDD}...</p>`;
         const result = await fetchHistoryData(dateYYYYMMDD); // Pide la fecha específica

         if (result.status === 'success') {
             // Mostrar los datos recibidos para esa fecha específica
             // NO los guardamos en initiallyLoadedData
             displayGroupedHistory(result.data);
         } else {
             historyLog.innerHTML = `<p style="color:red;">${result.message}</p>`;
         }
    }


    /** Muestra los datos del historial agrupados por fecha (sin cambios en su lógica interna) */
    function displayGroupedHistory(historyData) {
        historyLog.innerHTML = '';
        if (!historyData || historyData.length === 0) {
            // Ajustar mensaje si el filtro está activo
            if (filterDateInput.value) {
                 historyLog.innerHTML = `<p>No hay registros para la fecha ${filterDateInput.value}.</p>`;
            } else {
                historyLog.innerHTML = '<p>No hay registros recientes.</p>'; // Mensaje por defecto
            }
            return;
        }
        // ... (resto del código de displayGroupedHistory igual que antes, agrupando y mostrando) ...
         const groupedByDate = historyData.reduce((acc, entry) => { /* ... igual ... */
             const entryDateObject = new Date(entry.timestamp);
             const displayDate = entryDateObject.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
             if (!acc[displayDate]) { acc[displayDate] = []; }
             acc[displayDate].push(entry);
             return acc;
         }, {});
         const sortedDates = Object.keys(groupedByDate).sort((a, b) => { /* ... igual ... */
             const [dayA, monthA, yearA] = a.split('/').map(Number); const [dayB, monthB, yearB] = b.split('/').map(Number);
             const dateA = new Date(yearA, monthA - 1, dayA); const dateB = new Date(yearB, monthB - 1, dayB);
             return dateB - dateA;
         });
         sortedDates.forEach(date => { /* ... igual ... */
             const dateHeading = document.createElement('h2'); dateHeading.classList.add('history-date-header'); dateHeading.innerHTML = `<i class="fas fa-calendar-alt"></i> ${date}`; historyLog.appendChild(dateHeading);
             const entriesForDate = groupedByDate[date];
             entriesForDate.forEach(entry => { /* ... igual ... */
                 const entryDiv = document.createElement('div'); entryDiv.classList.add('history-entry'); let setsDetails = '';
                 entry.sets.sort((a, b) => a.set - b.set).forEach(set => { setsDetails += `<li class="history-set-item">Serie ${set.set}: ${set.reps} reps @ ${set.weight} kg</li>`; });
                 entryDiv.innerHTML = `<h3 class="history-exercise-title"><i class="fas fa-dumbbell"></i> ${entry.exercise}</h3> <ul class="history-sets-list">${setsDetails}</ul> <div class="history-entry-actions"> <button class="button-delete" onclick="deleteEntry('${entry.id}')"><i class="fas fa-trash-alt"></i> Eliminar</button> <button class="button-edit" disabled onclick="editEntry('${entry.id}')"><i class="fas fa-pencil-alt"></i> Editar</button> </div>`;
                 historyLog.appendChild(entryDiv);
             });
         });
    }

    // --- NUEVAS Funciones para manejar el Filtro ---

    function handleFilterChange() {
        const selectedDateStr = filterDateInput.value; // Formato YYYY-MM-DD
        if (!selectedDateStr) {
            // Si se borra la fecha, mostrar los datos iniciales (sin recargar)
            displayGroupedHistory(initiallyLoadedData);
            return;
        }

        // Convertir YYYY-MM-DD a DD/MM/YYYY para comprobar contra loadedDatesSet
        const [year, month, day] = selectedDateStr.split('-');
        const dateToCheckDDMMYYYY = `${day}/${month}/${year}`;

        console.log(`Fecha seleccionada: ${selectedDateStr} (${dateToCheckDDMMYYYY})`);
        console.log("Fechas cargadas:", loadedDatesSet);

        // Comprobar si la fecha está en el set de fechas cargadas inicialmente
        // OJO: Esto asume que initiallyLoadedData REALMENTE solo tiene los últimos días.
        // Si el backend aún no está modificado, loadedDatesSet tendrá todas las fechas.
        // Una vez el backend funcione, esta lógica será correcta.
        if (loadedDatesSet.has(dateToCheckDDMMYYYY)) {
            console.log("Fecha encontrada en datos iniciales. Filtrando localmente.");
            // Filtrar los datos iniciales localmente
            const filteredData = initiallyLoadedData.filter(entry => {
                 const entryDateObject = new Date(entry.timestamp);
                 const entryDateStr = entryDateObject.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                 return entryDateStr === dateToCheckDDMMYYYY;
            });
            displayGroupedHistory(filteredData);
        } else {
            console.log("Fecha NO encontrada en datos iniciales. Pidiendo al servidor.");
            // La fecha no está en los datos cargados, pedirla específicamente al backend
            loadSpecificDateHistory(selectedDateStr); // Pasar YYYY-MM-DD
        }
    }

    function handleClearFilter() {
        console.log("Limpiando filtro, cargando historial inicial.");
        // Recargar (o simplemente mostrar) los datos iniciales
        loadInitialHistory(); // Esto hace una nueva petición para asegurar datos frescos
        // Alternativamente, si no queremos recargar:
        // filterDateInput.value = '';
        // displayGroupedHistory(initiallyLoadedData);
    }


    // --- Funciones de Borrado, Edición y setLoading (Sin cambios respecto a la versión anterior) ---
    window.deleteEntry = async function(id) { /* ... igual que antes ... */
        if (!id) { console.error("Intento de eliminar sin ID"); return; }
        if (confirm(`¿Estás seguro? (${id})`)) {
            if (!SCRIPT_URL) { alert("URL script no configurada."); return; }
            setLoading(true, 'Eliminando...');
            try { /* ... fetch POST delete igual ... */
                const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'delete', id: id }) });
                const result = await response.json();
                if (result.status === 'success') {
                    alert(result.message || 'Eliminado.');
                    loadInitialHistory(); // <-- Recargar vista inicial después de borrar
                } else { alert(`Error: ${result.message}`); }
            } catch (error) { alert(`Error conexión: ${error.message}.`); } finally { setLoading(false); }
        }
     }
    window.editEntry = function(id) { /* ... igual que antes ... */
        alert(`Editar ID ${id} no implementado.`);
     }
    function setLoading(isLoading, message = 'Procesando...') { /* ... igual que antes, con iconos ... */
        const defaultIconHTML = '<i class="fas fa-save"></i> ';
        const loadingIconHTML = '<i class="fas fa-spinner fa-spin"></i> ';
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.innerHTML = `${loadingIconHTML} ${message}`;
        } else {
            submitButton.disabled = false;
            submitButton.innerHTML = `${defaultIconHTML} Guardar Entrenamiento`;
        }
     }

    // --- Inicialización ---
    if (submitButton) { // Establecer icono inicial botón submit
        submitButton.innerHTML = `<i class="fas fa-save"></i> Guardar Entrenamiento`;
    }
    loadInitialHistory(); // <--- Cargar la vista inicial (últimos X días)
    handleExerciseChange(); // Estado inicial campo custom
    addAddSetButton(); // Botón añadir serie inicial
});