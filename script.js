// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://zrkevddalzftfclnalke.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpya2V2ZGRhbHpmdGZjbG5hbGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzk3MDksImV4cCI6MjA2MDgxNTcwOX0.tfWBmpZCl59h_srKog4yjX85qzMPmW7q5mys4kaP1Ds';

// --- DEFAULT EXERCISES ---
const defaultExercises = [ 'Press Banca Plano', 'Press Banca Inclinado', 'Aperturas de Pecho', 'Jalón al Pecho', 'Remo en Máquina', 'Remo Trapecio', 'Prensa Pierna', 'Extensión Cuádriceps', 'Curl Femoral', 'Press Militar', 'Elevaciones Laterales', 'Triceps con Cuerda', 'Extensión Triceps', 'Curl de Biceps', 'Curl Martillo' ];

// --- Initialize Supabase Client ---
let supabaseClient;
try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { throw new Error("Configuración de Supabase incompleta."); }
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!supabaseClient) { throw new Error("La creación del cliente Supabase falló."); }
} catch (error) {
    console.error("Error inicializando Supabase:", error); alert("Error de configuración: Revisa la consola para más detalles."); throw new Error("Supabase client could not be initialized.");
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
// const logoutBtn = document.getElementById('logout-btn'); // REMOVIDO
const authError = document.getElementById('auth-error');
const workoutForm = document.getElementById('workout-form');
const workoutDateInput = document.getElementById('workout-date');
const exerciseSelect = document.getElementById('exercise');
const numSetsInput = document.getElementById('num-sets');
const setsContainer = document.getElementById('sets-container');
const addSetButton = document.getElementById('add-set-button');
const saveWorkoutButton = document.getElementById('save-workout-button');
const toggleManageBtn = document.getElementById('toggle-manage-btn');
const exerciseManagementSection = document.getElementById('exercise-management-section');
const newExerciseInput = document.getElementById('new-exercise-name');
const addExerciseBtn = document.getElementById('add-exercise-btn');
const deleteExerciseSelect = document.getElementById('delete-exercise-select');
const deleteExerciseBtn = document.getElementById('delete-exercise-btn');
const historyLog = document.getElementById('history-log');
const historyCountSpan = document.getElementById('history-count');
const filterDateInput = document.getElementById('filter-date');
const showRecentBtn = document.getElementById('show-recent-btn');
const graphExerciseSelect = document.getElementById('graph-exercise-select');
const progressChartCanvas = document.getElementById('progress-chart')?.getContext('2d');
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
const showSelectedGraphBtn = document.getElementById('show-selected-graph-btn');
const hideGraphBtn = document.getElementById('hide-graph-btn');
const notificationArea = document.getElementById('notification-area');
// NUEVOS Elementos para el Menú de Usuario
const userMenuBtn = document.getElementById('user-menu-btn');
const userMenuDropdown = document.getElementById('user-menu-dropdown');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutMenuBtn = document.getElementById('logout-menu-btn');

// --- HELPER FUNCTIONS ---
const showLoading = (button, isLoading) => {
    const spinner = button?.querySelector('.spinner'); if (!button) return;
    button.disabled = isLoading; if (spinner) spinner.classList.toggle('hidden', !isLoading);
};

const showToast = (message, type = 'info', duration = 3500) => {
    if (!notificationArea) { console.error("Elemento #notification-area no encontrado."); console.warn(`Fallback Toast (${type}): ${message}`); return; }
    const toast = document.createElement('div');
    toast.classList.add('toast-notification', type);
    toast.textContent = message;
    notificationArea.insertBefore(toast, notificationArea.firstChild);
    const timeoutId = setTimeout(() => { toast.classList.add('fade-out'); toast.addEventListener('animationend', () => { if (toast.parentNode === notificationArea) notificationArea.removeChild(toast); }, { once: true }); }, duration);
    toast.addEventListener('click', () => { clearTimeout(timeoutId); toast.classList.add('fade-out'); }, { once: true });
};

const traducirErrorAuth = (message) => {
    if (!message) return "Ha ocurrido un error inesperado. Inténtalo de nuevo.";
    console.log("Original Auth Error:", message);
    if (message.includes("Invalid login credentials")) return "Email o contraseña incorrectos. Verifica tus datos.";
    if (message.includes("User already registered")) return "Este email ya está registrado. ¿Quizás querías iniciar sesión?";
    if (message.includes("Password should be at least 6 characters")) return "La contraseña debe tener como mínimo 6 caracteres.";
    if (message.includes("Signup requires a valid password")) return "Registro fallido: Se requiere una contraseña.";
    if (message.includes("Unable to validate email address: invalid format")) return "El formato del email no es válido.";
    if (message.includes("check your email for the confirmation link")) return "¡Registro casi listo! Revisa tu email para confirmar la cuenta.";
    if (message.includes("missing email") || message.includes("Missing email")) return "Por favor, introduce tu dirección de email.";
    if (message.includes("sign-ins are disabled")) return "El inicio de sesión anónimo no está permitido.";
    console.warn("Error Auth no traducido específicamente:", message);
    return "Ha ocurrido un error. Por favor, inténtalo de nuevo más tarde.";
};

const setAuthState = (isAuthActive) => {
    if (isAuthActive) {
        document.body.classList.add('auth-active');
        if (authSection) authSection.classList.remove('hidden');
        if (appSection) appSection.classList.add('hidden');
        // Asegurarse de que el dropdown de usuario esté cerrado al hacer logout
        if (userMenuDropdown && !userMenuDropdown.classList.contains('hidden')) {
            userMenuDropdown.classList.add('hidden');
            userMenuBtn?.setAttribute('aria-expanded', 'false');
        }
        console.log("UI State: Auth Active");
    } else {
        document.body.classList.remove('auth-active');
        if (authSection) authSection.classList.add('hidden');
        if (appSection) appSection.classList.remove('hidden');
        console.log("UI State: App Active");
    }
};

const formatDate = (date) => {
    if (!date) return ''; try { const d = new Date(date); if (isNaN(d.getTime())) { console.warn("Invalid date:", date); return ''; } const day = String(d.getUTCDate()).padStart(2, '0'); const month = String(d.getUTCMonth() + 1).padStart(2, '0'); const year = d.getUTCFullYear(); return `${day}/${month}/${year}`; } catch (e) { console.error("Error format date:", e, date); return ''; }
};
const parseDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return null; const parts = dateString.split('/');
    if (parts.length === 3) { const day = parseInt(parts[0], 10); const month = parseInt(parts[1], 10) - 1; const year = parseInt(parts[2], 10); if (year > 1000 && month >= 0 && month <= 11 && day >= 1 && day <= 31) { const date = new Date(Date.UTC(year, month, day)); if (!isNaN(date.getTime()) && date.getUTCDate() === day && date.getUTCMonth() === month && date.getUTCFullYear() === year) { return date; } } }
    console.warn("Failed parse date:", dateString); return null;
};
const formatToInputDate = (dateString) => { const dateObj = parseDate(dateString); if (!dateObj) return ''; return dateObj.toISOString().split('T')[0]; };
const createSetRowHTML = (setNumber) => {
    return ` <div class="set-row" data-set-number="${setNumber}"> <div class="set-row-line-1"> <span class="set-number-label">Serie ${setNumber}:</span> <div class="set-input-group"> <label>Reps:</label> <input type="number" class="reps-input" placeholder="Reps" min="1" required aria-label="Repeticiones Serie ${setNumber}"> </div> </div> <div class="set-row-line-2"> <div class="set-input-group"> <label>Peso:</label> <input type="number" class="weight-input" placeholder="Peso" step="0.01" min="0.01" required aria-label="Peso Serie ${setNumber}"> <span>kg</span> </div> <button type="button" class="remove-set-btn" title="Quitar Serie ${setNumber}">×</button> </div> </div>`;
};
const updateSetsUI = (numberOfSets) => {
    if (!setsContainer) return; const currentRows = setsContainer.querySelectorAll('.set-row'); const currentCount = currentRows.length; numberOfSets = Math.max(1, numberOfSets);
    if (numberOfSets > currentCount) { for (let i = currentCount + 1; i <= numberOfSets; i++) { setsContainer.insertAdjacentHTML('beforeend', createSetRowHTML(i)); } }
    else if (numberOfSets < currentCount) { for (let i = currentCount; i > numberOfSets; i--) { if (currentRows[i - 1]) { currentRows[i - 1].remove(); } } }
    renumberSetLabels();
};
const renumberSetLabels = () => {
    if (!setsContainer) return; const setRows = setsContainer.querySelectorAll('.set-row');
    setRows.forEach((row, index) => { const setNumber = index + 1; row.dataset.setNumber = setNumber; const label = row.querySelector('.set-number-label'); const repsInput = row.querySelector('.reps-input'); const weightInput = row.querySelector('.weight-input'); const removeBtn = row.querySelector('.remove-set-btn'); if (label) label.textContent = `Serie ${setNumber}:`; if (repsInput) repsInput.setAttribute('aria-label', `Repeticiones Serie ${setNumber}`); if (weightInput) weightInput.setAttribute('aria-label', `Peso Serie ${setNumber}`); if (removeBtn) removeBtn.setAttribute('title', `Quitar Serie ${setNumber}`); });
    if (numSetsInput) { numSetsInput.value = setRows.length; }
};
const populateExerciseDropdowns = () => {
    masterExerciseList.sort((a, b) => a.nombre.localeCompare(b.nombre)); const exerciseOptionsHTML = masterExerciseList.map(ex => `<option value="${ex.nombre}">${ex.nombre}</option>`).join('');
    if (exerciseSelect) { exerciseSelect.innerHTML = '<option value="" disabled selected>Selecciona...</option>' + exerciseOptionsHTML; }
    if (deleteExerciseSelect) { deleteExerciseSelect.innerHTML = '<option value="" disabled selected>Selecciona...</option>' + exerciseOptionsHTML; if (deleteExerciseBtn) deleteExerciseBtn.disabled = true; }
};
const populateGraphExerciseDropdown = () => {
    exercisesWithHistory.clear(); Object.values(workoutHistory).flat().forEach(entry => { if (entry && entry.Exercise && entry.Weight != null && entry.Reps != null && entry.Reps > 0 && entry.Weight > 0) { exercisesWithHistory.add(entry.Exercise); } }); const sortedExercisesWithHistory = Array.from(exercisesWithHistory).sort(); const graphOptionsHTML = sortedExercisesWithHistory.map(exName => `<option value="${exName}">${exName}</option>`).join(''); if (graphExerciseSelect) { const currentSelection = graphExerciseSelect.value; graphExerciseSelect.innerHTML = '<option value="" disabled selected>Selecciona ejercicio...</option>' + graphOptionsHTML; if (sortedExercisesWithHistory.includes(currentSelection)) { graphExerciseSelect.value = currentSelection; } else { graphExerciseSelect.value = ""; hideChart(); } if (showSelectedGraphBtn) { showSelectedGraphBtn.disabled = sortedExercisesWithHistory.length === 0 || !graphExerciseSelect.value; } } console.log("Graph dropdown populated:", sortedExercisesWithHistory);
};
const clearWorkoutForm = () => {
    if (workoutForm) workoutForm.reset(); if (workoutDateInput) { try { workoutDateInput.valueAsDate = new Date(); } catch (e) { workoutDateInput.value = new Date().toISOString().split('T')[0]; } }
    if (setsContainer) setsContainer.innerHTML = ''; if (numSetsInput) numSetsInput.value = 1; updateSetsUI(1); if (exerciseSelect) exerciseSelect.value = ""; if (newExerciseInput) newExerciseInput.value = ''; if (deleteExerciseSelect) deleteExerciseSelect.value = ''; if (deleteExerciseBtn) deleteExerciseBtn.disabled = true; if (exerciseManagementSection && !exerciseManagementSection.classList.contains('hidden')) { exerciseManagementSection.classList.add('hidden'); const toggleIcon = toggleManageBtn?.querySelector('i'); if (toggleIcon) toggleIcon.className = 'fas fa-list-ul'; } if (saveWorkoutButton) { saveWorkoutButton.disabled = false; showLoading(saveWorkoutButton, false); }
};
const calculateE1RM = (weight, reps) => {
    const numWeight = parseFloat(weight); const numReps = parseInt(reps, 10); if (!numWeight || !numReps || numReps < 1 || numWeight <= 0) { return 0; } if (numReps === 1) { return numWeight; } return numWeight * (1 + (numReps / 30));
};
const updateGraphDropdownAndChart = async () => {
    populateGraphExerciseDropdown(); const selectedExercise = graphExerciseSelect?.value; if (chartInstance && (!selectedExercise || !exercisesWithHistory.has(selectedExercise))) { hideChart(); } if (showSelectedGraphBtn && graphExerciseSelect) { showSelectedGraphBtn.disabled = !selectedExercise || graphExerciseSelect.options.length <= 1; }
};

