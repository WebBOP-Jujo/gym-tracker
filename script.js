// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://zrkevddalzftfclnalke.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpya2V2ZGRhbHpmdGZjbG5hbGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzk3MDksImV4cCI6MjA2MDgxNTcwOX0.tfWBmpZCl59h_srKog4yjX85qzMPmW7q5mys4kaP1Ds';

// --- DEFAULT EXERCISES ---
const defaultExercises = [
    'Press Banca Plano', 'Press Banca Inclinado', 'Aperturas de Pecho',
    'Jalón al Pecho', 'Remo con Barra', 'Encogimientos con Mancuernas',
    'Prensa Pierna', 'Extensión de Cuádriceps', 'Curl Femoral',
    'Press Militar', 'Elevaciones Laterales', 'Extensión de Triceps con Cuerda',
    'Press Francés', 'Curl de Biceps con Barra', 'Curl Martillo'
];

// --- Initialize Supabase Client ---
let supabaseClient;
try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { throw new Error("Configuración de Supabase incompleta."); }
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!supabaseClient) { throw new Error("La creación del cliente Supabase falló."); }
} catch (error) {
    console.error("Error inicializando Supabase:", error);
    alert("Error de configuración: Revisa la consola para más detalles.");
    throw new Error("Supabase client could not be initialized.");
}

// --- GLOBAL STATE ---
let masterExerciseList = [];
let workoutHistory = {};
let loadedDatesSet = new Set();
let currentUser = null;
let chartInstance = null;
let exercisesWithHistory = new Set();

// --- DOM Elements ---
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const userEmailDisplay = document.getElementById('user-email');
const authError = document.getElementById('auth-error');
const workoutForm = document.getElementById('workout-form');
const workoutDateInput = document.getElementById('workout-date');
const exerciseSelect = document.getElementById('exercise');
const numSetsInput = document.getElementById('num-sets');
const setsContainer = document.getElementById('sets-container');
const addSetButton = document.getElementById('add-set-button');
const saveWorkoutButton = document.getElementById('save-workout-button');
const statusMessage = document.getElementById('status-message');
const toggleManageBtn = document.getElementById('toggle-manage-btn');
const exerciseManagementSection = document.getElementById('exercise-management-section');
const newExerciseInput = document.getElementById('new-exercise-name');
const addExerciseBtn = document.getElementById('add-exercise-btn');
const deleteExerciseSelect = document.getElementById('delete-exercise-select');
const deleteExerciseBtn = document.getElementById('delete-exercise-btn');
const manageExerciseStatus = document.getElementById('manage-exercise-status');
const historyLog = document.getElementById('history-log');
const historyCountSpan = document.getElementById('history-count');
const filterDateInput = document.getElementById('filter-date');
const filterDateBtn = document.getElementById('filter-date-btn');
const showRecentBtn = document.getElementById('show-recent-btn');
const graphExerciseSelect = document.getElementById('graph-exercise-select');
const progressChartCanvas = document.getElementById('progress-chart')?.getContext('2d');
const chartStatus = document.getElementById('chart-status');
const chartContainer = document.querySelector('.chart-container');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editEntryIdInput = document.getElementById('edit-entry-id');
const editExerciseNameSpan = document.getElementById('edit-exercise-name');
const editDateSpan = document.getElementById('edit-date');
const editSetNumberSpan = document.getElementById('edit-set-number');
const editRepsInput = document.getElementById('edit-reps');
const editWeightInput = document.getElementById('edit-weight');
const saveEditBtn = document.getElementById('save-edit-btn');
const cancelEditBtns = document.querySelectorAll('.cancel-edit-btn, .close-modal-btn');
const editStatus = document.getElementById('edit-status');
const showSelectedGraphBtn = document.getElementById('show-selected-graph-btn');
const hideGraphBtn = document.getElementById('hide-graph-btn');

