document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFKlZunWd5cvnNdtERuUWEu5CXiq-csMPECnyzBjoC7UO8QDZHQHI9OwPOKizwclFX/exec'; // Reemplaza con tu URL
    const INITIAL_DAYS_TO_LOAD = 7;
    // ---------------------

    // --- Elementos del DOM ---
    const form = document.getElementById('workout-form');
    const exerciseSelect = document.getElementById('exercise');
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
    const chartCanvas = document.getElementById('progress-chart')?.getContext('2d');
    const historySpinner = document.getElementById('history-spinner');
    // Elementos para gestión de ejercicios
    const exerciseManagementSection = document.getElementById('exercise-management-section');
    const toggleManageBtn = document.getElementById('toggle-manage-btn');
    // Añadir
    const newExerciseInput = document.getElementById('new-exercise-name');
    const addExerciseBtn = document.getElementById('add-exercise-btn');
    const addExerciseSpinner = document.getElementById('add-exercise-spinner');
    // Eliminar (AÑADIDO)
    const deleteExerciseSelect = document.getElementById('delete-exercise-select');
    const deleteExerciseBtn = document.getElementById('delete-exercise-btn');
    const deleteExerciseSpinner = document.getElementById('delete-exercise-spinner');


    // --- Variables Globales ---
    let initiallyLoadedData = [];
    let loadedDatesSet = new Set();
    let progressChartInstance = null;
    const baseHistoryTitle = "Historial de Entrenamientos";
    let masterExerciseList = [];


    // --- Event Listeners ---
    exerciseSelect.addEventListener('change', handleExerciseChange);
    setsInput.addEventListener('change', handleSetsChange);
    form.addEventListener('submit', handleFormSubmit);
    filterDateInput.addEventListener('change', handleFilterChange);
    clearFilterBtn.addEventListener('click', handleClearFilter);
    graphExerciseSelect.addEventListener('change', handleGraphExerciseSelectChange);
    showGraphBtn.addEventListener('click', displayExerciseProgressGraph);
    hideGraphBtn.addEventListener('click', hideProgressGraph);
    if (toggleManageBtn) { toggleManageBtn.addEventListener('click', handleToggleManageSection); }
    if (addExerciseBtn) { addExerciseBtn.addEventListener('click', handleAddExercise); }
    // AÑADIDO: Listeners para eliminar
    if (deleteExerciseSelect) { deleteExerciseSelect.addEventListener('change', handleDeleteExerciseSelectChange); }
    if (deleteExerciseBtn) { deleteExerciseBtn.addEventListener('click', handleDeleteExercise); }

    // --- Funciones de Notificación Toast ---
    function showNotification(message, type = 'info', duration = 3000) { /* ... (sin cambios) ... */
        const notificationArea = document.getElementById('notification-area');
        if (!notificationArea) { console.error("Área '#notification-area' no encontrada."); console.warn(`NOTIF (${type}): ${message}`); return; }
        const notification = document.createElement('div');
        notification.classList.add('toast-notification', type); notification.textContent = message;
        notificationArea.insertBefore(notification, notificationArea.firstChild);
        const timer = setTimeout(() => { notification.classList.add('fade-out'); notification.addEventListener('animationend', () => { if (notification.parentNode === notificationArea) notificationArea.removeChild(notification); }, { once: true }); }, duration);
        notification.addEventListener('click', () => { clearTimeout(timer); notification.classList.add('fade-out'); notification.addEventListener('animationend', () => { if (notification.parentNode === notificationArea) notificationArea.removeChild(notification); }, { once: true }); }, { once: true });
    }

    // --- Funciones de Spinner ---
    function showHistorySpinner(message = "Procesando...") { /* ... (sin cambios) ... */
        if (historySpinner) { const p = historySpinner.querySelector('p'); if (p) p.textContent = message; historySpinner.style.display = 'flex'; }
        if (historyLog && historySpinner) { Array.from(historyLog.children).forEach(child => { if (child !== historySpinner) historyLog.removeChild(child); }); }
    }
    function hideHistorySpinner() { /* ... (sin cambios) ... */ if (historySpinner) historySpinner.style.display = 'none'; }


    // --- Funciones del Formulario y Series ---
    function handleExerciseChange() { /* ... (sin cambios respecto a versión anterior) ... */
        const selectedValue = exerciseSelect.value;
        if (selectedValue) {
            if (initiallyLoadedData && initiallyLoadedData.length > 0) { prefillFormWithLastWorkout(selectedValue); }
            else { console.log("No hay datos iniciales. Estableciendo 1 serie."); setsInput.value = 1; generateSetsInputs(1, false); }
        } else { generateSetsInputs(0, false); setsInput.value = ''; }
    }
    function handleSetsChange() { /* ... (sin cambios) ... */ const numSets = parseInt(setsInput.value) || 0; generateSetsInputs(numSets, false); }
    function generateSetsInputs(numberOfSets, shouldPrefillPlaceholders = false, lastWorkoutData = null) { /* ... (sin cambios) ... */
        setsInputsContainer.innerHTML = '';
        const setsToGenerate = Math.max(0, numberOfSets);
        if (setsToGenerate > 0 && setsToGenerate <= 20) {
            for (let i = 1; i <= setsToGenerate; i++) addSingleSetInput(i);
            if (shouldPrefillPlaceholders && lastWorkoutData?.sets) { setTimeout(() => updatePlaceholders(lastWorkoutData), 0); }
        } else if (setsToGenerate > 20) { showNotification("Máximo 20 series.", 'info', 4000); }
        addAddSetButton(); updateSetNumbers();
    }
    function addSingleSetInput(setNumber) { /* ... (sin cambios) ... */
        const setGroup = document.createElement('div'); setGroup.classList.add('set-group');
        setGroup.innerHTML = `<strong>Serie ${setNumber}:</strong><label for="reps-set-${setNumber}">Reps:</label><input type="number" id="reps-set-${setNumber}" name="reps-set-${setNumber}" min="0" required placeholder="Reps"><label for="weight-set-${setNumber}">Peso (kg):</label><input type="number" id="weight-set-${setNumber}" name="weight-set-${setNumber}" min="0" step="0.1" required placeholder="kg"><button type="button" class="remove-set-btn" onclick="removeSetInput(this)" title="Quitar serie">X</button>`;
        const addButton = document.getElementById('add-set-button');
        if (addButton) setsInputsContainer.insertBefore(setGroup, addButton); else setsInputsContainer.appendChild(setGroup);
    }
    function addAddSetButton() { /* ... (sin cambios) ... */ if (!document.getElementById('add-set-button')) { const btn = document.createElement('button'); btn.type = 'button'; btn.id = 'add-set-button'; btn.innerHTML = `<i class="fas fa-plus"></i> Añadir Serie`; btn.onclick = addSetInput; setsInputsContainer.appendChild(btn); } }
    window.addSetInput = function() { /* ... (sin cambios) ... */ const currentSets = setsInputsContainer.querySelectorAll('.set-group').length; const next = currentSets + 1; if (next > 20) { showNotification("Máx 20 series.", 'info'); return; } addSingleSetInput(next); updateSetNumbers(); }
    window.removeSetInput = function(button) { /* ... (sin cambios) ... */ button.closest('.set-group').remove(); updateSetNumbers(); }
    function updateSetNumbers() { /* ... (sin cambios) ... */
        const setGroups = setsInputsContainer.querySelectorAll('.set-group'); const numSets = setGroups.length;
        setGroups.forEach((group, index) => {
            const setN = index + 1; group.querySelector('strong').textContent = `Serie ${setN}:`;
            const rL = group.querySelector('label[for^="reps-set"]'); const rI = group.querySelector('input[id^="reps-set"]'); const wL = group.querySelector('label[for^="weight-set"]'); const wI = group.querySelector('input[id^="weight-set"]');
            if (rL) rL.setAttribute('for', `reps-set-${setN}`); if (rI) { rI.id = `reps-set-${setN}`; rI.name = `reps-set-${setN}`; } if (wL) wL.setAttribute('for', `weight-set-${setN}`); if (wI) { wI.id = `weight-set-${setN}`; wI.name = `weight-set-${setN}`; }
        });
        setsInput.value = numSets >= 0 ? numSets : '';
    }

    // --- Funciones para Pre-rellenar ---
    function findLastWorkoutForExercise(exerciseName) { /* ... (sin cambios) ... */ console.log(`Buscando local (${initiallyLoadedData.length} regs) para: ${exerciseName}`); return initiallyLoadedData.find(entry => entry.exercise === exerciseName) || null; }
    function prefillFormWithLastWorkout(exerciseName) { /* ... (sin cambios) ... */
        const last = findLastWorkoutForExercise(exerciseName);
        if (last?.sets?.length > 0) { console.log("Último local:", last); const numSets = last.sets.length; setsInput.value = numSets; generateSetsInputs(numSets, true, last); }
        else { console.log("No se encontró local para este. 1 serie."); setsInput.value = 1; generateSetsInputs(1, false); }
    }
    function updatePlaceholders(lastWorkoutData) { /* ... (sin cambios) ... */
        console.log("Actualizando campos con:", lastWorkoutData);
        const sorted = (lastWorkoutData.sets || []).sort((a, b) => (a.set || 0) - (b.set || 0));
        sorted.forEach((setInfo) => {
            const setN = setInfo.set; if (typeof setN !== 'number' || setN <= 0) return;
            const wI = document.getElementById(`weight-set-${setN}`); if (wI) { const w = setInfo.weight; if (w !== undefined && w !== null && !isNaN(parseFloat(w))) { wI.value = String(w); wI.placeholder = 'kg'; } else { wI.value = ''; wI.placeholder = 'kg'; } }
            const rI = document.getElementById(`reps-set-${setN}`); if (rI) { rI.placeholder = setInfo.reps !== undefined && setInfo.reps !== null ? String(setInfo.reps) : 'Reps'; rI.value = ''; }
        });
        document.getElementById('reps-set-1')?.focus();
    }

    // --- Función de Guardado (Entrenamiento) ---
    async function handleFormSubmit(event) { /* ... (sin cambios respecto a versión anterior) ... */
        event.preventDefault();
        if (!SCRIPT_URL) { showNotification("Error: URL script no config.", 'error', 5000); return; }
        const exerciseName = exerciseSelect.value;
        const setGroups = setsInputsContainer.querySelectorAll('.set-group'); const numSets = setGroups.length; const setsData = [];
        if (!exerciseName) { showNotification("Selecciona un ejercicio.", 'error'); exerciseSelect.focus(); return; }
        if (numSets === 0) { showNotification("Añade al menos una serie.", 'error'); document.getElementById('add-set-button')?.focus(); return; }
        let isValid = true;
        for (let i = 0; i < numSets; i++) {
            const group = setGroups[i]; const setN = i + 1;
            const rI = group.querySelector(`input[id='reps-set-${setN}']`); const wI = group.querySelector(`input[id='weight-set-${setN}']`);
            if (!rI || !wI || rI.value.trim() === '' || wI.value.trim() === '') { showNotification(`Completa Serie ${setN}.`, 'error'); (rI?.value.trim() === '' ? rI : wI)?.focus(); isValid = false; break; }
            const reps = parseInt(rI.value); const weight = parseFloat(wI.value);
            if (isNaN(reps) || isNaN(weight) || reps < 0 || weight < 0) { showNotification(`Valores inválidos Serie ${setN}.`, 'error'); (isNaN(reps) || reps < 0 ? rI : wI)?.focus(); isValid = false; break; }
            setsData.push({ set: setN, reps: reps, weight: weight });
        }
        if (!isValid) return;
        const workoutEntry = { exercise: exerciseName, sets: setsData };
        setLoading(true, 'Guardando...');
        try {
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'save', data: workoutEntry }) });
            let result; try { result = await response.json(); }
            catch (e) { console.error("Err parse JSON save:", e); const txt = await response.text(); console.error("Resp:", txt); if (!response.ok) throw new Error(`HTTP ${response.status}`); else throw new Error("Resp inesperada (no JSON)"); }
            if (result?.status === 'success') {
                showNotification('¡Guardado!', 'success'); form.reset();
                generateSetsInputs(0, false);
                loadInitialHistory();
            } else { throw new Error(result?.message || 'Resp inválida'); }
        } catch (error) { console.error('Error fetch guardar:', error); showNotification(`Error guardando: ${error.message}`, 'error', 5000);
        } finally { setLoading(false); }
    }

    // --- Funciones de Carga y Filtro Historial ---
    async function fetchHistoryData(specificDate = null) { /* ... (sin cambios) ... */
        if (!SCRIPT_URL) { console.error("URL script no config."); return { status: "error", message: "URL script no config." }; }
        const params = new URLSearchParams();
        if (specificDate) { params.append('load', 'specific'); params.append('date', specificDate); }
        else { params.append('load', 'recent'); params.append('days', INITIAL_DAYS_TO_LOAD); }
        const fetchUrl = `${SCRIPT_URL}?${params.toString()}`;
        console.log("Fetching historial:", fetchUrl);
        try {
             const response = await fetch(fetchUrl, { method: 'GET', mode: 'cors' });
             if (!response.ok) { const errTxt = await response.text(); throw new Error(`Error ${response.status}: ${response.statusText}. ${errTxt}`); }
             const result = await response.json(); console.log("Historial/Datos recibidos:", result); return result;
        } catch (error) { console.error('Error fetch historial:', error); return { status: "error", message: `Error cargando: ${error.message}` }; }
    }
    async function loadInitialHistory() { /* ... (MODIFICADO abajo para llamar a populateDeleteExerciseSelect) ... */
        filterDateInput.value = ''; hideProgressGraph();
        if (historyTitleElement) historyTitleElement.textContent = baseHistoryTitle + '...';
        showHistorySpinner("Cargando datos iniciales...");
        const result = await fetchHistoryData(); hideHistorySpinner();
        if (result.status === 'success') {
            if (result.exerciseList && Array.isArray(result.exerciseList)) {
                masterExerciseList = result.exerciseList;
                console.log("Lista maestra:", masterExerciseList);
                // Poblar TODOS los desplegables
                populateFormExerciseSelect(masterExerciseList);
                populateGraphExerciseSelect(masterExerciseList);
                populateDeleteExerciseSelect(masterExerciseList); // <-- AÑADIDO
            } else {
                console.error("No se recibió lista ejercicios."); masterExerciseList = [];
                populateFormExerciseSelect([]); populateGraphExerciseSelect([]); populateDeleteExerciseSelect([]); // <-- AÑADIDO
                showNotification("Error: No lista ejercicios.", "error");
            }
            initiallyLoadedData = result.data || []; loadedDatesSet.clear();
            initiallyLoadedData.forEach(e => { if (e.timestamp) try { loadedDatesSet.add(new Date(e.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })); } catch(e){} });
            console.log("Fechas locales:", loadedDatesSet);
            if (historyTitleElement) { historyTitleElement.textContent = `${baseHistoryTitle} ${result.totalWorkoutDays !== undefined ? `(Total: ${result.totalWorkoutDays} días)` : ''}`; }
            displayGroupedHistory(initiallyLoadedData);
        } else { displayGroupedHistory([]); showNotification(result.message || 'Error cargando.', 'error'); initiallyLoadedData = []; loadedDatesSet.clear(); masterExerciseList = []; populateFormExerciseSelect([]); populateGraphExerciseSelect([]); populateDeleteExerciseSelect([]); if (historyTitleElement) historyTitleElement.textContent = baseHistoryTitle; } // <-- AÑADIDO
    }
    async function loadSpecificDateHistory(dateYYYYMMDD) { /* ... (sin cambios) ... */
         hideProgressGraph(); if (historyTitleElement) historyTitleElement.textContent = baseHistoryTitle + '...';
         let displayDate = dateYYYYMMDD; try { displayDate = new Date(dateYYYYMMDD + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch(e){}
         showHistorySpinner(`Cargando ${displayDate}...`); const result = await fetchHistoryData(dateYYYYMMDD); hideHistorySpinner();
         if (result.status === 'success') { if (historyTitleElement) historyTitleElement.textContent = `Historial para ${displayDate}`; displayGroupedHistory(result.data || []); }
         else { displayGroupedHistory([]); showNotification(result.message || `Error cargando ${displayDate}.`, 'error'); if (historyTitleElement) historyTitleElement.textContent = baseHistoryTitle; }
     }
    function displayGroupedHistory(historyData) { /* ... (sin cambios respecto a versión anterior con botones corregidos) ... */
        hideHistorySpinner(); historyLog.innerHTML = '';
        if (historySpinner && !historyLog.contains(historySpinner)) { historyLog.appendChild(historySpinner); hideHistorySpinner(); }
        if (!historyData || historyData.length === 0) { const msg = filterDateInput.value ? `No hay registros para fecha.` : 'Aún no hay registros.'; historyLog.innerHTML = `<p>${msg}</p>`; return; }
        const grouped = historyData.reduce((acc, entry) => { if (!entry?.timestamp) return acc; let dateStr; try { dateStr = new Date(entry.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch (e) { return acc; } if (!acc[dateStr]) acc[dateStr] = []; acc[dateStr].push(entry); return acc; }, {});
        const dates = Object.keys(grouped).sort((a, b) => { const [dA, mA, yA] = a.split('/'); const [dB, mB, yB] = b.split('/'); return new Date(yB, mB - 1, dB) - new Date(yA, mA - 1, dA); });
        dates.forEach(date => {
            const h2 = document.createElement('h2'); h2.classList.add('history-date-header'); h2.innerHTML = `<i class="fas fa-calendar-alt"></i> ${date}`; historyLog.appendChild(h2);
            grouped[date].forEach(entry => {
                const div = document.createElement('div'); div.classList.add('history-entry'); div.dataset.workoutId = entry.id || '';
                let sets = (entry.sets || []).sort((a, b) => (a.set || 0) - (b.set || 0)).map(s => `<li class="history-set-item">Serie ${s.set || '?'}: <strong>${s.reps || 0}</strong> reps → <strong>${s.weight || 0}</strong> kg</li>`).join('');
                const id = entry.id || '';
                const deleteButtonHTML = `<button class="button-delete" onclick="deleteWorkoutEntry('${id}')" ${!id ? 'disabled title="ID inválido"' : 'title="Eliminar este registro completo"'}><i class="fas fa-trash-alt"></i> Eliminar</button>`;
                const editButtonHTML = `<button class="button-edit" disabled onclick="editWorkoutEntry('${id}')" ${!id ? 'disabled' : ''} title="Editar registro (Próximamente)"><i class="fas fa-pencil-alt"></i> Editar</button>`;
                div.innerHTML = `<h3 class="history-exercise-title"><i class="fas fa-dumbbell"></i> ${entry.exercise || 'Ejercicio Desconocido'}</h3><ul class="history-sets-list">${sets || '<li>No hay series registradas.</li>'}</ul><div class="history-entry-actions">${editButtonHTML}${deleteButtonHTML}</div>`;
                historyLog.appendChild(div);
            });
        });
    }
    function handleFilterChange() { /* ... (sin cambios) ... */
        const date = filterDateInput.value; if (!date) { loadInitialHistory(); return; }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { showNotification("Fecha inválida.", "error"); filterDateInput.value = ''; return; }
        let dateDDMMYYYY; try { const [y, m, d] = date.split('-'); dateDDMMYYYY = `${d}/${m}/${y}`; } catch (e) { showNotification("Error fecha.", "error"); return; }
        hideHistorySpinner();
        if (loadedDatesSet.has(dateDDMMYYYY)) {
             console.log("Filtrando local para", dateDDMMYYYY);
             const filtered = initiallyLoadedData.filter(e => { if (!e?.timestamp) return false; try { return new Date(e.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) === dateDDMMYYYY; } catch { return false; } });
             if (historyTitleElement) historyTitleElement.textContent = `Historial para ${dateDDMMYYYY}`; displayGroupedHistory(filtered);
        } else { console.log("Fecha no local. Pidiendo:", date); loadSpecificDateHistory(date); }
    }
    function handleClearFilter() { /* ... (sin cambios) ... */ console.log("Limpiando filtro."); loadInitialHistory(); }


    // --- Funciones para Poblar Desplegables ---
    function populateFormExerciseSelect(exerciseList) { /* ... (MODIFICADO abajo para llamar a populateDelete) ... */
        if (!exerciseSelect) return;
        const currentVal = exerciseSelect.value;
        while (exerciseSelect.options.length > 1) exerciseSelect.remove(1);
        (exerciseList || []).forEach(ex => { const opt = document.createElement('option'); opt.value = ex; opt.textContent = ex; exerciseSelect.appendChild(opt); });
        if (currentVal && exerciseSelect.querySelector(`option[value="${CSS.escape(currentVal)}"]`)) { exerciseSelect.value = currentVal; }
        else { exerciseSelect.value = ""; }
        console.log("Desplegable form poblado.");
        // Llamar a poblar el de eliminar CADA VEZ que se actualiza la lista
        populateDeleteExerciseSelect(exerciseList); // <-- AÑADIDO
    }
    function populateGraphExerciseSelect(exerciseList) { /* ... (MODIFICADO abajo para llamar a populateDelete) ... */
        if (!graphExerciseSelect) return;
        const exercises = [...(exerciseList || [])];
        graphExerciseSelect.innerHTML = '<option value="" disabled selected>-- Selecciona --</option>';
        exercises.forEach(ex => { const o = document.createElement('option'); o.value = ex; o.textContent = ex; graphExerciseSelect.appendChild(o); });
        graphExerciseSelect.value = ""; if(showGraphBtn) showGraphBtn.disabled = true; hideProgressGraph();
        console.log("Desplegable gráfica poblado.");
        // Llamar a poblar el de eliminar CADA VEZ que se actualiza la lista
        populateDeleteExerciseSelect(exerciseList); // <-- AÑADIDO
    }
    /**
     * NUEVO: Puebla el desplegable de eliminar ejercicio.
     * @param {string[]} exerciseList La lista maestra de ejercicios.
     */
    function populateDeleteExerciseSelect(exerciseList) {
        if (!deleteExerciseSelect) return;
        const currentVal = deleteExerciseSelect.value; // Guardar valor por si acaso? (normalmente se reseteará)

        // Limpiar opciones excepto la primera
        while (deleteExerciseSelect.options.length > 1) {
            deleteExerciseSelect.remove(1);
        }

        // Añadir ejercicios
        (exerciseList || []).forEach(ex => {
            const opt = document.createElement('option');
            opt.value = ex;
            opt.textContent = ex;
            deleteExerciseSelect.appendChild(opt);
        });

        // Resetear al placeholder y deshabilitar botón de borrado
        deleteExerciseSelect.value = "";
        if (deleteExerciseBtn) deleteExerciseBtn.disabled = true;

        console.log("Desplegable eliminar poblado.");
    }

    // --- Funciones para la Gráfica ---
    function handleGraphExerciseSelectChange() { /* ... (sin cambios) ... */ if(showGraphBtn) showGraphBtn.disabled = !graphExerciseSelect.value; }
    function calculateEpleyE1RM(w, r) { /* ... (sin cambios) ... */ if (typeof w!=='number' || typeof r!=='number' || isNaN(w) || isNaN(r) || w<=0 || r<=0) return 0; return w*(1+(r/30)); }
    function calculateAverageDailyE1RM(data, exName) { /* ... (sin cambios) ... */
        const entries = (data || []).filter(e => e?.exercise === exName); const daily = {};
        entries.forEach(e => { if (!e?.timestamp) return; let key; try { key = new Date(e.timestamp).toISOString().split('T')[0]; } catch (err) { return; } if (!daily[key]) daily[key] = []; (e.sets || []).forEach(s => { if (s) { const e1 = calculateEpleyE1RM(s.weight, s.reps); if (e1 > 0) daily[key].push(e1); } }); });
        const chartData = []; for (const key in daily) { const e1s = daily[key]; if (e1s.length > 0) { const avg = e1s.reduce((a, b) => a + b, 0) / e1s.length; chartData.push({ date: key, avgE1RM: parseFloat(avg.toFixed(2)) }); } }
        chartData.sort((a, b) => new Date(a.date) - new Date(b.date)); return chartData;
    }
    function displayExerciseProgressGraph() { /* ... (sin cambios) ... */
        const ex = graphExerciseSelect.value; if (!ex || !chartCanvas) return;
        console.log(`Graficando: ${ex}`); const data = calculateAverageDailyE1RM(initiallyLoadedData, ex);
        if (data.length < 2) { showNotification(`Necesitas >= 2 días para ${ex}.`, 'info'); hideProgressGraph(); return; }
        const labels = data.map(i => { try { return new Date(i.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }); } catch { return '?'; } });
        const points = data.map(i => i.avgE1RM); if (!points.some(p => p > 0)) { showNotification(`No e1RM válido para ${ex}.`, 'info'); hideProgressGraph(); return; }
        if (progressChartInstance) progressChartInstance.destroy();
        try {
            progressChartInstance = new Chart(chartCanvas, { type: 'line', data: { labels: labels, datasets: [{ label: `Progreso - ${ex}`, data: points, borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.2)', tension: 0.1, fill: true, pointRadius: 4, pointBackgroundColor: 'rgb(75, 192, 192)' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: false, title: { display: true, text: 'e1RM Medio (kg)' } }, x: { title: { display: false } } }, plugins: { legend: { position: 'top', labels: { padding: 15 } }, tooltip: { callbacks: { title: (items) => { if (!items.length) return ''; const idx = items[0].dataIndex; if (data?.[idx]) try { return new Date(data[idx].date + 'T00:00:00').toLocaleDateString('es-ES', {day:'2-digit',month:'2-digit',year:'numeric'}); } catch { return labels[idx] || ''; } return labels[idx] || ''; }, label: (ctx) => ctx.parsed?.y !== null ? `e1RM Medio: ${ctx.parsed.y.toFixed(2)} kg` : '' } } } } });
            console.log("Gráfica creada."); if (graphContainer) graphContainer.style.display = 'block'; if (hideGraphBtn) hideGraphBtn.style.display = 'inline-block';
        } catch (err) { console.error("Error gráfica:", err); showNotification("Error generando gráfica.", 'error'); hideProgressGraph(); }
    }
    function hideProgressGraph() { /* ... (sin cambios) ... */ if(progressChartInstance){ progressChartInstance.destroy(); progressChartInstance = null; console.log("Gráfica destruida."); } if (graphContainer) graphContainer.style.display = 'none'; if (hideGraphBtn) hideGraphBtn.style.display = 'none'; }


    // --- Funciones de Gestión de Ejercicios ---
    function handleToggleManageSection() { /* ... (sin cambios) ... */
        if (!exerciseManagementSection || !toggleManageBtn) return;
        const isVisible = exerciseManagementSection.style.display === 'block';
        if (isVisible) { exerciseManagementSection.style.display = 'none'; toggleManageBtn.innerHTML = '<i class="fas fa-list-ul"></i> Gestionar Lista'; toggleManageBtn.classList.remove('active'); }
        else { exerciseManagementSection.style.display = 'block'; toggleManageBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Ocultar Gestión'; toggleManageBtn.classList.add('active'); exerciseManagementSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
    function setAddExerciseLoading(isLoading) { /* ... (sin cambios) ... */ if (addExerciseBtn) addExerciseBtn.disabled = isLoading; if (addExerciseSpinner) addExerciseSpinner.style.display = isLoading ? 'inline' : 'none'; }
    async function handleAddExercise() { /* ... (MODIFICADO abajo para llamar a populateDelete) ... */
        if (!newExerciseInput) return; const name = newExerciseInput.value.trim();
        if (!name) { showNotification("Introduce nombre.", 'error'); newExerciseInput.focus(); return; }
        if (name.length > 100) { showNotification("Nombre largo.", 'error'); return; }
        setAddExerciseLoading(true);
        try {
            console.log(`Añadiendo: ${name}`);
            const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'addExercise', exerciseName: name }) });
            let result; try { result = await response.json(); console.log("Resp addEx:", result); }
            catch (e) { console.error("Err parse JSON addEx:", e); const txt = await response.text(); console.error("Resp(txt):", txt); if (!response.ok) throw new Error(`HTTP ${response.status}`); else throw new Error(`Resp inesperada`); }
            if (result?.status === 'success') {
                showNotification(`Ejercicio "${result.addedExercise || name}" añadido.`, 'success'); newExerciseInput.value = '';
                if (result.updatedExerciseList?.length >= 0) {
                    masterExerciseList = result.updatedExerciseList;
                    console.log("Lista actualizada:", masterExerciseList);
                    populateFormExerciseSelect(masterExerciseList); // Ya llama a populateDelete
                    populateGraphExerciseSelect(masterExerciseList); // Ya llama a populateDelete
                    // populateDeleteExerciseSelect(masterExerciseList); // No necesita doble llamada
                } else { console.warn("Backend no devolvió lista. Recargando..."); loadInitialHistory(); }
            } else { throw new Error(result?.message || 'Error desconocido'); }
        } catch (error) { console.error('Error fetch añadir:', error); showNotification(`Error añadir: ${error.message}`, 'error', 5000);
        } finally { setAddExerciseLoading(false); }
    }

    /**
     * NUEVO: Maneja el cambio en el select de eliminar ejercicio, habilitando/deshabilitando el botón.
     */
    function handleDeleteExerciseSelectChange() {
        if (deleteExerciseBtn) {
            deleteExerciseBtn.disabled = !deleteExerciseSelect.value; // Habilitar si hay valor, deshabilitar si es ""
        }
    }

    /**
     * NUEVO: Controla el estado de carga del botón y spinner de eliminar ejercicio.
     */
    function setDeleteExerciseLoading(isLoading) {
        if (deleteExerciseSelect) deleteExerciseSelect.disabled = isLoading; // Deshabilitar select durante carga
        if (deleteExerciseBtn) deleteExerciseBtn.disabled = isLoading; // Deshabilitar botón
        if (deleteExerciseSpinner) deleteExerciseSpinner.style.display = isLoading ? 'inline' : 'none';
    }

    /**
     * NUEVO: Maneja el clic en el botón "Eliminar Seleccionado".
     */
    async function handleDeleteExercise() {
        if (!deleteExerciseSelect || !deleteExerciseSelect.value) {
            showNotification("Selecciona un ejercicio para eliminar.", "error");
            return;
        }
        const exerciseNameToDelete = deleteExerciseSelect.value;

        // Confirmación CRÍTICA
        const confirmationMessage = `¿Estás seguro de que quieres eliminar permanentemente el ejercicio "${exerciseNameToDelete}" de la lista?\n\nImportante: Esto NO borrará los registros de entrenamientos pasados que usen este ejercicio.`;
        if (!confirm(confirmationMessage)) {
            console.log("Eliminación cancelada por el usuario.");
            return;
        }

        setDeleteExerciseLoading(true); // Mostrar indicador de carga

        try {
            console.log(`Intentando eliminar ejercicio: ${exerciseNameToDelete}`);
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'deleteExercise', exerciseName: exerciseNameToDelete })
            });

            let result;
            try {
                result = await response.json();
                console.log("Respuesta de deleteExercise:", result);
            } catch (parseError) {
                console.error("Error al parsear respuesta JSON de deleteExercise:", parseError);
                const responseText = await response.text();
                console.error("Respuesta (texto) de deleteExercise:", responseText);
                if (!response.ok) throw new Error(`HTTP ${response.status}. ${responseText}`);
                else throw new Error(`Respuesta inesperada (no JSON): ${responseText}`);
            }

            if (result && result.status === 'success') {
                showNotification(`Ejercicio "${result.deletedExercise || exerciseNameToDelete}" eliminado de la lista.`, 'success');

                // Actualizar lista maestra y repoblar TODOS los selects
                if (result.updatedExerciseList && Array.isArray(result.updatedExerciseList)) {
                    masterExerciseList = result.updatedExerciseList;
                    console.log("Lista de ejercicios actualizada tras eliminar:", masterExerciseList);
                    populateFormExerciseSelect(masterExerciseList); // Repoblar (ya llama a delete)
                    populateGraphExerciseSelect(masterExerciseList); // Repoblar (ya llama a delete)
                    // populateDeleteExerciseSelect(masterExerciseList); // No necesita doble llamada
                } else {
                    console.warn("Backend no devolvió la lista actualizada tras eliminar. Recargando todo...");
                    loadInitialHistory(); // Fallback
                }
            } else {
                // Error devuelto por el script (ej: no encontrado)
                throw new Error(result?.message || 'Error desconocido al eliminar ejercicio.');
            }

        } catch (error) {
            console.error('Error en fetch al eliminar ejercicio:', error);
            showNotification(`Error al eliminar: ${error.message}`, 'error', 5000);
            // No resetear el select en error para que el usuario vea qué falló
        } finally {
            setDeleteExerciseLoading(false); // Ocultar indicador de carga y reactivar controles
            // Asegurar que el botón quede deshabilitado si el select se reseteó (lo hace populateDelete)
             if (deleteExerciseSelect && !deleteExerciseSelect.value && deleteExerciseBtn) {
                 deleteExerciseBtn.disabled = true;
             }
        }
    }


    // --- Funciones de Borrado, Edición (Workout Entries) ---
    window.deleteWorkoutEntry = async function(id) { /* ... (sin cambios) ... */
        if (!id) { showNotification("ID inválido.", 'error'); return; }
        if (confirm(`¿Seguro eliminar registro?\nNo se puede deshacer.`)) {
            if (!SCRIPT_URL) { showNotification("Error: URL script.", 'error'); return; }
            showHistorySpinner(`Eliminando ${id}...`);
            try {
                const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteWorkout', id: id }) });
                let result; try { result = await response.json(); }
                catch (e) { console.error("Err parse JSON del:", e); const txt = await response.text(); console.error("Resp:", txt); if (!response.ok) throw new Error(`HTTP ${response.status}`); else throw new Error("Resp inesperada (no JSON)"); }
                if (result?.status === 'success') { showNotification(result.message || 'Eliminado.', 'success'); loadInitialHistory(); }
                else { throw new Error(result?.message || 'Error eliminar'); }
            } catch (error) { hideHistorySpinner(); console.error('Error fetch eliminar:', error); showNotification(`Error eliminar: ${error.message}`, 'error', 5000); }
        } else { console.log("Eliminación cancelada."); }
    }
    window.editWorkoutEntry = function(id) { /* ... (sin cambios) ... */ showNotification(`Editar (ID: ${id}) no implementado.`, 'info'); console.log("Editar ID:", id); }


    // --- Utilidad para estado de carga del botón Submit (Guardar Entrenamiento) ---
    function setLoading(isLoading, message = 'Guardando...') { /* ... (sin cambios) ... */
        const saveHTML = '<i class="fas fa-save"></i> Guardar Entrenamiento';
        const loadHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
        if (!submitButton) return;
        submitButton.disabled = isLoading; submitButton.innerHTML = isLoading ? loadHTML : saveHTML;
    }

    // --- Inicialización al cargar la página ---
    function initializeApp() { /* ... (sin cambios) ... */
        console.log("Inicializando Gym Tracker App...");
        if(exerciseManagementSection) exerciseManagementSection.style.display = 'none';
        if (submitButton) { submitButton.innerHTML = `<i class="fas fa-save"></i> Guardar Entrenamiento`; submitButton.disabled = false; }
        addAddSetButton();
        loadInitialHistory();
    }

    // Ejecutar inicialización
    initializeApp();

}); // Fin DOMContentLoaded