// --- SUPABASE INTERACTIONS ---
const fetchMasterExerciseList = async () => {
    if (!currentUser || !supabaseClient) return []; try { const { data, error } = await supabaseClient.from('Ejercicios').select('id, nombre').order('nombre', { ascending: true }); if (error) { console.error('Error fetching list:', error); const errorMsg = error.code === '42P01' ? "Error: Falta tabla 'Ejercicios'." : `Error cargar ejercicios: ${error.message}`; showToast(errorMsg, 'error'); masterExerciseList = []; } else { masterExerciseList = data || []; } populateExerciseDropdowns(); return masterExerciseList; } catch (error) { console.error('Fatal error fetching list:', error); showToast(`Error inesperado: ${error.message}`, 'error'); masterExerciseList = []; populateExerciseDropdowns(); return []; }
};
const insertDefaultExercises = async () => {
    if (!currentUser || !currentUser.id || !supabaseClient) { console.error("Cannot insert defaults: Invalid user/client."); return false; } console.log("Inserting default exercises for:", currentUser.id); const exercisesToInsert = defaultExercises.map(name => ({ nombre: name, user_id: currentUser.id })); try { const { error } = await supabaseClient.from('Ejercicios').insert(exercisesToInsert); if (error) { if (error.code === '23505') { console.warn("Defaults already exist."); return true; } else if (error.code === '42P01') { console.error("Table 'Ejercicios' missing."); showToast("Error: Tabla 'Ejercicios' no encontrada.", 'error'); return false; } else if (error.code === '42501') { console.error("RLS Error inserting defaults:", error.message); showToast("Error permisos iniciales.", 'error'); return false; } else { throw error; } } else { console.log("Defaults inserted."); return true; } } catch (error) { console.error("Unexpected error inserting defaults:", error); showToast(`Error insertar defaults: ${error.message}`, 'error'); return false; }
};
const addExerciseToDB = async (exerciseName) => {
    if (!currentUser || !exerciseName || !exerciseName.trim() || !supabaseClient) { showToast('Nombre de ejercicio vacío.', 'error'); return; } const trimmedName = exerciseName.trim(); const existingExercise = masterExerciseList.find(ex => ex.nombre.toLowerCase() === trimmedName.toLowerCase()); if (existingExercise) { showToast(`'${trimmedName}' ya existe.`, 'info'); return; } try { const { data, error } = await supabaseClient.from('Ejercicios').insert({ nombre: trimmedName, user_id: currentUser.id }).select('id, nombre').single(); if (error) { if (error.code === '23505') { showToast(`'${trimmedName}' ya existe (DB).`, 'info'); await fetchMasterExerciseList(); } else if (error.code === '42P01') { console.error("Table 'Ejercicios' missing."); showToast("Error: Tabla no encontrada.", 'error'); } else if (error.code === '42501') { console.error("RLS Error adding exercise:", error.message); showToast("Error permisos.", 'error'); } else { throw error; } } else if (data) { showToast(`Ejercicio '${data.nombre}' añadido.`, 'success'); if (newExerciseInput) newExerciseInput.value = ''; masterExerciseList.push(data); populateExerciseDropdowns(); } } catch (error) { console.error('Error adding exercise:', error); showToast(`Error: ${error.message}`, 'error'); }
};
const deleteExerciseFromDB = async (exerciseNameToDelete) => {
    if (!currentUser || !exerciseNameToDelete || !supabaseClient) return; if (!confirm(`¿Seguro eliminar '${exerciseNameToDelete}'?`)) { return; } try { const { error } = await supabaseClient.from('Ejercicios').delete().eq('nombre', exerciseNameToDelete); if (error) { if (error.code === '42P01') { console.error("Table 'Ejercicios' missing."); showToast("Error: Tabla no encontrada.", 'error'); } else if (error.code === '42501') { console.error("RLS Error deleting exercise:", error.message); showToast("Error permisos.", 'error'); } else { throw error; } } else { showToast(`Ejercicio '${exerciseNameToDelete}' eliminado.`, 'success'); masterExerciseList = masterExerciseList.filter(ex => ex.nombre !== exerciseNameToDelete); populateExerciseDropdowns(); await updateGraphDropdownAndChart(); } } catch (error) { console.error('Error deleting exercise:', error); showToast(`Error: ${error.message}`, 'error'); }
};
const fetchTotalWorkoutDays = async () => {
    if (!supabaseClient || !currentUser) return 0; try { const { data, error } = await supabaseClient.rpc('count_distinct_workout_days'); if (error) { console.error("Error RPC count_distinct_workout_days:", error); if (error.code === '42883') { showToast("Error: Función conteo no encontrada.", 'error'); } return 0; } console.log("Total distinct days:", data); return data ?? 0; } catch (rpcError) { console.error("Exception RPC:", rpcError); return 0; }
};
const saveWorkoutToDB = async (workoutData) => {
    if (!currentUser || !workoutData || !workoutData.date || !workoutData.exercise || !workoutData.sets || workoutData.sets.length === 0 || !supabaseClient || !saveWorkoutButton) { showToast('Datos inválidos.', 'error'); return; } showLoading(saveWorkoutButton, true); const workoutID = crypto.randomUUID(); const recordsToInsert = workoutData.sets.map(set => ({ "WorkoutID": workoutID, "Date": workoutData.date, "Exercise": workoutData.exercise, "SetNumber": set.setNumber, "Reps": set.reps, "Weight": set.weight, user_id: currentUser.id })); try { const { error } = await supabaseClient.from('Entrenamientos').insert(recordsToInsert); if (error) { console.error("Error saving workout:", error); const errorMsg = error.code === '42P01' ? "Error: Falta tabla 'Entrenamientos'." : error.code === '42501' ? "Error permisos guardar." : `Error guardar: ${error.message}`; showToast(errorMsg, 'error'); } else { showToast('Entrenamiento guardado.', 'success'); clearWorkoutForm(); const totalDays = await fetchTotalWorkoutDays(); if (historyCountSpan) { historyCountSpan.textContent = `(Total: ${totalDays} días)`; } await fetchAndDisplayWorkoutHistory('recent'); } } catch (error) { console.error("Unexpected error saving:", error); showToast(`Error: ${error.message}`, 'error'); } finally { showLoading(saveWorkoutButton, false); }
};
const fetchAndDisplayWorkoutHistory = async (filterType = 'recent', specificDate = null) => {
    if (!currentUser || !supabaseClient) return; if (historyLog) historyLog.innerHTML = '<p>Cargando historial...</p>'; let query; let isSpecificDateFilter = false; try { if (filterType === 'recent') { query = supabaseClient.from('Entrenamientos').select('*').order('Timestamp', { ascending: false }).limit(50); } else if (filterType === 'specific' && specificDate) { isSpecificDateFilter = true; query = supabaseClient.from('Entrenamientos').select('*').eq('Date', specificDate).order('Exercise', { ascending: true }).order('SetNumber', { ascending: true }); } else { console.warn("Invalid filter:", filterType, specificDate); if (historyLog) historyLog.innerHTML = '<p>Error filtro.</p>'; return; } const { data, error } = await query; if (error) { console.error('Error fetching history:', error); showToast(`Error cargar historial: ${error.message}`, 'error'); if (historyLog) historyLog.innerHTML = '<p>Error cargar.</p>'; return; } processFetchedHistoryData(data || [], isSpecificDateFilter, specificDate); await updateGraphDropdownAndChart(); if (filterType === 'recent') { displayWorkoutHistory(getRecentHistorySubset()); const totalDays = await fetchTotalWorkoutDays(); if (historyCountSpan) { historyCountSpan.textContent = `(Total: ${totalDays} días)`; } } else if (isSpecificDateFilter && specificDate) { displayWorkoutHistory(filterSpecificDate(specificDate)); if (historyCountSpan) { const countText = (workoutHistory[specificDate] && workoutHistory[specificDate].length > 0) ? `(${specificDate} - 1 día)` : `(${specificDate} - 0 días)`; historyCountSpan.textContent = countText; } } } catch (error) { console.error('Fatal error fetching history:', error); showToast(`Error inesperado: ${error.message}`, 'error'); if (historyLog) historyLog.innerHTML = '<p>Error fatal.</p>'; }
};
const processFetchedHistoryData = (fetchedData, isSpecificDateFilter, specificDate) => {
    if (!fetchedData) return; if (isSpecificDateFilter && specificDate && workoutHistory[specificDate]) { workoutHistory[specificDate] = []; } fetchedData.forEach(entry => { const dateKey = entry.Date; if (!dateKey) return; if (!workoutHistory[dateKey]) { workoutHistory[dateKey] = []; } const existingIndex = workoutHistory[dateKey].findIndex(existing => existing.id === entry.id); if (existingIndex === -1) { workoutHistory[dateKey].push(entry); loadedDatesSet.add(dateKey); } else { workoutHistory[dateKey][existingIndex] = entry; } }); for (const dateKey in workoutHistory) { workoutHistory[dateKey].sort((a, b) => { const exA = a.Exercise || ''; const exB = b.Exercise || ''; const nameComparison = exA.toLowerCase().localeCompare(exB.toLowerCase()); if (nameComparison !== 0) { return nameComparison; } return (a.SetNumber || 0) - (b.SetNumber || 0); }); }
};
const getRecentHistorySubset = (daysToShow = 7) => {
    const sortedDates = Object.keys(workoutHistory).sort((a, b) => { const dA = parseDate(a); const dB = parseDate(b); if (!dA && !dB) return 0; if (!dA) return 1; if (!dB) return -1; return dB - dA; }); const recentHistory = {}; let daysCount = 0; for (const date of sortedDates) { if (daysCount < daysToShow) { if (workoutHistory[date] && workoutHistory[date].length > 0) { recentHistory[date] = workoutHistory[date]; daysCount++; } } else { break; } } return recentHistory;
};
const filterSpecificDate = (dateString) => { const filtered = {}; if (dateString && workoutHistory[dateString]) { filtered[dateString] = workoutHistory[dateString]; } return filtered; };
const deleteWorkoutEntry = async (workoutId) => {
    if (!currentUser || !workoutId || !supabaseClient) return; if (!confirm('¿Seguro eliminar este entrenamiento?')) { return; } try { const { error } = await supabaseClient.from('Entrenamientos').delete().eq('WorkoutID', workoutId); if (error) { console.error('Error deleting entry:', error); const errorMsg = error.code === '42501' ? "Error permisos eliminar." : `Error eliminar: ${error.message}`; showToast(errorMsg, 'error'); return; } showToast('Entrenamiento eliminado.', 'success'); let dateKeyOfDeletedEntry = null; let dayBecameEmpty = false; Object.keys(workoutHistory).forEach(dateKey => { const initialLength = workoutHistory[dateKey].length; workoutHistory[dateKey] = workoutHistory[dateKey].filter(entry => { const keep = entry.WorkoutID !== workoutId; if (!keep && !dateKeyOfDeletedEntry) { dateKeyOfDeletedEntry = dateKey; } return keep; }); if (workoutHistory[dateKey].length === 0 && initialLength > 0) { delete workoutHistory[dateKey]; dayBecameEmpty = true; loadedDatesSet.delete(dateKey); } }); const currentFilterDateVal = filterDateInput?.value; const currentFormattedFilterDate = currentFilterDateVal ? formatDate(new Date(currentFilterDateVal + 'T00:00:00Z')) : null; const totalDays = await fetchTotalWorkoutDays(); if (currentFormattedFilterDate && currentFormattedFilterDate === dateKeyOfDeletedEntry) { displayWorkoutHistory(filterSpecificDate(currentFormattedFilterDate)); if (historyCountSpan) { const countText = `(${currentFormattedFilterDate} - 0 días)`; historyCountSpan.textContent = countText; } } else if (!currentFormattedFilterDate) { displayWorkoutHistory(getRecentHistorySubset()); if (historyCountSpan) { historyCountSpan.textContent = `(Total: ${totalDays} días)`; } } else { if (historyCountSpan) { historyCountSpan.textContent = `(Total: ${totalDays} días)`; } } await updateGraphDropdownAndChart(); } catch (error) { console.error('Unexpected error deleting:', error); showToast(`Error: ${error.message}`, 'error'); }
};
const updateWorkoutSetInDB = async (entryId, reps, weight) => {
    if (!currentUser || !entryId || !supabaseClient || !saveEditBtn) return; if ((reps !== null && (isNaN(reps) || reps < 0)) || (weight !== null && (isNaN(weight) || weight < 0))) { showToast('Valores inválidos.', 'error'); return; } showLoading(saveEditBtn, true); try { const { data, error } = await supabaseClient.from('Entrenamientos').update({ "Reps": reps, "Weight": weight }).eq('id', entryId).select().single(); if (error) { console.error("Error updating set:", error); const errorMsg = error.code === '42501' ? "Error permisos." : `Error DB: ${error.message}`; showToast(errorMsg, 'error'); return; } showToast('Serie actualizada.', 'success'); let updatedLocally = false; let dateKeyOfUpdatedEntry = null; for (const dateKey in workoutHistory) { const entryIndex = workoutHistory[dateKey].findIndex(entry => entry.id === entryId); if (entryIndex > -1) { if (data) { workoutHistory[dateKey][entryIndex] = data; } else { workoutHistory[dateKey][entryIndex].Reps = reps; workoutHistory[dateKey][entryIndex].Weight = weight; } updatedLocally = true; dateKeyOfUpdatedEntry = dateKey; break; } } if (updatedLocally) { const currentFilterDateVal = filterDateInput?.value; const currentFormattedFilterDate = currentFilterDateVal ? formatDate(new Date(currentFilterDateVal + 'T00:00:00Z')) : null; if (!currentFormattedFilterDate || currentFormattedFilterDate === dateKeyOfUpdatedEntry) { if (currentFormattedFilterDate) { displayWorkoutHistory(filterSpecificDate(currentFormattedFilterDate)); } else { displayWorkoutHistory(getRecentHistorySubset()); } } await updateGraphDropdownAndChart(); } setTimeout(closeEditModal, 1000); } catch (error) { console.error('Unexpected error updating:', error); showToast(`Error: ${error.message}`, 'error'); } finally { showLoading(saveEditBtn, false); }
};