// --- HELPER FUNCTIONS ---
const showLoading = (button, isLoading) => { const spinner = button?.querySelector('.spinner'); if (!button) return; if (isLoading) { button.disabled = true; if (spinner) spinner.classList.remove('hidden'); } else { button.disabled = false; if (spinner) spinner.classList.add('hidden'); } };
const displayStatusMessage = (message, isError = false) => { if (!statusMessage) return; statusMessage.textContent = message; statusMessage.className = isError ? 'error-message' : 'success-message'; statusMessage.style.display = 'block'; setTimeout(() => { statusMessage.style.display = 'none'; statusMessage.textContent = ''; }, 5000); };
const displayInlineStatus = (element, message, isError = false) => { if (!element) return; element.textContent = message; element.className = `status-inline ${isError ? 'error-message' : 'success-message'}`; };
const formatDate = (date) => { if (!date) return ''; try { const d = new Date(date); if (isNaN(d.getTime())) { return ''; } const offset = d.getTimezoneOffset() * 60000; const localDate = new Date(d.getTime() - offset); const day = String(localDate.getDate()).padStart(2, '0'); const month = String(localDate.getMonth() + 1).padStart(2, '0'); const year = localDate.getFullYear(); return `${day}/${month}/${year}`; } catch (e) { return ''; } };
const parseDate = (dateString) => { if (!dateString) return null; const parts = dateString.split('/'); if (parts.length === 3) { const year = parseInt(parts[2], 10); const month = parseInt(parts[1], 10) - 1; const day = parseInt(parts[0], 10); if (year > 1000 && month >= 0 && month <= 11 && day >= 1 && day <= 31) { const date = new Date(year, month, day); if (!isNaN(date.getTime()) && date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) { return date; } } } return null; };
const formatToInputDate = (dateString) => { const dateObj = parseDate(dateString); if (!dateObj) return ''; const offset = dateObj.getTimezoneOffset() * 60000; const localDate = new Date(dateObj.getTime() - offset); return localDate.toISOString().split('T')[0]; };
const createSetRowHTML = (setNumber) => { return `<div class="set-row" data-set-number="${setNumber}"><span class="set-label">Serie ${setNumber}:</span><input type="number" class="reps-input" placeholder="Reps" min="0" aria-label="Repeticiones Serie ${setNumber}"><span>×</span><input type="number" class="weight-input" placeholder="Peso (kg)" step="0.01" min="0" aria-label="Peso Serie ${setNumber}"><span>kg</span><button type="button" class="remove-set-btn" title="Quitar Serie ${setNumber}">×</button></div>`; };
const updateSetsUI = (numberOfSets) => { if (!setsContainer) return; const currentRows = setsContainer.querySelectorAll('.set-row'); const currentCount = currentRows.length; numberOfSets = Math.max(0, numberOfSets); if (numberOfSets > currentCount) { for (let i = currentCount + 1; i <= numberOfSets; i++) { setsContainer.insertAdjacentHTML('beforeend', createSetRowHTML(i)); } } else if (numberOfSets < currentCount) { for (let i = currentCount; i > numberOfSets; i--) { if (currentRows[i - 1]) { currentRows[i - 1].remove(); } } } renumberSetLabels(); };
const renumberSetLabels = () => { if (!setsContainer) return; const setRows = setsContainer.querySelectorAll('.set-row'); setRows.forEach((row, index) => { const setNumber = index + 1; row.dataset.setNumber = setNumber; const label = row.querySelector('.set-label'); const repsInput = row.querySelector('.reps-input'); const weightInput = row.querySelector('.weight-input'); const removeBtn = row.querySelector('.remove-set-btn'); if (label) label.textContent = `Serie ${setNumber}:`; if (repsInput) repsInput.setAttribute('aria-label', `Repeticiones Serie ${setNumber}`); if (weightInput) weightInput.setAttribute('aria-label', `Peso Serie ${setNumber}`); if (removeBtn) removeBtn.setAttribute('title', `Quitar Serie ${setNumber}`); }); if (numSetsInput) { numSetsInput.value = setRows.length; } };
const populateExerciseDropdowns = () => { masterExerciseList.sort((a, b) => a.nombre.localeCompare(b.nombre)); const exerciseOptionsHTML = masterExerciseList.map(ex => `<option value="${ex.nombre}">${ex.nombre}</option>`).join(''); if (exerciseSelect) { exerciseSelect.innerHTML = '<option value="" disabled selected>Selecciona...</option>' + exerciseOptionsHTML; } if (deleteExerciseSelect) { deleteExerciseSelect.innerHTML = '<option value="" disabled selected>Selecciona...</option>' + exerciseOptionsHTML; if (deleteExerciseBtn) deleteExerciseBtn.disabled = true; } };
const populateGraphExerciseDropdown = () => { exercisesWithHistory.clear(); Object.values(workoutHistory).flat().forEach(entry => { if (entry && entry.Exercise && entry.Weight != null && entry.Reps != null && entry.Reps > 0 && entry.Weight > 0) { exercisesWithHistory.add(entry.Exercise); } }); const sortedExercisesWithHistory = Array.from(exercisesWithHistory).sort(); const graphOptionsHTML = sortedExercisesWithHistory.map(exName => `<option value="${exName}">${exName}</option>`).join(''); if (graphExerciseSelect) { const currentSelection = graphExerciseSelect.value; graphExerciseSelect.innerHTML = '<option value="" disabled selected>Selecciona ejercicio con datos...</option>' + graphOptionsHTML; if (sortedExercisesWithHistory.includes(currentSelection)) { graphExerciseSelect.value = currentSelection; } else { graphExerciseSelect.value = ""; hideChart(); } if (showSelectedGraphBtn) { showSelectedGraphBtn.disabled = sortedExercisesWithHistory.length === 0 || !graphExerciseSelect.value; } } console.log("Dropdown gráfica poblado con:", sortedExercisesWithHistory); };
const clearWorkoutForm = () => { if (workoutForm) workoutForm.reset(); if (workoutDateInput) workoutDateInput.valueAsDate = new Date(); if (setsContainer) setsContainer.innerHTML = ''; if (numSetsInput) numSetsInput.value = 1; updateSetsUI(1); if (exerciseSelect) exerciseSelect.value = ""; if (manageExerciseStatus) manageExerciseStatus.textContent = ''; if (exerciseManagementSection) exerciseManagementSection.classList.add('hidden'); const toggleIcon = toggleManageBtn?.querySelector('i'); if (toggleIcon) toggleIcon.className = 'fas fa-list-ul'; if (saveWorkoutButton) { saveWorkoutButton.disabled = false; showLoading(saveWorkoutButton, false); } };
const calculateE1RM = (weight, reps) => { if (!weight || !reps || reps < 1 || weight <= 0) { return 0; } if (reps === 1) { return parseFloat(weight); } return parseFloat(weight) * (1 + parseInt(reps) / 30); };

