document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    // PEGA AQUÍ LA URL DE TU SCRIPT DE GOOGLE APPS DESPLEGADO
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

    // --- Event Listeners ---

    exerciseSelect.addEventListener('change', handleExerciseChange);
    setsInput.addEventListener('change', handleSetsChange);
    form.addEventListener('submit', handleFormSubmit);

    // --- Funciones ---

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
            addAddSetButton(); // Añadir botón para agregar más series
        } else if (numberOfSets > 20) {
            setsInputsContainer.innerHTML = '<p style="color:red;">Demasiadas series. Introduce un número menor (máx 20).</p>';
        } else {
             setsInputsContainer.innerHTML = ''; // Limpiar si es 0 o inválido
             addAddSetButton(); // Mostrar botón de añadir aunque empiece en 0
        }
        updateSetNumbers(); // Renumerar series
    }

     // Añade un botón para agregar una nueva serie
    function addAddSetButton() {
         // Evitar añadir múltiples botones
         if (!document.getElementById('add-set-button')) {
             const addButton = document.createElement('button');
             addButton.textContent = '+ Añadir Serie';
             addButton.type = 'button'; // Importante para que no envíe el form
             addButton.id = 'add-set-button';
             addButton.style.marginTop = '10px';
             addButton.style.padding = '8px 12px';
             addButton.style.backgroundColor = '#5bc0de';
             addButton.style.color = 'white';
             addButton.style.border = 'none';
             addButton.style.borderRadius = '4px';
             addButton.style.cursor = 'pointer';
             addButton.onclick = addSetInput; // Llama a la función para añadir un input
             setsInputsContainer.appendChild(addButton);
         }
    }

    // Añade un nuevo grupo de inputs para una serie
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

         // Insertar antes del botón "+ Añadir Serie" si existe
         const addButton = document.getElementById('add-set-button');
         if (addButton) {
             setsInputsContainer.insertBefore(setGroup, addButton);
         } else {
             setsInputsContainer.appendChild(setGroup);
         }
         setsInput.value = nextSetNumber; // Actualizar el contador de series
         updateSetNumbers(); // Renumerar series
    }

     // Elimina el grupo de inputs de una serie
    window.removeSetInput = function(button) {
        button.closest('.set-group').remove();
        updateSetNumbers(); // Renumerar y actualizar contador
    }

    // Renumera las series visualmente y actualiza el input de número de series
    function updateSetNumbers() {
        const setGroups = setsInputsContainer.querySelectorAll('.set-group');
        setGroups.forEach((group, index) => {
            const setNumber = index + 1;
            group.querySelector('strong').textContent = `Serie ${setNumber}:`;
            // Actualizar IDs y names (opcional pero buena práctica si se usan)
             group.querySelector('label[for^="reps-set"]').setAttribute('for', `reps-set-${setNumber}`);
             group.querySelector('input[id^="reps-set"]').id = `reps-set-${setNumber}`;
             group.querySelector('input[id^="reps-set"]').name = `reps-set-${setNumber}`;
             group.querySelector('label[for^="weight-set"]').setAttribute('for', `weight-set-${setNumber}`);
             group.querySelector('input[id^="weight-set"]').id = `weight-set-${setNumber}`;
             group.querySelector('input[id^="weight-set"]').name = `weight-set-${setNumber}`;
        });
         setsInput.value = setGroups.length; // Actualizar contador principal
         // Ocultar/mostrar botón de añadir si no hay series
         const addButton = document.getElementById('add-set-button');
         if(addButton && setGroups.length === 0) {
            // No lo ocultamos, siempre visible si el contenedor está vacío inicialmente
         } else if (!addButton && setGroups.length > 0) {
            // Si se borran todas y no está el botón, lo añadimos
             addAddSetButton();
         }

    }


    async function handleFormSubmit(event) {
        event.preventDefault();
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
            const setNumber = i + 1; // El número real de la serie en orden
            const repsInput = setGroup.querySelector(`input[id^="reps-set"]`);
            const weightInput = setGroup.querySelector(`input[id^="weight-set"]`);

            if (!repsInput || !weightInput || repsInput.value === '' || weightInput.value === '') {
                 alert(`Por favor, completa los datos de Reps y Peso para la Serie ${setNumber}.`);
                 formIsValid = false;
                 break; // Detener validación
            }

            setsData.push({
                set: setNumber, // Guardar el número de serie correcto
                reps: parseInt(repsInput.value),
                weight: parseFloat(weightInput.value)
            });
        }

        if (!formIsValid) {
            return; // Detener si el formulario no es válido
        }

        const workoutEntry = {
            // No necesitamos ID ni fecha aquí, lo genera el Apps Script
            exercise: exerciseName,
            sets: setsData
        };

        setLoading(true, 'Guardando...'); // Mostrar estado de carga

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: 'cors', // Necesario para peticiones cross-origin
                // No se suele poner Content-Type explícito al enviar a Apps Script así
                // body: JSON.stringify({ action: 'save', data: workoutEntry })
                 // Apps Script espera un string simple en e.postData.contents si no se configura diferente
                 body: JSON.stringify({ action: 'save', data: workoutEntry })
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert('¡Entrenamiento guardado con éxito!');
                form.reset();
                customExerciseGroup.style.display = 'none';
                setsInputsContainer.innerHTML = ''; // Limpiar inputs de series
                 addAddSetButton(); // Volver a añadir el botón inicial
                 setsInput.value = ''; // Limpiar contador
                loadHistory(); // Recargar historial
            } else {
                console.error('Error del script:', result.message);
                alert(`Error al guardar: ${result.message}`);
            }
        } catch (error) {
            console.error('Error en fetch:', error);
            alert(`Error de conexión al guardar: ${error.message}. Revisa la URL del script y tu conexión.`);
        } finally {
            setLoading(false); // Ocultar estado de carga
        }
    }

    async function loadHistory() {
         if (!SCRIPT_URL || SCRIPT_URL === 'PEGA_AQUI_LA_URL_DE_TU_SCRIPT_IMPLEMENTADO') {
            historyLog.innerHTML = '<p style="color:red;">Error: La URL del script de Google Apps no está configurada en script.js</p>';
            return;
        }

        historyLog.innerHTML = '<p>Cargando historial...</p>'; // Feedback visual

        try {
            const response = await fetch(SCRIPT_URL, { method: 'GET', mode: 'cors' });
            const result = await response.json();

            historyLog.innerHTML = ''; // Limpiar vista actual

            if (result.status === 'success') {
                const history = result.data;
                if (history.length === 0) {
                    historyLog.innerHTML = '<p>Aún no hay registros.</p>';
                    return;
                }

                // Ya vienen ordenados del script (más reciente primero)
                history.forEach(entry => {
                    const entryDiv = document.createElement('div');
                    entryDiv.style.marginBottom = '15px';
                    entryDiv.style.paddingBottom = '10px';
                    entryDiv.style.borderBottom = '1px solid #eee';

                    let setsDetails = '';
                    // Ordenar sets por número antes de mostrarlos (aunque deberían venir ordenados)
                    entry.sets.sort((a, b) => a.set - b.set).forEach(set => {
                        setsDetails += `<li>Serie ${set.set}: ${set.reps} reps @ ${set.weight} kg</li>`;
                    });

                    entryDiv.innerHTML = `
                        <h3>${entry.exercise} - ${entry.date}</h3>
                        <ul>
                            ${setsDetails}
                        </ul>
                         <button onclick="deleteEntry('${entry.id}')" style="padding: 5px 10px; background-color: #d9534f; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">Eliminar</button>
                         <!-- Botón Editar (funcionalidad no implementada aún) -->
                         <button disabled onclick="editEntry('${entry.id}')" style="padding: 5px 10px; background-color: #777; color: white; border: none; border-radius: 3px; cursor: not-allowed; font-size: 12px; margin-left: 5px;">Editar</button>
                    `;
                    historyLog.appendChild(entryDiv);
                });

            } else {
                 console.error('Error del script al cargar:', result.message);
                 historyLog.innerHTML = `<p style="color:red;">Error al cargar el historial: ${result.message}</p>`;
            }
        } catch (error) {
             console.error('Error en fetch al cargar:', error);
             historyLog.innerHTML = `<p style="color:red;">Error de conexión al cargar el historial: ${error.message}. Revisa la URL del script y tu conexión.</p>`;
        }
    }

    // Función para eliminar una entrada (accesible globalmente)
    window.deleteEntry = async function(id) {
        if (!id) {
             console.error("Intento de eliminar sin ID");
             return;
        }
        if (confirm(`¿Estás seguro de que quieres eliminar este registro (${id})?`)) {
             if (!SCRIPT_URL || SCRIPT_URL === 'PEGA_AQUI_LA_URL_DE_TU_SCRIPT_IMPLEMENTADO') {
                alert("Error: La URL del script de Google Apps no está configurada en script.js");
                return;
            }

            setLoading(true, 'Eliminando...'); // Mostrar estado de carga

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'cors',
                    body: JSON.stringify({ action: 'delete', id: id })
                });
                const result = await response.json();

                if (result.status === 'success') {
                    alert(result.message || 'Registro eliminado.');
                    loadHistory(); // Recargar historial
                } else {
                     console.error('Error del script al eliminar:', result.message);
                     alert(`Error al eliminar: ${result.message}`);
                }
            } catch (error) {
                console.error('Error en fetch al eliminar:', error);
                alert(`Error de conexión al eliminar: ${error.message}. Revisa la URL del script y tu conexión.`);
            } finally {
                setLoading(false); // Ocultar estado de carga
            }
        }
    }

    // Placeholder para la función de editar (a implementar en el futuro)
    window.editEntry = function(id) {
        alert(`La función de editar para el ID ${id} aún no está implementada.`);
        // Aquí iría la lógica para:
        // 1. Obtener los datos del registro con ese ID (podría requerir otra llamada fetch o buscar en los datos ya cargados).
        // 2. Rellenar el formulario con esos datos.
        // 3. Cambiar el botón "Guardar" por "Actualizar" y manejar la lógica de actualización (requiere modificar doPost en Apps Script).
    }

     // Función para mostrar/ocultar estado de carga
    function setLoading(isLoading, message = 'Procesando...') {
        if (isLoading) {
            submitButton.disabled = true;
            submitButton.textContent = message;
            // Podrías añadir un overlay o spinner visual más claro aquí
        } else {
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Entrenamiento';
        }
    }

    // --- Inicialización ---
    loadHistory(); // Cargar historial al iniciar la página
    handleExerciseChange(); // Asegurar estado inicial correcto del campo custom
     addAddSetButton(); // Asegurar que el botón "+ Añadir Serie" esté presente al inicio
});