// --- UI Update Functions ---
const displayWorkoutHistory = (historyDataToDisplay) => {
    if (!historyLog) return; historyLog.innerHTML = ''; const sortedDates = Object.keys(historyDataToDisplay).sort((a, b) => { const dA = parseDate(a); const dB = parseDate(b); if (!dA && !dB) return 0; if (!dA) return 1; if (!dB) return -1; return dB - dA; }); if (sortedDates.length === 0) { const currentFilterDateVal = filterDateInput?.value; const filterDateText = currentFilterDateVal ? `para ${formatDate(new Date(currentFilterDateVal + 'T00:00:00Z'))}` : 'recientes'; historyLog.innerHTML = `<p>No hay registros ${filterDateText}.</p>`; return; } sortedDates.forEach(dateKey => { const entriesForDate = historyDataToDisplay[dateKey] || []; if (entriesForDate.length === 0) return; const entriesGroupedByWorkout = entriesForDate.reduce((acc, entry) => { if (!entry || !entry.WorkoutID) return acc; if (!acc[entry.WorkoutID]) { acc[entry.WorkoutID] = { exercise: entry.Exercise || '?', date: entry.Date || '?', sets: [] }; } acc[entry.WorkoutID].sets.push(entry); return acc; }, {}); const sortedWorkoutIDs = Object.keys(entriesGroupedByWorkout).sort((a, b) => { const exA = (entriesGroupedByWorkout[a]?.exercise || '').toLowerCase(); const exB = (entriesGroupedByWorkout[b]?.exercise || '').toLowerCase(); return exA.localeCompare(exB); }); const dateGroupDiv = document.createElement('div'); dateGroupDiv.className = 'history-date-group'; const dateHeader = document.createElement('h3'); dateHeader.className = 'history-date-header'; dateHeader.innerHTML = `<i class="fas fa-calendar-alt"></i> ${dateKey}`; dateGroupDiv.appendChild(dateHeader); dateGroupDiv.insertAdjacentHTML('beforeend', '<hr class="date-separator">'); sortedWorkoutIDs.forEach(workoutId => { const workout = entriesGroupedByWorkout[workoutId]; if (!workout || workout.sets.length === 0) return; workout.sets.sort((a, b) => (a?.SetNumber || 0) - (b?.SetNumber || 0)); const entryDiv = document.createElement('div'); entryDiv.className = 'history-entry'; entryDiv.dataset.workoutId = workoutId; const exerciseHeaderDiv = document.createElement('div'); exerciseHeaderDiv.className = 'history-exercise-header'; const exerciseTextContainer = document.createElement('span'); exerciseTextContainer.className = 'history-exercise-name-text'; exerciseTextContainer.innerHTML = `<i class="fas fa-dumbbell"></i> ${workout.exercise}`; const deleteWorkoutBtn = document.createElement('button'); deleteWorkoutBtn.className = 'delete-workout-btn'; deleteWorkoutBtn.title = `Eliminar ${workout.exercise} del ${workout.date}`; deleteWorkoutBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Borrar'; deleteWorkoutBtn.onclick = () => deleteWorkoutEntry(workoutId); exerciseHeaderDiv.appendChild(exerciseTextContainer); exerciseHeaderDiv.appendChild(deleteWorkoutBtn); entryDiv.appendChild(exerciseHeaderDiv); workout.sets.forEach(set => { if (!set) return; const setDetail = document.createElement('div'); setDetail.className = 'history-set-detail'; const setText = document.createElement('span'); setText.className = 'history-set-text'; const repsText = set.Reps ?? 'N/A'; const weightText = set.Weight ?? 'N/A'; setText.innerHTML = `Serie ${set.SetNumber || '?'}: <strong>${repsText}</strong> Reps → <strong>${weightText}</strong> Kg`; const editSetBtn = document.createElement('button'); editSetBtn.className = 'edit-set-btn'; editSetBtn.dataset.entryId = set.id; editSetBtn.title = `Editar Serie ${set.SetNumber || ''}`; editSetBtn.innerHTML = '<i class="fas fa-edit"></i> Editar'; editSetBtn.addEventListener('click', () => openEditModal(set)); setDetail.appendChild(setText); setDetail.appendChild(editSetBtn); entryDiv.appendChild(setDetail); }); entryDiv.insertAdjacentHTML('beforeend', '<hr class="exercise-separator">'); dateGroupDiv.appendChild(entryDiv); }); historyLog.appendChild(dateGroupDiv); });
};
const prefillFormBasedOnHistory = (exerciseName) => {
    if (!exerciseName || Object.keys(workoutHistory).length === 0) { if (numSetsInput) numSetsInput.value = 1; updateSetsUI(1); const firstRow = setsContainer?.querySelector('.set-row'); if (firstRow) { const repsInput = firstRow.querySelector('.reps-input'); const weightInput = firstRow.querySelector('.weight-input'); if (repsInput) { repsInput.value = ''; repsInput.placeholder = 'Reps (>=1)'; } if (weightInput) { weightInput.value = ''; weightInput.placeholder = 'Peso (>0)'; } } return; }
    let lastWorkoutSets = []; const sortedDates = Object.keys(workoutHistory).sort((a, b) => { const dA = parseDate(a); const dB = parseDate(b); if (!dA && !dB) return 0; if (!dA) return 1; if (!dB) return -1; return dB - dA; });
    for (const date of sortedDates) {
        const entriesForDate = workoutHistory[date] || []; const workoutsOfExercise = entriesForDate.filter(entry => entry && entry.Exercise === exerciseName);
        if (workoutsOfExercise.length > 0) { const groupedByWorkout = workoutsOfExercise.reduce((acc, entry) => { if (!entry || !entry.WorkoutID) return acc; if (!acc[entry.WorkoutID]) acc[entry.WorkoutID] = []; acc[entry.WorkoutID].push(entry); return acc; }, {}); let latestTimestamp = 0; let lastWorkoutId = Object.keys(groupedByWorkout)[0]; Object.keys(groupedByWorkout).forEach(wId => { let maxTsInGroup = 0; groupedByWorkout[wId].forEach(set => { if (set.Timestamp) { maxTsInGroup = Math.max(maxTsInGroup, new Date(set.Timestamp).getTime()); } }); if (maxTsInGroup > latestTimestamp) { latestTimestamp = maxTsInGroup; lastWorkoutId = wId; } }); lastWorkoutSets = (groupedByWorkout[lastWorkoutId] || []).sort((a, b) => (a?.SetNumber || 0) - (b?.SetNumber || 0)); break; }
    }
    if (lastWorkoutSets.length > 0) {
        if (numSetsInput) numSetsInput.value = lastWorkoutSets.length; updateSetsUI(lastWorkoutSets.length); const setRows = setsContainer?.querySelectorAll('.set-row');
        setRows?.forEach((row, index) => { const setData = lastWorkoutSets[index]; if (setData) { const repsInput = row.querySelector('.reps-input'); const weightInput = row.querySelector('.weight-input'); if (repsInput) { repsInput.placeholder = (setData.Reps && setData.Reps >= 1) ? setData.Reps : 'Reps (>=1)'; repsInput.value = ''; } if (weightInput) { weightInput.value = (setData.Weight && setData.Weight > 0) ? setData.Weight : ''; weightInput.placeholder = weightInput.value ? setData.Weight : 'Peso (>0)'; } } }); const firstRepsInput = setsContainer?.querySelector('.reps-input'); firstRepsInput?.focus();
    } else {
        if (numSetsInput) numSetsInput.value = 1; updateSetsUI(1); const firstRow = setsContainer?.querySelector('.set-row'); if (firstRow) { const repsInput = firstRow.querySelector('.reps-input'); const weightInput = firstRow.querySelector('.weight-input'); if (repsInput) { repsInput.value = ''; repsInput.placeholder = 'Reps (>=1)'; } if (weightInput) { weightInput.value = ''; weightInput.placeholder = 'Peso (>0)'; } }
    }
};
const openEditModal = (setEntry) => {
    if (!editModal || !setEntry) return; if (editEntryIdInput) editEntryIdInput.value = setEntry.id || ''; if (editExerciseNameSpan) editExerciseNameSpan.textContent = setEntry.Exercise || 'N/A'; if (editDateSpan) editDateSpan.textContent = setEntry.Date || 'N/A'; if (editSetNumberSpan) editSetNumberSpan.textContent = setEntry.SetNumber || 'N/A'; if (editRepsInput) editRepsInput.value = setEntry.Reps ?? ''; if (editWeightInput) editWeightInput.value = setEntry.Weight ?? ''; if (saveEditBtn) showLoading(saveEditBtn, false); editModal.classList.remove('hidden'); editRepsInput?.focus();
};
const closeEditModal = () => { if (!editModal) return; editModal.classList.add('hidden'); if (editEntryIdInput) editEntryIdInput.value = ''; };
const hideChart = () => {
    if (chartContainer) chartContainer.classList.add('hidden'); if (hideGraphBtn) hideGraphBtn.classList.add('hidden'); if (showSelectedGraphBtn) { showSelectedGraphBtn.classList.remove('hidden'); showSelectedGraphBtn.disabled = !graphExerciseSelect?.value || graphExerciseSelect?.options.length <= 1; } if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
};

// --- Chart Functions ---
const hasEnoughDataForChart = (exerciseName) => {
    if (!exerciseName || !workoutHistory) return false; const validDates = new Set(); for (const dateKey in workoutHistory) { const entriesForDate = workoutHistory[dateKey] || []; for (const entry of entriesForDate) { if (entry && entry.Exercise === exerciseName && entry.Weight != null && entry.Reps != null && entry.Reps > 0 && entry.Weight > 0) { validDates.add(entry.Date); if (validDates.size >= 2) { return true; } } } } return false;
};
const updateChartData = async () => {
    if (!graphExerciseSelect || !progressChartCanvas) { console.warn("Graph elements missing."); hideChart(); return; } const selectedExercise = graphExerciseSelect.value; if (!selectedExercise) { hideChart(); return; } showToast('Calculando datos gráfica...', 'info', 2000); const dailyAvgE1RM = {}; for (const dateKey in workoutHistory) { const entriesForDate = workoutHistory[dateKey] || []; for (const entry of entriesForDate) { if (entry && entry.Exercise === selectedExercise && entry.Weight != null && entry.Reps != null && entry.Reps > 0 && entry.Weight > 0) { const e1RM = calculateE1RM(entry.Weight, entry.Reps); if (e1RM > 0) { const dateObj = parseDate(entry.Date); if (!dateObj) continue; const dateKeyISO = dateObj.toISOString().split('T')[0]; if (!dailyAvgE1RM[dateKeyISO]) { dailyAvgE1RM[dateKeyISO] = { totalE1RM: 0, count: 0 }; } dailyAvgE1RM[dateKeyISO].totalE1RM += e1RM; dailyAvgE1RM[dateKeyISO].count++; } } } } const sortedDatesISO = Object.keys(dailyAvgE1RM).sort();
    if (sortedDatesISO.length < 2) { console.warn(`updateChartData called for ${selectedExercise} with ${sortedDatesISO.length} points.`); if (chartInstance) { chartInstance.destroy(); chartInstance = null; } const ctx = progressChartCanvas; if (ctx) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); } return; } const labels = sortedDatesISO.map(dateISO => formatDate(dateISO)); const dataPoints = sortedDatesISO.map(dateISO => (dailyAvgE1RM[dateISO].totalE1RM / dailyAvgE1RM[dateISO].count).toFixed(1)); renderProgressChart(labels, dataPoints, selectedExercise);
};
const renderProgressChart = (labels, dataPoints, exerciseName) => {
    if (!progressChartCanvas) return; if (chartInstance) { chartInstance.destroy(); } chartInstance = new Chart(progressChartCanvas, { type: 'line', data: { labels: labels, datasets: [{ label: `e1RM Diario (${exerciseName})`, data: dataPoints, borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.1)', borderWidth: 2, tension: 0.1, pointBackgroundColor: '#3498db', pointRadius: 3, pointHoverRadius: 5 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { title: { display: true, text: 'e1RM (kg)' }, grace: '10%' }, x: { title: { display: window.innerWidth > 600, text: 'Fecha' }, ticks: { maxRotation: 70, minRotation: 0, autoSkip: true, maxTicksLimit: 10 } } }, plugins: { legend: { position: 'top', labels: { boxWidth: 15, font: { size: 10 } } }, tooltip: { callbacks: { label: function(context) { let label = context.dataset.label || ''; if (label) { label = label.split('(')[0].trim() + ': '; } if (context.parsed.y !== null) { label += context.parsed.y + ' kg'; } return label; } } } } } });
};

// --- AUTHENTICATION ---
const handleAuthChange = (event, session) => {
    console.log("Auth Event:", event, "| Session:", session ? session.user.email : 'No');
    switch (event) {
        case 'SIGNED_IN':
            if (session) {
                console.log("Signed In:", session.user.email);
                currentUser = session.user;
                setAuthState(false); // Mostrar App
                if (authError) authError.textContent = '';
                // Actualizar email en el dropdown
                if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || 'Usuario';
                initializeAppData();
            }
            break;
        case 'SIGNED_OUT':
            console.log("Signed Out");
            currentUser = null;
            setAuthState(true); // Mostrar Auth
            // Limpiar estado de la app (ya existente)
            masterExerciseList = []; workoutHistory = {}; loadedDatesSet = new Set(); exercisesWithHistory.clear();
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
            if (historyLog) historyLog.innerHTML = ''; if (historyCountSpan) historyCountSpan.textContent = '(Total: 0 días)';
            clearWorkoutForm(); populateExerciseDropdowns(); populateGraphExerciseDropdown(); hideChart();
            if (filterDateInput) filterDateInput.value = '';
            break;
        case 'INITIAL_SESSION': console.log("Initial Session:", session ? "Found" : "None"); break;
        case 'USER_UPDATED':
            if (session) {
              currentUser = session.user;
              // Actualizar email si cambia mientras está logado
              if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || 'Usuario';
            }
            console.log("User Updated:", session?.user?.email);
            break;
        case 'PASSWORD_RECOVERY': console.log("Password Recovery Started."); showToast('Se ha enviado un enlace para recuperar tu contraseña a tu email.', 'info'); break;
        default: console.log("Unhandled Auth Event:", event);
    }
};
const initializeAppData = async () => {
    if (!currentUser) { console.warn("init without user."); return; } console.log("Initializing App Data for:", currentUser.email); if (workoutDateInput) { try { workoutDateInput.valueAsDate = new Date(); } catch (e) { workoutDateInput.value = new Date().toISOString().split('T')[0]; } } if (filterDateInput) filterDateInput.value = ''; const totalDays = await fetchTotalWorkoutDays(); if (historyCountSpan) { historyCountSpan.textContent = `(Total: ${totalDays} días)`; } const currentExercises = await fetchMasterExerciseList(); if (currentExercises.length === 0 && currentUser && supabaseClient) { console.log("No exercises found. Inserting defaults..."); const defaultsInserted = await insertDefaultExercises(); if (defaultsInserted) { console.log("Reloading exercises after defaults."); await fetchMasterExerciseList(); } } await fetchAndDisplayWorkoutHistory('recent'); updateSetsUI(1); hideChart(); console.log("App Data Initialized.");
};

// --- EVENT LISTENERS ---
loginBtn?.addEventListener('click', async () => {
    if (!authEmailInput || !authPasswordInput || !supabaseClient) return;
    const email = authEmailInput.value; const password = authPasswordInput.value; if (authError) authError.textContent = '';
    try { const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) throw error; console.log("Login OK:", email); }
    catch (error) { console.error("Login Error:", error); if (authError) authError.textContent = traducirErrorAuth(error.message); }
});

signupBtn?.addEventListener('click', async () => {
    if (!authEmailInput || !authPasswordInput || !supabaseClient) return;
    const email = authEmailInput.value; const password = authPasswordInput.value; if (authError) authError.textContent = '';
    try { const { error } = await supabaseClient.auth.signUp({ email, password }); if (error) throw error;
        showToast('¡Registro exitoso! Revisa tu email para activar la cuenta (si es necesario) e inicia sesión.', 'success', 6000);
        console.log("Signup Request OK:", email); authPasswordInput.value = ''; }
    catch (error) { console.error("Signup Error:", error); if (authError) authError.textContent = traducirErrorAuth(error.message); }
});

// Logout ahora se maneja desde el botón del menú
logoutMenuBtn?.addEventListener('click', async () => {
    if (!supabaseClient) return;
    try {
        console.log("Attempting logout...");
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        console.log("Logout OK via menu");
        // handleAuthChange se encargará de la UI
    } catch (error) {
        console.error("Logout Error:", error);
        showToast(`Error cerrar sesión: ${error.message}`, 'error');
    }
});

// Listener para abrir/cerrar el menú de usuario
userMenuBtn?.addEventListener('click', (event) => {
    event.stopPropagation(); // Evitar que el click se propague al document
    if (userMenuDropdown) {
        const isHidden = userMenuDropdown.classList.toggle('hidden');
        userMenuBtn.setAttribute('aria-expanded', String(!isHidden));
    }
});

// Listener para cerrar el menú si se hace clic fuera
document.addEventListener('click', (event) => {
    if (userMenuDropdown && !userMenuDropdown.classList.contains('hidden')) {
        const isClickInside = userMenuDropdown.contains(event.target);
        const isButtonClick = userMenuBtn?.contains(event.target);

        if (!isClickInside && !isButtonClick) {
            userMenuDropdown.classList.add('hidden');
            userMenuBtn?.setAttribute('aria-expanded', 'false');
        }
    }
});


numSetsInput?.addEventListener('input', (e) => { const numSets = Math.max(1, parseInt(e.target.value, 10) || 1); if (parseInt(e.target.value, 10) !== numSets) { e.target.value = numSets; } updateSetsUI(numSets); });
addSetButton?.addEventListener('click', () => { const currentSets = parseInt(numSetsInput?.value || '0', 10); const newCount = Math.max(1, currentSets + 1); if(numSetsInput) numSetsInput.value = newCount; updateSetsUI(newCount); });
setsContainer?.addEventListener('click', (e) => { const removeButton = e.target.closest('.remove-set-btn'); if (removeButton) { const setToRemove = removeButton.closest('.set-row'); if (setToRemove) { setToRemove.remove(); renumberSetLabels(); } } });
exerciseSelect?.addEventListener('change', (e) => { prefillFormBasedOnHistory(e.target.value); });

workoutForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!workoutDateInput || !exerciseSelect || !setsContainer) return;
    const workoutData = { date: formatDate(new Date(workoutDateInput.value + 'T00:00:00Z')), exercise: exerciseSelect.value, sets: [] };
    if (!workoutData.date) { showToast('Fecha inválida.', 'error'); workoutDateInput.focus(); return; }
    if (!workoutData.exercise) { showToast('Selecciona un ejercicio.', 'error'); exerciseSelect.focus(); return; }
    const setRows = setsContainer.querySelectorAll('.set-row');
    if (setRows.length === 0) { showToast('Añade al menos una serie.', 'error'); return; }

    let isFormCompletelyValid = true;
    for (const row of setRows) {
        const repsInput = row.querySelector('.reps-input'); const weightInput = row.querySelector('.weight-input');
        repsInput.setCustomValidity(""); weightInput.setCustomValidity("");
        if (!repsInput.checkValidity()) { repsInput.reportValidity(); isFormCompletelyValid = false; break; }
        if (!weightInput.checkValidity()) { weightInput.reportValidity(); isFormCompletelyValid = false; break; }
        const weightValue = parseFloat(weightInput.value);
        if (isNaN(weightValue) || weightValue <= 0) { weightInput.setCustomValidity("El peso debe ser mayor que 0."); weightInput.reportValidity(); isFormCompletelyValid = false; break; }
        const reps = parseInt(repsInput.value, 10); const weight = parseFloat(weightInput.value); const setNumber = parseInt(row.dataset.setNumber, 10);
        workoutData.sets.push({ setNumber, reps, weight });
    }
    if (isFormCompletelyValid) { console.log("Formulario válido, guardando:", workoutData); saveWorkoutToDB(workoutData); }
    else { console.log("Formulario inválido, no se guarda."); }
});

toggleManageBtn?.addEventListener('click', () => { if (!exerciseManagementSection || !toggleManageBtn) return; const section = exerciseManagementSection; const icon = toggleManageBtn.querySelector('i'); section.classList.toggle('hidden'); if (icon) { icon.className = section.classList.contains('hidden') ? 'fas fa-list-ul' : 'fas fa-eye-slash'; } });
addExerciseBtn?.addEventListener('click', () => { if (newExerciseInput) { addExerciseToDB(newExerciseInput.value); } });
newExerciseInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); addExerciseToDB(e.target.value); } });
deleteExerciseSelect?.addEventListener('change', (e) => { if(deleteExerciseBtn) deleteExerciseBtn.disabled = !e.target.value; });
deleteExerciseBtn?.addEventListener('click', () => { if(deleteExerciseSelect && deleteExerciseSelect.value) { deleteExerciseFromDB(deleteExerciseSelect.value); } });
filterDateInput?.addEventListener('change', (e) => { const selectedDateValue = e.target.value; if (selectedDateValue) { const dateObj = new Date(selectedDateValue + 'T00:00:00Z'); const formattedDate = formatDate(dateObj); if (formattedDate) { console.log(`Filtering by date: ${formattedDate}`); fetchAndDisplayWorkoutHistory('specific', formattedDate); hideChart(); } else { console.warn("Invalid date:", selectedDateValue); showToast("Fecha inválida.", 'error'); } } else { console.log("Date cleared, showing recent."); showRecentBtn?.click(); } });
showRecentBtn?.addEventListener('click', async () => { if (filterDateInput) filterDateInput.value = ''; await fetchAndDisplayWorkoutHistory('recent'); hideChart(); });