// --- SUPABASE INTERACTIONS (Funciones Async) ---
const fetchMasterExerciseList = async () => { if (!currentUser || !supabaseClient) return []; try { const { data, error } = await supabaseClient.from('Ejercicios').select('id, nombre').order('nombre', { ascending: true }); if (error) { if (error.code === '42P01') { console.error("¡ERR CRÍTICO! Tabla 'Ejercicios' no existe. Ejecuta SQL."); displayStatusMessage("Error: Tabla 'Ejercicios' no encontrada.", true); } else { throw error; } masterExerciseList = []; } else { masterExerciseList = data || []; } populateExerciseDropdowns(); return masterExerciseList; } catch (error) { console.error('Error fetching exercise list:', error); displayStatusMessage(`Error: ${error.message}`, true); masterExerciseList = []; populateExerciseDropdowns(); return []; } };
const insertDefaultExercises = async () => { if (!currentUser || !currentUser.id || !supabaseClient) { console.error("No se puede insertar defaults: Usuario/cliente no válido."); return false; } console.log("Intentando insertar defaults para:", currentUser.id); const exercisesToInsert = defaultExercises.map(name => ({ nombre: name, user_id: currentUser.id })); try { const { error } = await supabaseClient.from('Ejercicios').insert(exercisesToInsert); if (error) { if (error.code === '23505') { console.warn("Defaults ya existen."); return true; } else if (error.code === '42P01') { console.error("¡ERR CRÍTICO! Tabla 'Ejercicios' no existe."); displayStatusMessage("Error: Tabla 'Ejercicios' no encontrada.", true); return false; } else if (error.code === '42501') { console.error("Error RLS insert defaults:", error.message); displayStatusMessage("Error permisos ejercicios iniciales.", true); return false; } else { throw error; } } else { console.log("Defaults insertados (user_id explícito)."); return true; } } catch (error) { console.error("Error insert defaults:", error); displayStatusMessage(`Error: ${error.message}`, true); return false; } };
const addExerciseToDB = async (exerciseName) => { if (!currentUser || !exerciseName || !exerciseName.trim() || !supabaseClient) { displayInlineStatus(manageExerciseStatus, 'Nombre vacío.', true); return; } const trimmedName = exerciseName.trim(); const existingExercise = masterExerciseList.find(ex => ex.nombre.toLowerCase() === trimmedName.toLowerCase()); if (existingExercise) { displayInlineStatus(manageExerciseStatus, `'${trimmedName}' ya existe.`, true); return; } try { const { data, error } = await supabaseClient.from('Ejercicios').insert({ nombre: trimmedName, user_id: currentUser.id }).select('id, nombre').single(); if (error) { if (error.code === '23505') { displayInlineStatus(manageExerciseStatus, `'${trimmedName}' ya existe (DB).`, true); } else if (error.code === '42P01') { console.error("¡ERR CRÍTICO! Tabla 'Ejercicios' no existe."); displayInlineStatus(manageExerciseStatus, "Error: Tabla no encontrada.", true); } else if (error.code === '42501') { console.error("Error RLS add exercise:", error.message); displayInlineStatus(manageExerciseStatus, "Error permisos.", true); } else { throw error; } } else if (data) { displayInlineStatus(manageExerciseStatus, `'${data.nombre}' añadido.`, false); if (newExerciseInput) newExerciseInput.value = ''; masterExerciseList.push(data); populateExerciseDropdowns(); } } catch (error) { console.error('Error adding exercise:', error); displayInlineStatus(manageExerciseStatus, `Error: ${error.message}`, true); } };
const deleteExerciseFromDB = async (exerciseNameToDelete) => { if (!currentUser || !exerciseNameToDelete || !supabaseClient) return; if (!confirm(`¿Seguro eliminar '${exerciseNameToDelete}'?`)) return; try { const { error } = await supabaseClient.from('Ejercicios').delete().eq('nombre', exerciseNameToDelete); if (error) { if (error.code === '42P01') { /*...*/ } else { throw error; } } else { displayInlineStatus(manageExerciseStatus, `'${exerciseNameToDelete}' eliminado.`, false); masterExerciseList = masterExerciseList.filter(ex => ex.nombre !== exerciseNameToDelete); populateExerciseDropdowns(); await updateGraphDropdownAndChart(); } } catch (error) { console.error('Error deleting exercise:', error); displayInlineStatus(manageExerciseStatus, `Error: ${error.message}`, true); } };
const fetchTotalWorkoutDays = async () => { if (!supabaseClient || !currentUser) return 0; try { const { data, error } = await supabaseClient.rpc('count_distinct_workout_days'); if (error) { console.error("Error RPC count_distinct_workout_days:", error); if (error.code === '42883') { /*...*/ } return 0; } console.log("Total distinct workout days from DB:", data); return data ?? 0; } catch (rpcError) { console.error("Exception RPC count_distinct_workout_days:", rpcError); return 0; } };
const saveWorkoutToDB = async (workoutData) => { if (!currentUser || !workoutData || workoutData.sets.length === 0 || !supabaseClient || !saveWorkoutButton) { displayStatusMessage('Datos inválidos.', true); return; } showLoading(saveWorkoutButton, true); const workoutID = crypto.randomUUID(); const recordsToInsert = workoutData.sets.map(set => ({ "WorkoutID": workoutID, "Date": workoutData.date, "Exercise": workoutData.exercise, "SetNumber": set.setNumber, "Reps": set.reps ?? null, "Weight": set.weight ?? null, user_id: currentUser.id })); try { const { error } = await supabaseClient.from('Entrenamientos').insert(recordsToInsert); if (error) { /*...*/ } else { displayStatusMessage('Entrenamiento guardado.', false); clearWorkoutForm(); const totalDays = await fetchTotalWorkoutDays(); if (historyCountSpan) { historyCountSpan.textContent = `(Total: ${totalDays} días)`; } await fetchAndDisplayWorkoutHistory('recent'); /* await updateChartData(); No es necesario aquí */ await updateGraphDropdownAndChart(); } } catch (error) { /*...*/ } finally { showLoading(saveWorkoutButton, false); } };
const fetchAndDisplayWorkoutHistory = async (filterType = 'recent', specificDate = null) => { if (!currentUser || !supabaseClient) return; if (historyLog) historyLog.innerHTML = '<p>Cargando...</p>'; let query = supabaseClient.from('Entrenamientos').select('*').order('Timestamp', { ascending: false }); let isSpecificDateFilter = false; try { if (filterType === 'recent') { query = query.limit(50); } else if (filterType === 'specific' && specificDate) { isSpecificDateFilter = true; if (loadedDatesSet.has(specificDate)) { displayWorkoutHistory(filterSpecificDate(specificDate)); if (historyCountSpan) historyCountSpan.textContent = workoutHistory[specificDate] ? `(${specificDate} - 1 día)` : `(${specificDate} - 0 días)`; return; } query = query.eq('Date', specificDate); } else { /*...*/ return; } const { data, error } = await query; if (error) { /*...*/ return; } processFetchedHistoryData(data || [], filterType === 'recent'); await updateGraphDropdownAndChart(); if (filterType === 'recent') { displayWorkoutHistory(getRecentHistorySubset()); } else if (isSpecificDateFilter && specificDate) { displayWorkoutHistory(filterSpecificDate(specificDate)); if (historyCountSpan) historyCountSpan.textContent = workoutHistory[specificDate] ? `(${specificDate} - 1 día)` : `(${specificDate} - 0 días)`; } } catch (error) { /*...*/ } };
const processFetchedHistoryData = (fetchedData, isRecentFetch) => { if (!fetchedData) return; fetchedData.forEach(entry => { const dateKey = entry.Date; if (!dateKey) return; if (!workoutHistory[dateKey]) { workoutHistory[dateKey] = []; } if (!workoutHistory[dateKey].some(existing => existing.id === entry.id)) { workoutHistory[dateKey].push(entry); } loadedDatesSet.add(dateKey); }); for (const dateKey in workoutHistory) { workoutHistory[dateKey].sort((a, b) => { const exA = a.Exercise || ''; const exB = b.Exercise || ''; if (exA < exB) return -1; if (exA > exB) return 1; return (a.SetNumber || 0) - (b.SetNumber || 0); }); } };
const getRecentHistorySubset = (daysToShow = 7) => { const sortedDates = Object.keys(workoutHistory).sort((a, b) => { const dA = parseDate(a); const dB = parseDate(b); if (!dA && !dB) return 0; if (!dA) return 1; if (!dB) return -1; return dB - dA; }); const recentHistory = {}; let daysCount = 0; for (const date of sortedDates) { if (daysCount < daysToShow) { recentHistory[date] = workoutHistory[date]; daysCount++; } else { break; } } return recentHistory; };
const filterSpecificDate = (dateString) => { const filtered = {}; if (dateString && workoutHistory[dateString]) { filtered[dateString] = workoutHistory[dateString]; } return filtered; };
const deleteWorkoutEntry = async (workoutId) => { if (!currentUser || !workoutId || !supabaseClient) return; if (!confirm('¿Seguro eliminar este entreno?')) return; try { const { error } = await supabaseClient.from('Entrenamientos').delete().eq('WorkoutID', workoutId); if (error) { /*...*/ return; } displayStatusMessage('Entrada eliminada.', false); let dateKeyOfDeletedEntry = null; let workoutFound = false; let dayBecameEmpty = false; Object.keys(workoutHistory).forEach(dateKey => { const iLen = workoutHistory[dateKey].length; workoutHistory[dateKey] = workoutHistory[dateKey].filter(e => { const keep = e.WorkoutID !== workoutId; if (!keep) { workoutFound = true; dateKeyOfDeletedEntry = dateKey; } return keep; }); if (workoutHistory[dateKey].length === 0 && iLen > 0) { delete workoutHistory[dateKey]; dayBecameEmpty = true; } }); if (workoutFound) { const currentFilterDateVal = filterDateInput?.value; const currentFormattedFilterDate = currentFilterDateVal ? formatDate(currentFilterDateVal) : null; const totalDays = await fetchTotalWorkoutDays(); if (currentFormattedFilterDate) { displayWorkoutHistory(filterSpecificDate(currentFormattedFilterDate)); if (historyCountSpan) { const countText = (currentFormattedFilterDate === dateKeyOfDeletedEntry && dayBecameEmpty) ? `(${currentFormattedFilterDate} - 0 días)` : workoutHistory[currentFormattedFilterDate] ? `(${currentFormattedFilterDate} - 1 día)` : `(${currentFormattedFilterDate} - 0 días)`; historyCountSpan.textContent = countText; } } else { displayWorkoutHistory(getRecentHistorySubset()); if (historyCountSpan) { historyCountSpan.textContent = `(Total: ${totalDays} días)`; } } /* await updateChartData(); No necesario aquí */ await updateGraphDropdownAndChart(); } } catch (error) { console.error('Error deleting entry:', error); displayStatusMessage(`Error: ${error.message}`, true); } };
const updateWorkoutSetInDB = async (entryId, reps, weight) => { if (!currentUser || !entryId || !supabaseClient || !saveEditBtn) return; showLoading(saveEditBtn, true); if(editStatus) editStatus.textContent = ''; try { const { data, error } = await supabaseClient.from('Entrenamientos').update({ "Reps": reps ?? null, "Weight": weight ?? null }).eq('id', entryId).select().single(); if (error) { /*...*/ return; } if(editStatus) displayInlineStatus(editStatus, 'Serie actualizada.', false); let updated = false; let dateKeyOfUpdatedEntry = null; for (const dateKey in workoutHistory) { const entryIndex = workoutHistory[dateKey].findIndex(entry => entry.id === entryId); if (entryIndex > -1) { if (data) { workoutHistory[dateKey][entryIndex].Reps = data.Reps; workoutHistory[dateKey][entryIndex].Weight = data.Weight; } updated = true; dateKeyOfUpdatedEntry = dateKey; break; } } if (updated) { const currentFilterDateVal = filterDateInput?.value; const currentFormattedFilterDate = currentFilterDateVal ? formatDate(currentFilterDateVal) : null; if (!currentFormattedFilterDate || currentFormattedFilterDate === dateKeyOfUpdatedEntry) { if (currentFormattedFilterDate) { displayWorkoutHistory(filterSpecificDate(currentFormattedFilterDate)); } else { displayWorkoutHistory(getRecentHistorySubset()); } } /* await updateChartData(); No necesario */ await updateGraphDropdownAndChart(); } setTimeout(closeEditModal, 1000); } catch (error) { console.error('Error updating set:', error); if (editStatus) displayInlineStatus(editStatus, `Error: ${error.message}`, true); } finally { showLoading(saveEditBtn, false); } };

