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

    // --- Funciones del Formulario y Series (Sin cambios) ---

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
        generateSetsInputs(parseInt(setsInput.value) || 0);
    }

    function generateSetsInputs(numberOfSets) {
        setsInputsContainer.innerHTML = '';
        if (numberOfSets > 0 && numberOfSets <= 20) {
            for (let i = 1; i <= numberOfSets; i++) {
                const setGroup = document.createElement('div');
                setGroup.classList.add('set-group');
                setGroup.innerHTML = `
                    <strong>Serie ${i}:</strong>
                    <label for="reps-set-${i}">Reps:</label>
                    <input type="number" id="reps-set-${i}" name="reps-set-${i}" min="0" required>
                    <label for="weight-set-${i}">Peso (kg):</label>
                    <input type="number" id="weight-set-${i}" name="weight-set-${i}" min="0" step="0.1" required>
                    <button type="button" class="remove-set-btn" onclick="removeSetInput(this)" style="padding: 2px 5px; font-size: 10px; margin-left: 10px; background-color: #f0ad4e; color:white; border:none; border-radius:3px; cursor:pointer;">X</button>
                `;
                setsInputsContainer.appendChild(setGroup);
            }
            addAddSetButton();
        } else if (numberOfSets > 20) {
            setsInputsContainer.innerHTML = '<p style="color:red;">Demasiadas series. Introduce un número menor (máx 20).</p>';
        } else {
             setsInputsContainer.innerHTML = '';
             addAddSetButton();
        }
        updateSetNumbers();
    }

    function addAddSetButton() {
         if (!document.getElementById('add-set-button')) {
             const addButton = document.createElement('button');
             addButton.textContent = '+ Añadir Serie';
             addButton.type = 'button';
             addButton.id = 'add-set-button';
             addButton.style.marginTop = '10px';
             addButton.style.padding = '8px 12px';
             addButton.style.backgroundColor = '#5bc0de';
             addButton.style.color = 'white';
             addButton.style.border = 'none';
             addButton.style.borderRadius = '4px';
             addButton.style.cursor = 'pointer';
             addButton.onclick = addSetInput;
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
         const setGroup = document.createElement('div');
         setGroup.classList.add('set-group');
         setGroup.innerHTML = `
            <strong>Serie ${nextSetNumber}:</strong>
            <label for="reps-set-${nextSetNumber}">Reps:</label>
            <input type="number" id="reps-set-${nextSetNumber}" name="reps-set-${nextSetNumber}" min="0" required>
            <label for="weight-set-${nextSetNumber}">Peso (kg):</label>
            <input type="number" id="weight-set-${nextSetNumber}" name="weight-set-${nextSetNumber}" min="0" step="0.1" required>
            <button type="button" class="remove-set-btn" onclick="removeSetInput(this)" style="padding: 2px 5px; font-size: 10px; margin-left: 10px; background-color: #f0ad4e; color:white; border:none; border-radius:3px; cursor:pointer;">X</button>
         `;
         const addButton = document.getElementById('add-set-button');
         if (addButton) {
             setsInputsContainer.insertBefore(setGroup, addButton);
         } else {
             setsInputsContainer.appendChild(setGroup);
         }
         setsInput.value = nextSetNumber;
         updateSetNumbers();
    }

    window.removeSetInput = function(button) {
        button.closest('.set-group').remove();
        updateSetNumbers();
    }

    function updateSetNumbers() {
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
         const addButton = document.getElementById('add-set-button');
         if(addButton && setGroups.length === 0) {
             // No ocultar
         } else if (!addButton && setGroups.length > 0) {
             addAddSetButton();
         }
    }

    // --- Funciones de Guardado (Sin cambios) ---

    async function handleFormSubmit(event) {
        event.preventDefault();
        if (!SCRIPT_URL || SCRIPT_URL === 'PEGA_AQUI_LA_URL_DE_TU_SCRIPT_IMPLEMENTADO') { // Mantener esta comprobación por si acaso
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
        setLoading(true, 'Guardando...');
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
                setsInputsContainer.innerHTML = '';
                 addAddSetButton();
                 setsInput.value = '';
                loadHistory(); // Recargar historial <<< IMPORTANTE
            } else {
                console.error('Error del script:', result.message);
                alert(`Error al guardar: ${result.message}`);
            }
        } catch (error) {
            console.error('Error en fetch:', error);
            alert(`Error de conexión al guardar: ${error.message}. Revisa la URL del script y tu conexión.`);
        } finally {
            setLoading(false);
        }
    }

    // --- Funciones de Carga y Visualización del Historial (MODIFICADAS) ---

    async function loadHistory() {
         if (!SCRIPT_URL) { // Simplificado, ya que la URL está definida arriba
            historyLog.innerHTML = '<p style="color:red;">Error: La URL del script de Google Apps no está configurada.</p>';
            return;
        }
        historyLog.innerHTML = '<p>Cargando historial...</p>';
        try {
            const response = await fetch(SCRIPT_URL, { method: 'GET', mode: 'cors' });
            const result = await response.json();

            if (result.status === 'success') {
                allHistoryData = result.data; // Guarda TODOS los datos en la variable global
                displayGroupedHistory(allHistoryData); // Llama a la nueva función para mostrar agrupado
            } else {
                 console.error('Error del script al cargar:', result.message);
                 historyLog.innerHTML = `<p style="color:red;">Error al cargar el historial: ${result.message}</p>`;
                 allHistoryData = []; // Limpiar en caso de error
            }
        } catch (error) {
             console.error('Error en fetch al cargar:', error);
             historyLog.innerHTML = `<p style="color:red;">Error de conexión al cargar el historial: ${error.message}.</p>`;
             allHistoryData = []; // Limpiar en caso de error
        }
    }

    // NUEVA FUNCIÓN para mostrar el historial AGRUPADO por fecha
    function displayGroupedHistory(historyData) {
        historyLog.innerHTML = ''; // Limpiar vista actual

        if (!historyData || historyData.length === 0) {
            historyLog.innerHTML = '<p>Aún no hay registros.</p>';
            return;
        }

        // 1. Agrupar las entradas por fecha (DD/MM/YYYY)
        const groupedByDate = historyData.reduce((acc, entry) => {
            const entryDateObject = new Date(entry.timestamp); // Usa el timestamp
            const displayDate = entryDateObject.toLocaleDateString('es-ES', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            if (!acc[displayDate]) {
                acc[displayDate] = [];
            }
            acc[displayDate].push(entry);
            return acc;
        }, {});

        // 2. Obtener las fechas y ordenarlas (más reciente primero)
        const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
            const [dayA, monthA, yearA] = a.split('/').map(Number);
            const [dayB, monthB, yearB] = b.split('/').map(Number);
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            return dateB - dateA; // Orden descendente
        });

        // 3. Iterar sobre las fechas ordenadas y mostrar las entradas
        sortedDates.forEach(date => {
            const dateHeading = document.createElement('h2');
            dateHeading.textContent = date;
            dateHeading.style.marginTop = '25px';
            dateHeading.style.marginBottom = '10px';
            dateHeading.style.paddingBottom = '5px';
            dateHeading.style.borderBottom = '2px solid #666'; // Borde gris oscuro
            dateHeading.style.color = '#333'; // Color de texto oscuro
            historyLog.appendChild(dateHeading);

            const entriesForDate = groupedByDate[date];

            entriesForDate.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.style.border = '1px solid #eee';
                entryDiv.style.padding = '10px 15px';
                entryDiv.style.marginBottom = '10px';
                entryDiv.style.borderRadius = '4px';
                entryDiv.style.backgroundColor = '#fdfdfd'; // Fondo casi blanco

                let setsDetails = '';
                entry.sets.sort((a, b) => a.set - b.set).forEach(set => {
                    setsDetails += `<li style="margin-bottom: 3px;">Serie ${set.set}: ${set.reps} reps @ ${set.weight} kg</li>`; // Estilo li directo
                });

                // El H3 ahora solo tiene el ejercicio
                entryDiv.innerHTML = `
                    <h3 style="margin-top: 0; margin-bottom: 8px; color: #444; font-size: 1.1em;">${entry.exercise}</h3>
                    <ul style="list-style: none; padding-left: 5px; margin-bottom: 10px; font-size: 0.95em; color: #555;">
                        ${setsDetails}
                    </ul>
                    <button onclick="deleteEntry('${entry.id}')" style="padding: 4px 8px; background-color: #d9534f; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;">Eliminar</button>
                    <button disabled onclick="editEntry('${entry.id}')" style="padding: 4px 8px; background-color: #777; color: white; border: none; border-radius: 3px; cursor: not-allowed; font-size: 11px; margin-left: 5px;">Editar</button>
                `;
                historyLog.appendChild(entryDiv);
            });
        });
    }


    // --- Funciones de Borrado, Edición y Carga (Sin cambios en su lógica interna) ---

    window.deleteEntry = async function(id) {
        if (!id) { console.error("Intento de eliminar sin ID"); return; }
        if (confirm(`¿Estás seguro de que quieres eliminar este registro (${id})?`)) {
            if (!SCRIPT_URL) { alert("Error: La URL del script no está configurada."); return; }
            setLoading(true, 'Eliminando...');
            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'delete', id: id })
                });
                const result = await response.json();
                if (result.status === 'success') {
                    alert(result.message || 'Registro eliminado.');
                    loadHistory(); // Recargar historial <<< IMPORTANTE
                } else {
                     console.error('Error del script al eliminar:', result.message);
                     alert(`Error al eliminar: ${result.message}`);
                }
            } catch (error) {
                console.error('Error en fetch al eliminar:', error);
                alert(`Error de conexión al eliminar: ${error.message}.`);
            } finally {
                setLoading(false);
            }
        }
    }

    window.editEntry = function(id) {
        alert(`La función de editar para el ID ${id} aún no está implementada.`);
    }

    function setLoading(isLoading, message = 'Procesando...') {
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.textContent = message;
        } else {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Entrenamiento';
        }
    }

    // --- Inicialización ---
    loadHistory(); // Cargar historial al iniciar la página
    handleExerciseChange(); // Estado inicial del campo custom
    addAddSetButton(); // Botón añadir serie inicial
});