showSelectedGraphBtn?.addEventListener('click', () => {
    if (!graphExerciseSelect) return;
    const selectedExercise = graphExerciseSelect.value;
    if (!selectedExercise) { showToast('Selecciona un ejercicio para ver la gráfica.', 'info'); if (chartContainer && !chartContainer.classList.contains('hidden')) hideChart(); return; }
    if (hasEnoughDataForChart(selectedExercise)) { console.log(`Showing graph for ${selectedExercise}`); if (chartContainer) chartContainer.classList.remove('hidden'); if (hideGraphBtn) hideGraphBtn.classList.remove('hidden'); if (showSelectedGraphBtn) showSelectedGraphBtn.classList.add('hidden'); updateChartData(); }
    else { console.log(`Not enough data for graph: ${selectedExercise}`); showToast(`Se necesitan al menos 2 días con datos válidos para graficar '${selectedExercise}'.`, 'info'); }
});

hideGraphBtn?.addEventListener('click', () => { console.log("Hiding graph"); hideChart(); });
graphExerciseSelect?.addEventListener('change', () => { console.log("Graph selection changed"); hideChart(); if (showSelectedGraphBtn) { showSelectedGraphBtn.disabled = !graphExerciseSelect.value; } });
editForm?.addEventListener('submit', (e) => {
    e.preventDefault(); if (!editEntryIdInput || !editRepsInput || !editWeightInput) return; const entryId = parseInt(editEntryIdInput.value, 10); const repsValue = editRepsInput.value.trim(); const weightValue = editWeightInput.value.trim(); const reps = repsValue === '' ? null : parseInt(repsValue, 10); const weight = weightValue === '' ? null : parseFloat(weightValue); if (!entryId || isNaN(entryId)) { showToast('Error: ID inválido.', 'error'); return; } if ((reps !== null && (isNaN(reps) || reps < 0)) || (weight !== null && (isNaN(weight) || weight < 0))) { showToast('Valores inválidos.', 'error'); return; } updateWorkoutSetInDB(entryId, reps, weight);
});
cancelEditBtns?.forEach(btn => { btn.addEventListener('click', closeEditModal); });

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded. Initializing..."); if (!supabaseClient) { console.error("Supabase client NOT defined!"); alert("Critical Error. Check console."); if(appSection) appSection.innerHTML = '<p class="error-message">Critical Error.</p>'; if(authSection) authSection.classList.add('hidden'); return; } if (!progressChartCanvas) { console.warn("Canvas #progress-chart not found."); }
    console.log("Setting up onAuthStateChange...");
    supabaseClient.auth.onAuthStateChange(handleAuthChange);
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        console.log("Initial getSession:", session ? `OK for ${session.user.email}` : 'No session');
        if (session) {
            // handleAuthChange ya debería haber sido (o será) llamado con SIGNED_IN
            // currentUser = session.user; // Asegurar que currentUser esté seteado
            // setAuthState(false); // Asegurar estado UI correcto
            // if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || 'Usuario'; // Poblar email
            // initializeAppData(); // Cargar datos
            // Lo comentado arriba es redundante si onAuthStateChange funciona bien
        } else {
            setAuthState(true); // Mostrar Auth si no hay sesión
        }
    }).catch(error => {
        console.error("Error getSession:", error);
        setAuthState(true); // Mostrar Auth en caso de error
    });
    console.log("Listeners/session init complete.");
});