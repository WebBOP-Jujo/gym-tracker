document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFKlZunWd5cvnNdtERuUWEu5CXiq-csMPECnyzBjoC7UO8QDZHQHI9OwPOKizwclFX/exec';
    // ---------------------

    const form = document.getElementById('workout-form');
    const exerciseSelect = document.getElementById('exercise');
    const customExerciseGroup = document.getElementById('custom-exercise-group');
    const customExerciseInput = document.getElementById('custom-exercise-name');
    const setsInput = document.getElementById('sets');
    const setsInputsContainer = document.getElementById('sets-inputs');
    const historyLog = document.getElementById('history-log');
    const submitButton = form.querySelector('button[type="submit"]');

    // Variable global para almacenar todos los datos del historial
    let allHistoryData = [];

    // --- Event Listeners ---
    exerciseSelect.addEventListener('change', handleExerciseChange);
    setsInput.addEventListener('change', handleSetsChange);
    form.addEventListener('submit', handleFormSubmit);

    // --- Funciones del Formulario y Series (MODIFICADAS para iconos/clases) ---

    function handleExerciseChange() {
        if (exerciseSelect.value === 'custom') {
            customExerciseGroup.style.display = 'block';
            customExerciseInput.required = true;
        } else {
            customExerciseGroup.style.display = 'none';
            customExerciseInput.required = false;
            customExerciseInput.value = '';
        }
    }

    function handleSetsChange() {
        // Permitir generar 0 series si el input se borra, para limpiar
        generateSetsInputs(parseInt(setsInput.value) || 0);
    }

    function generateSetsInputs(numberOfSets) {
        setsInputsContainer.innerHTML = ''; // Limpiar siempre al inicio

        if (numberOfSets > 0 && numberOfSets <= 20) {
            for (let i = 1; i <= numberOfSets; i++) {
                addSingleSetInput(i); // Llama a una función refactorizada para añadir un set
            }
        } else if (numberOfSets > 20) {
            setsInputsContainer.innerHTML = '<p style="color:red;">Demasiadas series. Introduce un número menor (máx 20).</p>';
            // No añadir botón "+" si hay error
            return; // Salir para no añadir el botón
        }

        // Siempre añadir el botón "+" si no hay error de max series
        addAddSetButton();
        updateSetNumbers(); // Asegurar numeración correcta
    }

    // Función refactorizada para añadir UN set input (usada por generate y addSetInput)
    function addSingleSetInput(setNumber) {
        const setGroup = document.createElement('div');
        setGroup.classList.add('set-group');
        // Usamos la clase 'remove-set-btn' que estilizaremos en CSS
        setGroup.innerHTML = `
            <strong>Serie ${setNumber}:</strong>
            <label for="reps-set-${setNumber}">Reps:</label>
            <input type="number" id="reps-set-${setNumber}" name="reps-set-${setNumber}" min="0" required>
            <label for="weight-set-${setNumber}">Peso (kg):</label>
            <input type="number" id="weight-set-${setNumber}" name="weight-set-${setNumber}" min="0" step="0.1" required>
            <button type="button" class="remove-set-btn" onclick="removeSetInput(this)" title="Quitar serie">X</button>
        `;
        // Insertar antes del botón "+ Añadir Serie" si existe
        const addButton = document.getElementById('add-set-button');
        if (addButton) {
            setsInputsContainer.insertBefore(setGroup, addButton);
        } else {
            setsInputsContainer.appendChild(setGroup); // Si el botón no existe aún (raro, pero por si acaso)
        }
    }


    function addAddSetButton() {
        // Evitar añadir si ya existe
        if (!document.getElementById('add-set-button')) {
            const addButton = document.createElement('button');
            addButton.type = 'button';
            addButton.id = 'add-set-button';
             // Añadimos icono con innerHTML
            addButton.innerHTML = `<i class="fas fa-plus"></i> Añadir Serie`;
            // Quitamos estilos inline, se manejarán por CSS
            // addButton.style.marginTop = '10px';
            // addButton.style.padding = '8px 12px';
            // addButton.style.backgroundColor = '#5bc0de'; // Se definirá en CSS
            // addButton.style.color = 'white';
            // addButton.style.border = 'none';
            // addButton.style.borderRadius = '4px';
            // addButton.style.cursor = 'pointer';
            addButton.onclick = addSetInput; // La acción sigue igual
            setsInputsContainer.appendChild(addButton);
        }
    }

    window.addSetInput = function() {
        const currentSets = setsInputsContainer.querySelectorAll('.set-group').length;
        const nextSetNumber = currentSets + 1;
        if (nextSetNumber > 20) {
            alert("Máximo 20 series alcanzado.");
            return;
        }
        // Usar la función refactorizada
        addSingleSetInput(nextSetNumber);
        updateSetNumbers(); // Renumerar y actualizar contador
    }

    window.removeSetInput = function(button) {
        button.closest('.set-group').remove();
        updateSetNumbers(); // Renumerar y actualizar contador
    }

    function updateSetNumbers() {
        const setGroups = setsInputsContainer.querySelectorAll('.set-group');
        setGroups.forEach((group, index) => {
            const setNumber = index + 1;
            group.querySelector('strong').textContent = `Serie ${setNumber}:`;
            // Actualizar IDs y names sigue siendo útil
            group.querySelector('label[for^="reps-set"]').setAttribute('for', `reps-set-${setNumber}`);
            group.querySelector('input[id^="reps-set"]').id = `reps-set-${setNumber}`;
            group.querySelector('input[id^="reps-set"]').name = `reps-set-${setNumber}`;
            group.querySelector('label[for^="weight-set"]').setAttribute('for', `weight-set-${setNumber}`);
            group.querySelector('input[id^="weight-set"]').id = `weight-set-${setNumber}`;
            group.querySelector('input[id^="weight-set"]').name = `weight-set-${setNumber}`;
        });
        // Actualizar el input numérico (opcional, pero puede ser útil)
        setsInput.value = setGroups.length;
    }

    // --- Funciones de Guardado (Sin cambios en lógica, solo recarga historial) ---

    async function handleFormSubmit(event) {
        event.preventDefault();
        // ... (Validaciones y preparación de datos igual que antes) ...
        if (!SCRIPT_URL || SCRIPT_URL === 'PEGA_AQUI_LA_URL_DE_TU_SCRIPT_IMPLEMENTADO') {
            alert("Error: La URL del script de Google Apps no está configurada en script.js");
            return;
        }
        const exerciseName = exerciseSelect.value === 'custom' ? customExerciseInput.value.trim() : exerciseSelect.value;
        const setGroups = setsInputsContainer.querySelectorAll('.set-group');
        const numberOfSets = setGroups.length;
        const setsData = [];
        if (!exerciseName) {
            alert("Por favor, selecciona o introduce un nombre de ejercicio.");
            return;
        }
        if (numberOfSets === 0) {
             alert("Por favor, añade al menos una serie.");
             return;
        }
        let formIsValid = true;
        for (let i = 0; i < numberOfSets; i++) {
            const setGroup = setGroups[i];
            const setNumber = i + 1;
            const repsInput = setGroup.querySelector(`input[id^="reps-set"]`);
            const weightInput = setGroup.querySelector(`input[id^="weight-set"]`);
            if (!repsInput || !weightInput || repsInput.value === '' || weightInput.value === '') {
                 alert(`Por favor, completa los datos de Reps y Peso para la Serie ${setNumber}.`);
                 formIsValid = false;
                 break;
            }
            setsData.push({
                set: setNumber,
                reps: parseInt(repsInput.value),
                weight: parseFloat(weightInput.value)
            });
        }
        if (!formIsValid) {
            return;
        }
        const workoutEntry = {
            exercise: exerciseName,
            sets: setsData
        };

        setLoading(true, 'Guardando...'); // <--- Usa la función setLoading actualizada
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                 body: JSON.stringify({ action: 'save', data: workoutEntry })
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert('¡Entrenamiento guardado con éxito!');
                form.reset();
                customExerciseGroup.style.display = 'none';
                setsInputsContainer.innerHTML = ''; // Limpiar inputs de series
                addAddSetButton(); // Asegurar que el botón "+" vuelve a aparecer
                setsInput.value = ''; // Limpiar el input numérico
                loadHistory(); // Recargar historial
            } else {
                console.error('Error del script:', result.message);
                alert(`Error al guardar: ${result.message}`);
            }
        } catch (error) {
            console.error('Error en fetch:', error);
            alert(`Error de conexión al guardar: ${error.message}. Revisa la URL del script y tu conexión.`);
        } finally {
            setLoading(false); // <--- Usa la función setLoading actualizada
        }
    }

    // --- Funciones de Carga y Visualización del Historial (Sin cambios respecto a la versión anterior) ---
    async function loadHistory() {
         if (!SCRIPT_URL) {
            historyLog.innerHTML = '<p style="color:red;">Error: La URL del script no está configurada.</p>';
            return;
        }
        historyLog.innerHTML = '<p>Cargando historial...</p>';
        try {
            const response = await fetch(SCRIPT_URL, { method: 'GET', mode: 'cors' });
            const result = await response.json();
            if (result.status === 'success') {
                allHistoryData = result.data;
                displayGroupedHistory(allHistoryData);
            } else {
                 console.error('Error del script al cargar:', result.message);
                 historyLog.innerHTML = `<p style="color:red;">Error al cargar historial: ${result.message}</p>`;
                 allHistoryData = [];
            }
        } catch (error) {
             console.error('Error en fetch al cargar:', error);
             historyLog.innerHTML = `<p style="color:red;">Error de conexión al cargar historial: ${error.message}.</p>`;
             allHistoryData = [];
        }
    }

    function displayGroupedHistory(historyData) {
        // ... (Esta función se queda igual que la última versión que te pasé, con clases e iconos) ...
        historyLog.innerHTML = '';
        if (!historyData || historyData.length === 0) {
            historyLog.innerHTML = '<p>Aún no hay registros.</p>';
            return;
        }
        const groupedByDate = historyData.reduce((acc, entry) => {
            const entryDateObject = new Date(entry.timestamp);
            const displayDate = entryDateObject.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            if (!acc[displayDate]) { acc[displayDate] = []; }
            acc[displayDate].push(entry);
            return acc;
        }, {});
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
            const [dayA, monthA, yearA] = a.split('/').map(Number);
            const [dayB, monthB, yearB] = b.split('/').map(Number);
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            return dateB - dateA;
        });
        sortedDates.forEach(date => {
            const dateHeading = document.createElement('h2');
            dateHeading.classList.add('history-date-header');
            dateHeading.innerHTML = `<i class="fas fa-calendar-alt"></i> ${date}`;
            historyLog.appendChild(dateHeading);
            const entriesForDate = groupedByDate[date];
            entriesForDate.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.classList.add('history-entry');
                let setsDetails = '';
                entry.sets.sort((a, b) => a.set - b.set).forEach(set => {
                    setsDetails += `<li class="history-set-item">Serie ${set.set}: ${set.reps} reps @ ${set.weight} kg</li>`;
                });
                entryDiv.innerHTML = `
                    <h3 class="history-exercise-title"><i class="fas fa-dumbbell"></i> ${entry.exercise}</h3>
                    <ul class="history-sets-list">${setsDetails}</ul>
                    <div class="history-entry-actions">
                         <button class="button-delete" onclick="deleteEntry('${entry.id}')"><i class="fas fa-trash-alt"></i> Eliminar</button>
                         <button class="button-edit" disabled onclick="editEntry('${entry.id}')"><i class="fas fa-pencil-alt"></i> Editar</button>
                     </div>`;
                historyLog.appendChild(entryDiv);
            });
        });
    }

    // --- Funciones de Borrado, Edición --- (Sin cambios)
    window.deleteEntry = async function(id) {
        if (!id) { console.error("Intento de eliminar sin ID"); return; }
        if (confirm(`¿Estás seguro de que quieres eliminar este registro (${id})?`)) {
            if (!SCRIPT_URL) { alert("Error: La URL del script no está configurada."); return; }
            setLoading(true, 'Eliminando...'); // <-- Usa setLoading actualizado
            try {
                const response = await fetch(SCRIPT_URL, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'delete', id: id }) });
                const result = await response.json();
                if (result.status === 'success') {
                    alert(result.message || 'Registro eliminado.');
                    loadHistory();
                } else {
                     console.error('Error del script al eliminar:', result.message);
                     alert(`Error al eliminar: ${result.message}`);
                }
            } catch (error) {
                console.error('Error en fetch al eliminar:', error);
                alert(`Error de conexión al eliminar: ${error.message}.`);
            } finally {
                setLoading(false); // <-- Usa setLoading actualizado
            }
        }
    }

    window.editEntry = function(id) {
        alert(`La función de editar para el ID ${id} aún no está implementada.`);
    }

    // --- Función setLoading (MODIFICADA para manejar innerHTML e iconos) ---
    function setLoading(isLoading, message = 'Procesando...') {
        // Define el HTML del icono que quieres en estado normal
        const defaultIconHTML = '<i class="fas fa-save"></i> '; // Icono de guardar
        // Define el HTML del icono de carga
        const loadingIconHTML = '<i class="fas fa-spinner fa-spin"></i> ';

        if (isLoading) {
            submitButton.disabled = true;
            submitButton.innerHTML = `${loadingIconHTML} ${message}`; // Icono de spinner + mensaje
        } else {
            submitButton.disabled = false;
            // Restaura el icono original y el texto
            submitButton.innerHTML = `${defaultIconHTML} Guardar Entrenamiento`;
        }
    }


    // --- Inicialización ---
    // Añadir icono al botón submit inicialmente
    if (submitButton) {
        submitButton.innerHTML = `<i class="fas fa-save"></i> Guardar Entrenamiento`;
    }
    loadHistory();
    handleExerciseChange();
    addAddSetButton(); // Asegurar que el botón "+" se añade al inicio si no hay series predefinidas
});