/** Función auxiliar para actualizar dropdown y estado de la gráfica */
const updateGraphDropdownAndChart = async () => { populateGraphExerciseDropdown(); if (graphExerciseSelect?.value && !exercisesWithHistory.has(graphExerciseSelect.value)) { hideChart(); } else if (!graphExerciseSelect?.value) { hideChart(); } if (showSelectedGraphBtn && graphExerciseSelect) { showSelectedGraphBtn.disabled = !graphExerciseSelect.value; } };

// --- UI Update Functions ---
const displayWorkoutHistory = (historyDataToDisplay) => { if (!historyLog) return; historyLog.innerHTML = ''; const sortedDates = Object.keys(historyDataToDisplay).sort((a, b) => { const dA = parseDate(a); const dB = parseDate(b); if (!dA && !dB) return 0; if (!dA) return 1; if (!dB) return -1; return dB - dA; }); if (sortedDates.length === 0) { historyLog.innerHTML = '<p>No hay registros.</p>'; return; } sortedDates.forEach(dateKey => { const entriesForDate = historyDataToDisplay[dateKey] || []; const entriesGroupedByWorkout = entriesForDate.reduce((acc, entry) => { if (!entry || !entry.WorkoutID) return acc; if (!acc[entry.WorkoutID]) { acc[entry.WorkoutID] = { exercise: entry.Exercise || '?', date: entry.Date || '?', sets: [] }; } acc[entry.WorkoutID].sets.push(entry); return acc; }, {}); const sortedWorkoutIDs = Object.keys(entriesGroupedByWorkout).sort((a, b) => { const exA = (entriesGroupedByWorkout[a]?.exercise || '').toLowerCase(); const exB = (entriesGroupedByWorkout[b]?.exercise || '').toLowerCase(); if (exA < exB) return -1; if (exA > exB) return 1; return 0; }); const dateGroupDiv = document.createElement('div'); dateGroupDiv.className = 'history-date-group'; const dateHeader = document.createElement('h3'); dateHeader.className = 'history-date-header'; dateHeader.textContent = dateKey; dateGroupDiv.appendChild(dateHeader); if (sortedWorkoutIDs.length === 0) { const noEntries = document.createElement('p'); noEntries.textContent = 'No hay entrenos.'; dateGroupDiv.appendChild(noEntries); } else { sortedWorkoutIDs.forEach(workoutId => { const workout = entriesGroupedByWorkout[workoutId]; if (!workout) return; workout.sets.sort((a, b) => (a?.SetNumber || 0) - (b?.SetNumber || 0)); const entryDiv = document.createElement('div'); entryDiv.className = 'history-entry'; entryDiv.dataset.workoutId = workoutId; const exerciseNameSpan = document.createElement('span'); exerciseNameSpan.className = 'history-exercise-name'; exerciseNameSpan.textContent = workout.exercise; entryDiv.appendChild(exerciseNameSpan); const deleteWorkoutBtn = document.createElement('button'); deleteWorkoutBtn.className = 'delete-entry-btn'; deleteWorkoutBtn.title = `Eliminar (${workout.exercise} - ${workout.date})`; deleteWorkoutBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Eliminar'; deleteWorkoutBtn.onclick = () => deleteWorkoutEntry(workoutId); exerciseNameSpan.appendChild(deleteWorkoutBtn); workout.sets.forEach(set => { if (!set) return; const setDetail = document.createElement('span'); setDetail.className = 'history-set-detail'; setDetail.innerHTML = `S${set.SetNumber || '?'}: <strong>${set.Reps ?? 'N/A'}</strong>r → <strong>${set.Weight ?? 'N/A'}</strong>kg <span class="history-actions"><button class="edit-entry-btn" data-entry-id="${set.id}" title="Editar S${set.SetNumber || ''}"><i class="fas fa-edit"></i></button></span>`; const editBtn = setDetail.querySelector('.edit-entry-btn'); if (editBtn) { editBtn.addEventListener('click', () => openEditModal(set)); } entryDiv.appendChild(setDetail); }); dateGroupDiv.appendChild(entryDiv); }); } historyLog.appendChild(dateGroupDiv); }); };
const prefillFormBasedOnHistory = (exerciseName) => { if (!exerciseName || Object.keys(workoutHistory).length === 0) { if (numSetsInput) numSetsInput.value = 1; updateSetsUI(1); return; } let lastWorkoutSets = []; const sortedDates = Object.keys(workoutHistory).sort((a, b) => { const dA = parseDate(a); const dB = parseDate(b); if (!dA && !dB) return 0; if (!dA) return 1; if (!dB) return -1; return dB - dA; }); for (const date of sortedDates) { const entriesForDate = workoutHistory[date] || []; const workoutsOfExercise = entriesForDate.filter(entry => entry && entry.Exercise === exerciseName); if (workoutsOfExercise.length > 0) { const groupedByWorkout = workoutsOfExercise.reduce((acc, entry) => { if (!entry || !entry.WorkoutID) return acc; if (!acc[entry.WorkoutID]) acc[entry.WorkoutID] = []; acc[entry.WorkoutID].push(entry); return acc; }, {}); const workoutIDs = Object.keys(groupedByWorkout); if (workoutIDs.length > 0) { const lastWorkoutId = workoutIDs.pop(); lastWorkoutSets = (groupedByWorkout[lastWorkoutId] || []).sort((a, b) => (a?.SetNumber || 0) - (b?.SetNumber || 0)); } break; } } if (lastWorkoutSets.length > 0) { if (numSetsInput) numSetsInput.value = lastWorkoutSets.length; updateSetsUI(lastWorkoutSets.length); const setRows = setsContainer?.querySelectorAll('.set-row'); setRows?.forEach((row, index) => { const setData = lastWorkoutSets[index]; if (setData) { const repsInput = row.querySelector('.reps-input'); const weightInput = row.querySelector('.weight-input'); if (repsInput) { repsInput.placeholder = setData.Reps ?? 'Reps'; repsInput.value = ''; } if (weightInput) { weightInput.value = setData.Weight ?? ''; if (!weightInput.value) { weightInput.placeholder = 'Peso (kg)'; } } } }); const firstRepsInput = setsContainer?.querySelector('.reps-input'); firstRepsInput?.focus(); } else { if (numSetsInput) numSetsInput.value = 1; updateSetsUI(1); } };
const openEditModal = (setEntry) => { if (!editModal || !setEntry) return; if (editEntryIdInput) editEntryIdInput.value = setEntry.id || ''; if (editExerciseNameSpan) editExerciseNameSpan.textContent = setEntry.Exercise || ''; if (editDateSpan) editDateSpan.textContent = setEntry.Date || ''; if (editSetNumberSpan) editSetNumberSpan.textContent = setEntry.SetNumber || ''; if (editRepsInput) editRepsInput.value = setEntry.Reps ?? ''; if (editWeightInput) editWeightInput.value = setEntry.Weight ?? ''; if (editStatus) editStatus.textContent = ''; if (saveEditBtn) showLoading(saveEditBtn, false); editModal.classList.remove('hidden'); };
const closeEditModal = () => { if (!editModal) return; editModal.classList.add('hidden'); if (editForm) editForm.reset(); if (editEntryIdInput) editEntryIdInput.value = ''; };

/** Oculta la gráfica y resetea los botones */
const hideChart = () => {
    if (chartContainer) chartContainer.classList.add('hidden');
    if (hideGraphBtn) hideGraphBtn.classList.add('hidden');
    if (showSelectedGraphBtn) {
        showSelectedGraphBtn.classList.remove('hidden');
        // Habilitar o deshabilitar basado en si hay una selección válida Y opciones disponibles
        showSelectedGraphBtn.disabled = !graphExerciseSelect?.value || graphExerciseSelect?.options.length <= 1; // <=1 por la opción default
    }
    if(chartStatus) chartStatus.textContent = '';
     if (chartInstance) { // Destruir instancia para liberar memoria
        chartInstance.destroy();
        chartInstance = null;
    }
};


// --- Chart Functions ---
const updateChartData = async () => { if (!graphExerciseSelect || !chartStatus || !progressChartCanvas) return; const selectedExercise = graphExerciseSelect.value; if (!selectedExercise) { hideChart(); return; } chartStatus.textContent = 'Calculando datos...'; const dailyAvgE1RM = {}; for (const dateKey in workoutHistory) { const entriesForDate = workoutHistory[dateKey] || []; for (const entry of entriesForDate) { if (entry && entry.Exercise === selectedExercise && entry.Weight != null && entry.Reps != null && entry.Reps > 0 && entry.Weight > 0) { const e1RM = calculateE1RM(entry.Weight, entry.Reps); if (e1RM > 0) { const dateObj = parseDate(entry.Date); if (!dateObj) continue; const dateKeyISO = dateObj.toISOString().split('T')[0]; if (!dailyAvgE1RM[dateKeyISO]) { dailyAvgE1RM[dateKeyISO] = { totalE1RM: 0, count: 0 }; } dailyAvgE1RM[dateKeyISO].totalE1RM += e1RM; dailyAvgE1RM[dateKeyISO].count++; } } } } const sortedDates = Object.keys(dailyAvgE1RM).sort(); if (sortedDates.length === 0) { chartStatus.textContent = `No hay datos e1RM para '${selectedExercise}'.`; if (chartInstance) { chartInstance.destroy(); chartInstance = null; } const ctx = progressChartCanvas; if (ctx) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); } return; } const labels = sortedDates.map(date => formatDate(date)); const dataPoints = sortedDates.map(date => (dailyAvgE1RM[date].totalE1RM / dailyAvgE1RM[date].count).toFixed(1)); renderProgressChart(labels, dataPoints, selectedExercise); chartStatus.textContent = ''; };
const renderProgressChart = (labels, dataPoints, exerciseName) => { if (!progressChartCanvas) return; if (chartInstance) { chartInstance.destroy(); } chartInstance = new Chart(progressChartCanvas, { type: 'line', data: { labels: labels, datasets: [{ label: `e1RM Diario (${exerciseName})`, data: dataPoints, borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.1)', borderWidth: 2, tension: 0.1, pointBackgroundColor: '#3498db', pointRadius: 4, pointHoverRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'e1RM (kg)' } }, x: { title: { display: window.innerWidth > 600, text: 'Fecha' }, ticks: { maxRotation: 70, minRotation: 0, autoSkip: true, maxTicksLimit: 10 } } }, plugins: { legend: { position: 'top', labels: { boxWidth: window.innerWidth <= 600 ? 15 : 40, font: { size: window.innerWidth <= 600 ? 10 : 12 } } }, tooltip: { callbacks: { label: function(context) { let label = 'e1RM: '; if (context.parsed.y !== null) { label += context.parsed.y + ' kg'; } return label; } } } } } }); };

// --- AUTHENTICATION ---
const handleAuthChange = (event, session) => {
    console.log("Auth event:", event, "Session:", session ? session.user.email : 'No session');
    if (event === 'SIGNED_IN' && session) {
        console.log("Signed in:", session.user.email); currentUser = session.user;
        if (authSection) authSection.classList.add('hidden');
        if (appSection) appSection.classList.remove('hidden');
        if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
        if (authError) authError.textContent = '';
        initializeAppData();
    } else if (event === 'SIGNED_OUT') {
        console.log("Signed out"); currentUser = null;
        if (authSection) authSection.classList.remove('hidden'); // MOSTRAR LOGIN
        if (appSection) appSection.classList.add('hidden');      // OCULTAR APP
        if (userEmailDisplay) userEmailDisplay.textContent = '';
        masterExerciseList = []; workoutHistory = {}; loadedDatesSet = new Set(); exercisesWithHistory.clear();
        if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
        if (historyLog) historyLog.innerHTML = ''; if (historyCountSpan) historyCountSpan.textContent = '(Total: 0 días)';
        clearWorkoutForm(); populateExerciseDropdowns(); populateGraphExerciseDropdown(); hideChart();
    } else if (event === 'INITIAL_SESSION' && !session) {
        console.log("Initial session: No user.");
        if (authSection) authSection.classList.remove('hidden'); // MOSTRAR LOGIN
        if (appSection) appSection.classList.add('hidden');      // OCULTAR APP
    } else if (event === 'INITIAL_SESSION' && session) {
         console.log("Initial session: User found, waiting for SIGNED_IN event.");
         // No hacer nada explícito aquí, SIGNED_IN se encargará
    }
};

// --- initializeAppData ---
const initializeAppData = async () => { if (!currentUser) { console.warn("initializeAppData sin usuario."); return; } console.log("Initializing app data for:", currentUser.email); if (workoutDateInput) workoutDateInput.valueAsDate = new Date(); if (filterDateInput) filterDateInput.value = ''; const totalDays = await fetchTotalWorkoutDays(); if (historyCountSpan) { historyCountSpan.textContent = `(Total: ${totalDays} días)`; } const currentExercises = await fetchMasterExerciseList(); if (currentExercises.length === 0 && currentUser && supabaseClient) { console.log("Lista vacía. Intentando insertar defaults..."); const defaultsInserted = await insertDefaultExercises(); if (defaultsInserted) { console.log("Recargando lista post-defaults..."); await fetchMasterExerciseList(); } } await fetchAndDisplayWorkoutHistory('recent'); /* Esto ya llama a updateGraphDropdownAndChart */ updateSetsUI(1); /* No llamar a updateChartData aquí */ hideChart(); console.log("App data initialized."); };

// --- EVENT LISTENERS ---
loginBtn?.addEventListener('click', async () => { if (!authEmailInput || !authPasswordInput || !supabaseClient) return; const email = authEmailInput.value; const password = authPasswordInput.value; if (authError) authError.textContent = ''; try { const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) throw error; console.log("Login ok:", email); } catch (error) { console.error("Login Error:", error); if (authError) authError.textContent = `Error: ${error.message}`; } });
signupBtn?.addEventListener('click', async () => { if (!authEmailInput || !authPasswordInput || !supabaseClient) return; const email = authEmailInput.value; const password = authPasswordInput.value; if (authError) authError.textContent = ''; try { const { error } = await supabaseClient.auth.signUp({ email, password }); if (error) throw error; alert('¡Registro exitoso! Iniciando sesión...'); console.log("Signup ok:", email); } catch (error) { console.error("Signup Error:", error); if (authError) authError.textContent = `Error: ${error.message}`; } });
logoutBtn?.addEventListener('click', async () => { if (!supabaseClient) return; try { const { error } = await supabaseClient.auth.signOut(); if (error) throw error; console.log("Logout ok"); /* handleAuthChange hace el resto */ } catch (error) { console.error("Logout Error:", error); alert(`Error: ${error.message}`); } });
numSetsInput?.addEventListener('input', (e) => { const numSets = parseInt(e.target.value, 10) || 1; updateSetsUI(numSets); });
addSetButton?.addEventListener('click', () => { const currentSets = parseInt(numSetsInput?.value || '0', 10); const newCount = currentSets + 1; if(numSetsInput) numSetsInput.value = newCount; updateSetsUI(newCount); });
setsContainer?.addEventListener('click', (e) => { const removeButton = e.target.closest('.remove-set-btn'); if (removeButton) { const setToRemove = removeButton.closest('.set-row'); if (setToRemove) { setToRemove.remove(); renumberSetLabels(); } } });
exerciseSelect?.addEventListener('change', (e) => { prefillFormBasedOnHistory(e.target.value); });
workoutForm?.addEventListener('submit', (e) => { e.preventDefault(); if (!workoutDateInput || !exerciseSelect || !setsContainer) return; const workoutData = { date: formatDate(workoutDateInput.valueAsDate), exercise: exerciseSelect.value, sets: [] }; const setRows = setsContainer.querySelectorAll('.set-row'); if (!workoutData.exercise) { displayStatusMessage('Selecciona ejercicio.', true); return; } if (setRows.length === 0) { displayStatusMessage('Añade series.', true); return; } let valid = true; setRows.forEach(row => { const repsInput = row.querySelector('.reps-input'); const weightInput = row.querySelector('.weight-input'); const setNumber = parseInt(row.dataset.setNumber, 10); const repsValue = repsInput?.value; const weightValue = weightInput?.value; const reps = repsValue && !isNaN(parseInt(repsValue)) ? parseInt(repsValue) : null; const weight = weightValue && !isNaN(parseFloat(weightValue)) ? parseFloat(weightValue) : null; if ((reps !== null && reps < 0) || (weight !== null && weight < 0)) { valid = false; } workoutData.sets.push({ setNumber, reps, weight }); }); if (!valid) { displayStatusMessage('Reps/Peso no negativos.', true); return; } saveWorkoutToDB(workoutData); });
toggleManageBtn?.addEventListener('click', () => { if (!exerciseManagementSection || !toggleManageBtn) return; const section = exerciseManagementSection; const icon = toggleManageBtn.querySelector('i'); section.classList.toggle('hidden'); if (icon) { icon.className = section.classList.contains('hidden') ? 'fas fa-list-ul' : 'fas fa-eye-slash'; } if (section.classList.contains('hidden') && manageExerciseStatus) { manageExerciseStatus.textContent = ''; } });
addExerciseBtn?.addEventListener('click', () => { if (newExerciseInput) { addExerciseToDB(newExerciseInput.value); } });
newExerciseInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addExerciseToDB(e.target.value); } });
deleteExerciseSelect?.addEventListener('change', (e) => { if(deleteExerciseBtn) deleteExerciseBtn.disabled = !e.target.value; });
deleteExerciseBtn?.addEventListener('click', () => { if(deleteExerciseSelect) { deleteExerciseFromDB(deleteExerciseSelect.value); } });
filterDateBtn?.addEventListener('click', () => { if (!filterDateInput) return; const selectedDate = filterDateInput.value; if (selectedDate) { const formattedDate = formatDate(selectedDate); fetchAndDisplayWorkoutHistory('specific', formattedDate); } else { displayStatusMessage('Selecciona fecha.', true); } });
showRecentBtn?.addEventListener('click', async () => { if (filterDateInput) filterDateInput.value = ''; try { console.log("Show Recent: Fetching total days..."); const totalDays = await fetchTotalWorkoutDays(); if (historyCountSpan) { historyCountSpan.textContent = `(Total: ${totalDays} días)`; } console.log("Total count updated."); } catch (error) { console.error("Error fetching total days on Show Recent:", error); if (historyCountSpan) { historyCountSpan.textContent = `(Total: Error)`; } } await fetchAndDisplayWorkoutHistory('recent'); hideChart(); });

// Listener para "Mostrar Gráfica" (botón al lado del select)
showSelectedGraphBtn?.addEventListener('click', () => {
    const selectedExercise = graphExerciseSelect?.value;
    if (!selectedExercise) { displayStatusMessage("Selecciona un ejercicio.", true); return; }
    if (chartContainer && hideGraphBtn && showSelectedGraphBtn) {
        console.log(`Mostrando gráfica para ${selectedExercise}`);
        chartContainer.classList.remove('hidden');
        hideGraphBtn.classList.remove('hidden');
        showSelectedGraphBtn.classList.add('hidden');
        updateChartData();
    }
});

// Listener para "Ocultar Gráfica"
hideGraphBtn?.addEventListener('click', () => {
    console.log("Ocultando gráfica");
    hideChart();
});

// Listener para el SELECT de la gráfica
graphExerciseSelect?.addEventListener('change', () => {
    console.log("Cambiada selección de gráfica");
    hideChart();
    if (showSelectedGraphBtn) { showSelectedGraphBtn.disabled = !graphExerciseSelect.value; }
});

editForm?.addEventListener('submit', (e) => { e.preventDefault(); if (!editEntryIdInput || !editRepsInput || !editWeightInput) return; const entryId = parseInt(editEntryIdInput.value, 10); const repsValue = editRepsInput.value.trim(); const weightValue = editWeightInput.value.trim(); const reps = repsValue === '' ? null : parseInt(repsValue, 10); const weight = weightValue === '' ? null : parseFloat(weightValue); if ((reps !== null && (isNaN(reps) || reps < 0)) || (weight !== null && (isNaN(weight) || weight < 0))) { displayInlineStatus(editStatus, 'Valores inválidos.', true); return; } if (entryId && !isNaN(entryId)) { updateWorkoutSetInDB(entryId, reps, weight); } else { if (editStatus) displayInlineStatus(editStatus, 'Error: ID inválido.', true); } });
cancelEditBtns?.forEach(btn => { btn.addEventListener('click', closeEditModal); });

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM cargado. Inicializando...");
    if (!supabaseClient) { console.error("¡FALLO CRÍTICO! supabaseClient no definido."); alert("Error crítico."); return; }
    if (!progressChartCanvas) { console.warn("Canvas de gráfica no encontrado."); }

    // Configurar listener de autenticación
    console.log("Añadiendo listener onAuthStateChange...");
    supabaseClient.auth.onAuthStateChange((event, session) => { handleAuthChange(event, session); });

    // Comprobación inicial robusta del estado de sesión
    // Esto asegura que la UI correcta (login o app) se muestre al cargar,
    // incluso antes de que el primer onAuthStateChange se dispare completamente.
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
         console.log("Initial getSession check:", session ? `Session found for ${session.user.email}` : 'No session found initially');
         if (!session) {
             // Asegurar que auth esté visible y app oculta si no hay sesión
             if (authSection) authSection.classList.remove('hidden');
             if (appSection) appSection.classList.add('hidden');
             console.log("Forzando visibilidad de Auth Section por falta de sesión inicial.");
         }
         // Si hay sesión, onAuthStateChange se encargará de mostrar la app y cargar datos.
     }).catch(error => {
         console.error("Error durante initial getSession check:", error);
         // En caso de error al verificar sesión, mostrar login como fallback seguro
         if (authSection) authSection.classList.remove('hidden');
         if (appSection) appSection.classList.add('hidden');
     });

    console.log("Inicialización de listeners completada. Esperando eventos...");
});