/* --- SUPABASE CONFIGURATION --- */
const SUPABASE_URL = 'https://zrkevddalzftfclnalke.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpya2V2ZGRhbHpmdGZjbG5hbGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzk3MDksImV4cCI6MjA2MDgxNTcwOX0.tfWBmpZCl59h_srKog4yjX85qzMPmW7q5mys4kaP1Ds';

/* --- DEFAULT EXERCISES --- */
const defaultExercises = [ 'Press Banca Plano', 'Press Banca Inclinado', 'Aperturas de Pecho', 'Jalón al Pecho', 'Remo en Máquina', 'Remo Trapecio', 'Prensa Pierna', 'Extensión Cuádriceps', 'Curl Femoral', 'Press Militar', 'Elevaciones Laterales', 'Triceps con Cuerda', 'Extensión Triceps', 'Curl de Biceps', 'Curl Martillo' ];

/* --- Initialize Supabase Client --- */
let supabaseClient;
try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) { throw new Error("Supabase config missing."); }
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!supabaseClient) { throw new Error("Failed to create Supabase client."); }
} catch (error) { console.error("Supabase Init Error:", error); alert("Config Error."); throw error; }

/* --- GLOBAL STATE --- */
let masterExerciseList = []; let workoutHistory = {}; let loadedDatesSet = new Set();
let currentUser = null; let chartInstance = null; let exercisesWithHistory = new Set();
const THEME_STORAGE_KEY = 'gymTrackerThemePreference';

/* --- DOM Elements --- */
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const passwordResetSection = document.getElementById('password-reset-section'); /* Nueva sección */
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authError = document.getElementById('auth-error');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const passwordInputContainer = document.getElementById('password-input-container');
const authButtonsContainer = document.getElementById('auth-buttons-container');
const resetConfirmationMessage = document.getElementById('reset-confirmation-message');
const backToLoginBtn = document.getElementById('back-to-login-btn');
const resetNewPasswordInput = document.getElementById('reset-new-password'); /* Input nueva pass */
const resetConfirmPasswordInput = document.getElementById('reset-confirm-password'); /* Input confirmar */
const updatePasswordBtn = document.getElementById('update-password-btn'); /* Botón actualizar */
const resetError = document.getElementById('reset-error'); /* Error en form reset */
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
const userMenuBtn = document.getElementById('user-menu-btn');
const userMenuDropdown = document.getElementById('user-menu-dropdown');
const userEmailDisplay = document.getElementById('user-email-display');
const logoutMenuBtn = document.getElementById('logout-menu-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

/* --- HELPER FUNCTIONS --- */
const showLoading = (button, isLoading) => { /* ... (sin cambios) ... */ const spinner = button?.querySelector('.spinner'); if (!button) return; button.disabled = isLoading; if (spinner) spinner.classList.toggle('hidden', !isLoading); };
const showToast = (message, type = 'info', duration = 3500) => { /* ... (sin cambios) ... */ if (!notificationArea) { console.error("Elemento #notification-area no encontrado."); console.warn(`Fallback Toast (${type}): ${message}`); return; } const toast = document.createElement('div'); toast.classList.add('toast-notification', type); toast.textContent = message; notificationArea.insertBefore(toast, notificationArea.firstChild); const timeoutId = setTimeout(() => { toast.classList.add('fade-out'); toast.addEventListener('animationend', () => { if (toast.parentNode === notificationArea) notificationArea.removeChild(toast); }, { once: true }); }, duration); toast.addEventListener('click', () => { clearTimeout(timeoutId); toast.classList.add('fade-out'); }, { once: true }); };
const traducirErrorAuth = (message) => { /* ... (sin cambios, añadir más traducciones si es necesario) ... */ if (!message) return "Ha ocurrido un error inesperado."; console.log("Auth Err:", message); if (message.includes("Invalid login credentials")) return "Email o contraseña incorrectos."; if (message.includes("User already registered")) return "Este email ya está registrado. ¿Iniciar sesión?"; if (message.includes("Password should be at least 6 characters")) return "La contraseña debe tener mínimo 6 caracteres."; if (message.includes("Signup requires a valid password")) return "Registro fallido: Se requiere contraseña."; if (message.includes("Unable to validate email address: invalid format")) return "Formato de email inválido."; if (message.includes("check your email")) return "¡Registro casi listo! Revisa tu email."; if (message.includes("missing email")) return "Introduce tu email."; if (message.includes("sign-ins are disabled")) return "Login anónimo no permitido."; if (message.includes("For security purposes, you can only request this once every")) return "Demasiadas solicitudes. Inténtalo más tarde."; if(message.includes("Password confirmation mismatch")) return "Las contraseñas no coinciden."; if(message.includes("same password")) return "La nueva contraseña no puede ser igual a la anterior."; console.warn("Auth Err no traducido:", message); return "Ha ocurrido un error. Inténtalo de nuevo."; };

/* === Nueva función para gestionar qué vista mostrar === */
const showView = (viewName) => {
    /* Ocultar todas las secciones principales */
    authSection?.classList.add('hidden');
    appSection?.classList.add('hidden');
    passwordResetSection?.classList.add('hidden');
    document.body.classList.remove('auth-active', 'reset-active'); /* Limpiar clases de body */

    /* Mostrar la sección solicitada y añadir clase a body */
    if (viewName === 'auth') {
        authSection?.classList.remove('hidden');
        document.body.classList.add('auth-active');
        showResetConfirmation(false); /* Asegurar que el form de login esté normal */
        console.log("UI: Auth View Active");
    } else if (viewName === 'app') {
        appSection?.classList.remove('hidden');
        console.log("UI: App View Active");
    } else if (viewName === 'resetPassword') {
        passwordResetSection?.classList.remove('hidden');
        document.body.classList.add('reset-active');
        console.log("UI: Password Reset View Active");
    } else {
        console.error("Vista desconocida:", viewName);
        authSection?.classList.remove('hidden'); /* Fallback a auth */
        document.body.classList.add('auth-active');
    }
};

const formatDate = (date) => { /* ... (sin cambios) ... */ if (!date) return ''; try { const d = new Date(date); if (isNaN(d.getTime())) return ''; const day = String(d.getUTCDate()).padStart(2, '0'); const month = String(d.getUTCMonth() + 1).padStart(2, '0'); const year = d.getUTCFullYear(); return `${day}/${month}/${year}`; } catch (e) { return ''; } };
const parseDate = (dateString) => { /* ... (sin cambios) ... */ if (!dateString || typeof dateString !== 'string') return null; const parts = dateString.split('/'); if (parts.length === 3) { const day = parseInt(parts[0], 10); const month = parseInt(parts[1], 10) - 1; const year = parseInt(parts[2], 10); if (year > 1000 && month >= 0 && month <= 11 && day >= 1 && day <= 31) { const date = new Date(Date.UTC(year, month, day)); if (!isNaN(date.getTime()) && date.getUTCDate() === day && date.getUTCMonth() === month && date.getUTCFullYear() === year) return date; } } return null; };
const formatToInputDate = (dateString) => { /* ... (sin cambios) ... */ const d = parseDate(dateString); return d ? d.toISOString().split('T')[0] : ''; };
const createSetRowHTML = (setNumber) => { /* ... (sin cambios) ... */ return ` <div class="set-row" data-set-number="${setNumber}"> <div class="set-row-line-1"> <span class="set-number-label">Serie ${setNumber}:</span> <div class="set-input-group"> <label>Reps:</label> <input type="number" class="reps-input" placeholder="Reps" min="1" required aria-label="Repeticiones Serie ${setNumber}"> </div> </div> <div class="set-row-line-2"> <div class="set-input-group"> <label>Peso:</label> <input type="number" class="weight-input" placeholder="Peso" step="0.01" min="0.01" required aria-label="Peso Serie ${setNumber}"> <span>kg</span> </div> <button type="button" class="remove-set-btn" title="Quitar Serie ${setNumber}">×</button> </div> </div>`; };
const updateSetsUI = (numberOfSets) => { /* ... (sin cambios) ... */ if (!setsContainer) return; const currentRows = setsContainer.querySelectorAll('.set-row'); const currentCount = currentRows.length; numberOfSets = Math.max(1, numberOfSets); if (numberOfSets > currentCount) { for (let i = currentCount + 1; i <= numberOfSets; i++) { setsContainer.insertAdjacentHTML('beforeend', createSetRowHTML(i)); } } else if (numberOfSets < currentCount) { for (let i = currentCount; i > numberOfSets; i--) { currentRows[i - 1]?.remove(); } } renumberSetLabels(); };
const renumberSetLabels = () => { /* ... (sin cambios) ... */ if (!setsContainer) return; const setRows = setsContainer.querySelectorAll('.set-row'); setRows.forEach((row, index) => { const setNumber = index + 1; row.dataset.setNumber = setNumber; row.querySelector('.set-number-label').textContent = `Serie ${setNumber}:`; row.querySelector('.reps-input')?.setAttribute('aria-label', `Repeticiones Serie ${setNumber}`); row.querySelector('.weight-input')?.setAttribute('aria-label', `Peso Serie ${setNumber}`); row.querySelector('.remove-set-btn')?.setAttribute('title', `Quitar Serie ${setNumber}`); }); if (numSetsInput) numSetsInput.value = String(setRows.length); };
const populateExerciseDropdowns = () => { /* ... (sin cambios) ... */ masterExerciseList.sort((a, b) => a.nombre.localeCompare(b.nombre)); const optionsHTML = masterExerciseList.map(ex => `<option value="${ex.nombre}">${ex.nombre}</option>`).join(''); const placeholder = '<option value="" disabled selected>Selecciona...</option>'; if (exerciseSelect) exerciseSelect.innerHTML = placeholder + optionsHTML; if (deleteExerciseSelect) { deleteExerciseSelect.innerHTML = placeholder + optionsHTML; if (deleteExerciseBtn) deleteExerciseBtn.disabled = true; } };
const populateGraphExerciseDropdown = () => { /* ... (sin cambios) ... */ exercisesWithHistory.clear(); Object.values(workoutHistory).flat().forEach(entry => { if (entry?.Exercise && entry.Weight > 0 && entry.Reps > 0) exercisesWithHistory.add(entry.Exercise); }); const sorted = Array.from(exercisesWithHistory).sort(); const optionsHTML = sorted.map(ex => `<option value="${ex}">${ex}</option>`).join(''); if (graphExerciseSelect) { const currentVal = graphExerciseSelect.value; graphExerciseSelect.innerHTML = '<option value="" disabled selected>Selecciona ejercicio...</option>' + optionsHTML; if (sorted.includes(currentVal)) graphExerciseSelect.value = currentVal; else { graphExerciseSelect.value = ""; hideChart(); } if (showSelectedGraphBtn) showSelectedGraphBtn.disabled = sorted.length === 0 || !graphExerciseSelect.value; } };
const clearWorkoutForm = () => { /* ... (sin cambios) ... */ if (workoutForm) workoutForm.reset(); if (workoutDateInput) { try { workoutDateInput.valueAsDate = new Date(); } catch (e) { workoutDateInput.value = new Date().toISOString().split('T')[0]; } } if (setsContainer) setsContainer.innerHTML = ''; if (numSetsInput) numSetsInput.value = '1'; updateSetsUI(1); if (exerciseSelect) exerciseSelect.value = ""; if (newExerciseInput) newExerciseInput.value = ''; if (deleteExerciseSelect) deleteExerciseSelect.value = ''; if (deleteExerciseBtn) deleteExerciseBtn.disabled = true; if (exerciseManagementSection && !exerciseManagementSection.classList.contains('hidden')) { exerciseManagementSection.classList.add('hidden'); toggleManageBtn?.querySelector('i')?.setAttribute('class', 'fas fa-list-ul'); } if (saveWorkoutButton) { saveWorkoutButton.disabled = false; showLoading(saveWorkoutButton, false); } };
const calculateE1RM = (weight, reps) => { /* ... (sin cambios) ... */ const w = parseFloat(weight); const r = parseInt(reps, 10); if (!w || !r || r < 1 || w <= 0) return 0; return r === 1 ? w : w * (1 + (r / 30)); };
const updateGraphDropdownAndChart = async () => { /* ... (sin cambios) ... */ populateGraphExerciseDropdown(); const selected = graphExerciseSelect?.value; if (chartInstance && (!selected || !exercisesWithHistory.has(selected))) hideChart(); if (showSelectedGraphBtn && graphExerciseSelect) showSelectedGraphBtn.disabled = !selected || graphExerciseSelect.options.length <= 1; };

/* --- Función para mostrar el estado de confirmación de reset en login --- */
const showResetConfirmation = (show) => {
    if (show) {
        passwordInputContainer?.classList.add('hidden');
        authButtonsContainer?.classList.add('hidden');
        resetConfirmationMessage?.classList.remove('hidden');
        if(authError) authError.textContent = ''; /* Limpiar errores al mostrar confirmación */
        /* authEmailInput?.setAttribute('disabled', 'true'); */
    } else {
        passwordInputContainer?.classList.remove('hidden');
        authButtonsContainer?.classList.remove('hidden');
        resetConfirmationMessage?.classList.add('hidden');
        /* authEmailInput?.removeAttribute('disabled'); */
    }
};

/* --- Función para parsear parámetros del Hash URL --- */
const parseHashParams = () => {
    const hash = window.location.hash.substring(1); /* Quita el # inicial */
    const params = {};
    hash.split('&').forEach(part => {
        const [key, value] = part.split('=');
        if (key && value) {
            params[decodeURIComponent(key)] = decodeURIComponent(value);
        }
    });
    return params;
};


/* --- SUPABASE INTERACTIONS --- */
const fetchMasterExerciseList = async () => { /* ... (sin cambios) ... */ if (!currentUser || !supabaseClient) return []; try { const { data, error } = await supabaseClient.from('Ejercicios').select('id, nombre').order('nombre'); if (error) throw error; masterExerciseList = data || []; populateExerciseDropdowns(); return masterExerciseList; } catch (error) { console.error('Fetch List Err:', error); showToast(error.code === '42P01' ? 'Error: Falta tabla Ejercicios.' : `Error cargar: ${error.message}`, 'error'); masterExerciseList = []; populateExerciseDropdowns(); return []; } };
const insertDefaultExercises = async () => { /* ... (sin cambios) ... */ if (!currentUser?.id || !supabaseClient) return false; const exercises = defaultExercises.map(n => ({ nombre: n, user_id: currentUser.id })); try { const { error } = await supabaseClient.from('Ejercicios').insert(exercises); if (error && error.code !== '23505') throw error; return true; } catch (error) { console.error("Insert Defaults Err:", error); showToast(error.code === '42P01' ? 'Error: Tabla Ejercicios no encontrada.' : error.code === '42501' ? 'Error permisos iniciales.' : `Error defaults: ${error.message}`, 'error'); return false; } };
const addExerciseToDB = async (name) => { /* ... (sin cambios) ... */ if (!currentUser || !name?.trim() || !supabaseClient) { showToast('Nombre vacío.', 'error'); return; } const trimmed = name.trim(); if (masterExerciseList.some(ex => ex.nombre.toLowerCase() === trimmed.toLowerCase())) { showToast(`'${trimmed}' ya existe.`, 'info'); return; } try { const { data, error } = await supabaseClient.from('Ejercicios').insert({ nombre: trimmed, user_id: currentUser.id }).select('id, nombre').single(); if (error) throw error; if (data) { showToast(`Ejercicio '${data.nombre}' añadido.`, 'success'); if (newExerciseInput) newExerciseInput.value = ''; masterExerciseList.push(data); populateExerciseDropdowns(); } } catch (error) { console.error('Add Ex Err:', error); if (error.code === '23505') { showToast(`'${trimmed}' ya existe (DB).`, 'info'); await fetchMasterExerciseList(); } else showToast(error.code === '42P01' ? 'Error: Tabla Ejercicios.' : error.code === '42501' ? 'Error permisos.' : `Error: ${error.message}`, 'error'); } };
const deleteExerciseFromDB = async (name) => { /* ... (sin cambios) ... */ if (!currentUser || !name || !supabaseClient) return; if (!confirm(`¿Eliminar '${name}'?`)) return; try { const { error } = await supabaseClient.from('Ejercicios').delete().eq('nombre', name); if (error) throw error; showToast(`Ejercicio '${name}' eliminado.`, 'success'); masterExerciseList = masterExerciseList.filter(ex => ex.nombre !== name); populateExerciseDropdowns(); await updateGraphDropdownAndChart(); } catch (error) { console.error('Del Ex Err:', error); showToast(error.code === '42P01' ? 'Error: Tabla Ejercicios.' : error.code === '42501' ? 'Error permisos.' : `Error: ${error.message}`, 'error'); } };
const fetchTotalWorkoutDays = async () => { /* ... (sin cambios) ... */ if (!supabaseClient || !currentUser) return 0; try { const { data, error } = await supabaseClient.rpc('count_distinct_workout_days'); if (error) throw error; return data ?? 0; } catch (error) { console.error("RPC Err:", error); if (error.code === '42883') showToast("Error: Función conteo.", 'error'); return 0; } };
const saveWorkoutToDB = async (data) => { /* ... (sin cambios) ... */ if (!currentUser || !data?.date || !data.exercise || !data.sets?.length || !supabaseClient || !saveWorkoutButton) { showToast('Datos inválidos.', 'error'); return; } showLoading(saveWorkoutButton, true); const workoutID = crypto.randomUUID(); const records = data.sets.map(s => ({ WorkoutID: workoutID, Date: data.date, Exercise: data.exercise, SetNumber: s.setNumber, Reps: s.reps, Weight: s.weight, user_id: currentUser.id })); try { const { error } = await supabaseClient.from('Entrenamientos').insert(records); if (error) throw error; showToast('Entrenamiento guardado.', 'success'); clearWorkoutForm(); const days = await fetchTotalWorkoutDays(); if (historyCountSpan) historyCountSpan.textContent = `(Total: ${days} días)`; await fetchAndDisplayWorkoutHistory('recent'); } catch (error) { console.error("Save Err:", error); showToast(error.code === '42P01' ? 'Error: Tabla Entrenamientos.' : error.code === '42501' ? 'Error permisos.' : `Error guardar: ${error.message}`, 'error'); } finally { showLoading(saveWorkoutButton, false); } };
const fetchAndDisplayWorkoutHistory = async (type = 'recent', date = null) => { /* ... (sin cambios) ... */ if (!currentUser || !supabaseClient) return; if (historyLog) historyLog.innerHTML = '<p>Cargando...</p>'; let query; try { if (type === 'recent') query = supabaseClient.from('Entrenamientos').select('*').order('Timestamp', { ascending: false }).limit(50); else if (type === 'specific' && date) query = supabaseClient.from('Entrenamientos').select('*').eq('Date', date).order('Exercise').order('SetNumber'); else { if (historyLog) historyLog.innerHTML = '<p>Error filtro.</p>'; return; } const { data, error } = await query; if (error) throw error; processFetchedHistoryData(data || [], type === 'specific', date); await updateGraphDropdownAndChart(); if (type === 'recent') { displayWorkoutHistory(getRecentHistorySubset()); const days = await fetchTotalWorkoutDays(); if (historyCountSpan) historyCountSpan.textContent = `(Total: ${days} días)`; } else if (type === 'specific' && date) { displayWorkoutHistory(filterSpecificDate(date)); if (historyCountSpan) historyCountSpan.textContent = `(${date} - ${workoutHistory[date]?.length ? '1' : '0'} día${workoutHistory[date]?.length === 1 ? '' : 's'})`; } } catch (error) { console.error('Fetch Hist Err:', error); showToast(`Error historial: ${error.message}`, 'error'); if (historyLog) historyLog.innerHTML = '<p>Error cargar.</p>'; } };
const processFetchedHistoryData = (data, isSpecific, date) => { /* ... (sin cambios) ... */ if (!data) return; if (isSpecific && date && workoutHistory[date]) workoutHistory[date] = []; data.forEach(entry => { const k = entry.Date; if (!k) return; workoutHistory[k] = workoutHistory[k] || []; if (!workoutHistory[k].some(e => e.id === entry.id)) { workoutHistory[k].push(entry); loadedDatesSet.add(k); } else { workoutHistory[k] = workoutHistory[k].map(e => e.id === entry.id ? entry : e); } }); Object.values(workoutHistory).forEach(arr => arr.sort((a, b) => (a.Exercise||'').localeCompare(b.Exercise||'') || (a.SetNumber||0) - (b.SetNumber||0))); };
const getRecentHistorySubset = (days = 7) => { /* ... (sin cambios) ... */ const dates = Object.keys(workoutHistory).sort((a, b) => (parseDate(b)?.getTime() ?? 0) - (parseDate(a)?.getTime() ?? 0)); const recent = {}; let count = 0; for (const d of dates) { if (count < days && workoutHistory[d]?.length) { recent[d] = workoutHistory[d]; count++; } else if (count >= days) break; } return recent; };
const filterSpecificDate = (date) => { /* ... (sin cambios) ... */ const f = {}; if (date && workoutHistory[date]) f[date] = workoutHistory[date]; return f; };
const deleteWorkoutEntry = async (id) => { /* ... (sin cambios) ... */ if (!currentUser || !id || !supabaseClient) return; if (!confirm('¿Eliminar entrenamiento?')) return; try { const { error } = await supabaseClient.from('Entrenamientos').delete().eq('WorkoutID', id); if (error) throw error; showToast('Entrenamiento eliminado.', 'success'); let delDate = null; Object.keys(workoutHistory).forEach(k => { const len = workoutHistory[k].length; workoutHistory[k] = workoutHistory[k].filter(e => { if (e.WorkoutID === id) { delDate = k; return false; } return true; }); if (workoutHistory[k].length === 0 && len > 0) { delete workoutHistory[k]; loadedDatesSet.delete(k); } }); const fDateVal = filterDateInput?.value; const fDateFmt = fDateVal ? formatDate(new Date(fDateVal + 'T00:00:00Z')) : null; const days = await fetchTotalWorkoutDays(); if (fDateFmt === delDate) { displayWorkoutHistory(filterSpecificDate(fDateFmt)); if (historyCountSpan) historyCountSpan.textContent = `(${fDateFmt} - 0 días)`; } else { displayWorkoutHistory(getRecentHistorySubset()); if (historyCountSpan) historyCountSpan.textContent = `(Total: ${days} días)`; } await updateGraphDropdownAndChart(); } catch (error) { console.error('Del Entry Err:', error); showToast(error.code === '42501' ? 'Error permisos.' : `Error: ${error.message}`, 'error'); } };
const updateWorkoutSetInDB = async (id, reps, weight) => { /* ... (sin cambios) ... */ if (!currentUser || !id || !supabaseClient || !saveEditBtn) return; if ((reps !== null && (isNaN(reps) || reps < 0)) || (weight !== null && (isNaN(weight) || weight < 0))) { showToast('Valores inválidos.', 'error'); return; } showLoading(saveEditBtn, true); try { const { data, error } = await supabaseClient.from('Entrenamientos').update({ Reps: reps, Weight: weight }).eq('id', id).select().single(); if (error) throw error; showToast('Serie actualizada.', 'success'); let updDate = null; for (const k in workoutHistory) { const idx = workoutHistory[k].findIndex(e => e.id === id); if (idx > -1) { workoutHistory[k][idx] = data || { ...workoutHistory[k][idx], Reps: reps, Weight: weight }; updDate = k; break; } } if (updDate) { const fDateVal = filterDateInput?.value; const fDateFmt = fDateVal ? formatDate(new Date(fDateVal + 'T00:00:00Z')) : null; if (!fDateFmt || fDateFmt === updDate) displayWorkoutHistory(fDateFmt ? filterSpecificDate(fDateFmt) : getRecentHistorySubset()); await updateGraphDropdownAndChart(); } setTimeout(closeEditModal, 1000); } catch (error) { console.error('Update Set Err:', error); showToast(error.code === '42501' ? 'Error permisos.' : `Error DB: ${error.message}`, 'error'); } finally { showLoading(saveEditBtn, false); } };

/* --- UI Update Functions --- */
const displayWorkoutHistory = (hist) => { /* ... (sin cambios) ... */ if (!historyLog) return; historyLog.innerHTML = ''; const dates = Object.keys(hist).sort((a, b) => (parseDate(b)?.getTime() ?? 0) - (parseDate(a)?.getTime() ?? 0)); if (!dates.length) { const fText = filterDateInput?.value ? `para ${formatDate(new Date(filterDateInput.value + 'T00:00:00Z'))}` : 'recientes'; historyLog.innerHTML = `<p style="color: var(--text-secondary);">No hay registros ${fText}.</p>`; return; } dates.forEach(k => { if (!hist[k]?.length) return; const grouped = hist[k].reduce((a, e) => { if (e?.WorkoutID) (a[e.WorkoutID] = a[e.WorkoutID] || { ex: e.Exercise || '?', dt: e.Date || '?', sets: [] }).sets.push(e); return a; }, {}); const wIDs = Object.keys(grouped).sort((a, b) => (grouped[a]?.ex || '').localeCompare(grouped[b]?.ex || '')); const dDiv = document.createElement('div'); dDiv.className = 'history-date-group'; dDiv.innerHTML = `<h3 class="history-date-header"><i class="fas fa-calendar-alt"></i> ${k}</h3><hr class="date-separator">`; wIDs.forEach(wId => { const w = grouped[wId]; if (!w?.sets?.length) return; w.sets.sort((a, b) => (a?.SetNumber || 0) - (b?.SetNumber || 0)); const eDiv = document.createElement('div'); eDiv.className = 'history-entry'; eDiv.dataset.workoutId = wId; eDiv.innerHTML = `<div class="history-exercise-header"><span class="history-exercise-name-text"><i class="fas fa-dumbbell"></i> ${w.ex}</span><button class="delete-workout-btn" title="Eliminar ${w.ex} del ${w.dt}"><i class="fas fa-trash-alt"></i> Borrar</button></div>`; w.sets.forEach(s => { if (s) eDiv.innerHTML += `<div class="history-set-detail"><span class="history-set-text">Serie ${s.SetNumber||'?'}: <strong>${s.Reps??'N/A'}</strong> Reps → <strong>${s.Weight??'N/A'}</strong> Kg</span><button class="edit-set-btn" data-entry-id="${s.id}" title="Editar Serie ${s.SetNumber||''}"><i class="fas fa-edit"></i> Editar</button></div>`; }); eDiv.innerHTML += '<hr class="exercise-separator">'; dDiv.appendChild(eDiv); }); historyLog.appendChild(dDiv); }); historyLog.querySelectorAll('.delete-workout-btn').forEach(b => b.onclick = () => deleteWorkoutEntry(b.closest('.history-entry')?.dataset.workoutId)); historyLog.querySelectorAll('.edit-set-btn').forEach(b => b.onclick = () => { const id = b.dataset.entryId; const set = Object.values(workoutHistory).flat().find(s => String(s.id) === id); if (set) openEditModal(set); }); };
const prefillFormBasedOnHistory = (exName) => { /* ... (sin cambios) ... */ if (!exName || !Object.keys(workoutHistory).length) { if (numSetsInput) numSetsInput.value = '1'; updateSetsUI(1); setsContainer?.querySelector('.set-row')?.querySelectorAll('input').forEach(i => { i.value = ''; i.placeholder = i.classList.contains('reps-input') ? 'Reps (>=1)' : 'Peso (>0)'; }); return; } let lastSets = []; const dates = Object.keys(workoutHistory).sort((a, b) => (parseDate(b)?.getTime() ?? 0) - (parseDate(a)?.getTime() ?? 0)); for (const d of dates) { const entries = workoutHistory[d]?.filter(e => e?.Exercise === exName); if (entries?.length) { const grouped = entries.reduce((a, e) => { if (e?.WorkoutID) (a[e.WorkoutID] = a[e.WorkoutID] || []).push(e); return a; }, {}); let lastId = '', maxTs = 0; Object.keys(grouped).forEach(id => { const ts = Math.max(0, ...grouped[id].map(s => new Date(s.Timestamp).getTime())); if (ts > maxTs) { maxTs = ts; lastId = id; } }); lastSets = (grouped[lastId] || []).sort((a, b) => (a?.SetNumber || 0) - (b?.SetNumber || 0)); break; } } if (lastSets.length) { if (numSetsInput) numSetsInput.value = String(lastSets.length); updateSetsUI(lastSets.length); setsContainer?.querySelectorAll('.set-row').forEach((row, i) => { const data = lastSets[i]; if (data) { row.querySelector('.reps-input').placeholder = (data.Reps >= 1) ? String(data.Reps) : 'Reps (>=1)'; row.querySelector('.reps-input').value = ''; row.querySelector('.weight-input').value = (data.Weight > 0) ? String(data.Weight) : ''; row.querySelector('.weight-input').placeholder = row.querySelector('.weight-input').value ? String(data.Weight) : 'Peso (>0)'; } }); setsContainer?.querySelector('.reps-input')?.focus(); } else { if (numSetsInput) numSetsInput.value = '1'; updateSetsUI(1); setsContainer?.querySelector('.set-row')?.querySelectorAll('input').forEach(i => { i.value = ''; i.placeholder = i.classList.contains('reps-input') ? 'Reps (>=1)' : 'Peso (>0)'; }); } };
const openEditModal = (set) => { /* ... (sin cambios) ... */ if (!editModal || !set) return; if (editEntryIdInput) editEntryIdInput.value = String(set.id || ''); if (editExerciseNameSpan) editExerciseNameSpan.textContent = set.Exercise || 'N/A'; if (editDateSpan) editDateSpan.textContent = set.Date || 'N/A'; if (editSetNumberSpan) editSetNumberSpan.textContent = String(set.SetNumber || 'N/A'); if (editRepsInput) editRepsInput.value = set.Reps ?? ''; if (editWeightInput) editWeightInput.value = set.Weight ?? ''; if (saveEditBtn) showLoading(saveEditBtn, false); editModal.classList.remove('hidden'); editRepsInput?.focus(); };
const closeEditModal = () => { /* ... (sin cambios) ... */ if (!editModal) return; editModal.classList.add('hidden'); if (editEntryIdInput) editEntryIdInput.value = ''; };
const hideChart = () => { /* ... (sin cambios) ... */ if (chartContainer) chartContainer.classList.add('hidden'); if (hideGraphBtn) hideGraphBtn.classList.add('hidden'); if (showSelectedGraphBtn) { showSelectedGraphBtn.classList.remove('hidden'); showSelectedGraphBtn.disabled = !graphExerciseSelect?.value || graphExerciseSelect?.options.length <= 1; } if (chartInstance) { chartInstance.destroy(); chartInstance = null; } };

/* --- Chart Functions --- */
const hasEnoughDataForChart = (exName) => { /* ... (sin cambios) ... */ if (!exName || !workoutHistory) return false; const dates = new Set(); for (const k in workoutHistory) for (const e of workoutHistory[k]||[]) if (e?.Exercise === exName && e.Weight > 0 && e.Reps > 0) { dates.add(e.Date); if (dates.size >= 2) return true; } return false; };
const updateChartData = async (forceRender = false) => { /* ... (sin cambios) ... */ if (!graphExerciseSelect || !progressChartCanvas) { hideChart(); return; } const ex = graphExerciseSelect.value; if (!ex) { hideChart(); return; } if (!forceRender) showToast('Calculando gráfica...', 'info', 1500); const daily = {}; for (const k in workoutHistory) for (const e of workoutHistory[k]||[]) if (e?.Exercise === ex && e.Weight > 0 && e.Reps > 0) { const rm = calculateE1RM(e.Weight, e.Reps); if (rm > 0) { const iso = parseDate(e.Date)?.toISOString().split('T')[0]; if (iso) { daily[iso] = daily[iso] || { sum: 0, n: 0 }; daily[iso].sum += rm; daily[iso].n++; } } } const dates = Object.keys(daily).sort(); if (dates.length < 2) { if (chartInstance) { chartInstance.destroy(); chartInstance = null; } const ctx = progressChartCanvas; if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); hideChart(); if (!forceRender) showToast(`Se necesitan datos de ≥ 2 días para graficar '${ex}'.`, 'info'); return; } const labels = dates.map(d => formatDate(d)); const points = dates.map(d => (daily[d].sum / daily[d].n).toFixed(1)); renderProgressChart(labels, points, ex); };
const renderProgressChart = (labels, data, exName) => { /* ... (sin cambios) ... */ if (!progressChartCanvas) return; if (chartInstance) chartInstance.destroy(); const isDark = document.body.classList.contains('dark-theme'); const cs = getComputedStyle(document.documentElement); const gridClr = cs.getPropertyValue(isDark ? '--chart-grid-color-dark' : '--chart-grid-color'); const textClr = cs.getPropertyValue(isDark ? '--chart-text-color-dark' : '--chart-text-color'); const tooltipBg = cs.getPropertyValue(isDark ? '--chart-tooltip-bg-dark' : '--chart-tooltip-bg'); const tooltipTxt = cs.getPropertyValue(isDark ? '--chart-tooltip-text-dark' : '--chart-tooltip-text'); const pointClr = cs.getPropertyValue('--accent-blue'); const lineClr = cs.getPropertyValue('--accent-blue'); chartInstance = new Chart(progressChartCanvas, { type: 'line', data: { labels: labels, datasets: [{ label: `e1RM Diario (${exName})`, data: data, borderColor: lineClr, backgroundColor: 'rgba(52, 152, 219, 0.1)', borderWidth: 2, tension: 0.1, pointBackgroundColor: pointClr, pointRadius: 3, pointHoverRadius: 5, pointHoverBorderColor: 'white', pointHoverBackgroundColor: pointClr }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { title: { display: true, text: 'e1RM (kg)', color: textClr }, ticks: { color: textClr }, grid: { color: gridClr, drawBorder: false }, grace: '10%' }, x: { title: { display: window.innerWidth > 600, text: 'Fecha', color: textClr }, ticks: { color: textClr, maxRotation: 70, minRotation: 0, autoSkip: true, maxTicksLimit: 10 }, grid: { color: gridClr, drawBorder: false } } }, plugins: { legend: { labels: { color: textClr, boxWidth: 15, font: { size: 10 } } }, tooltip: { backgroundColor: tooltipBg, titleColor: tooltipTxt, bodyColor: tooltipTxt, borderColor: gridClr, borderWidth: 1, callbacks: { label: (ctx) => `${(ctx.dataset.label||'').split('(')[0].trim()}: ${ctx.parsed.y ?? 0} kg` } } } } }); };

/* --- AUTHENTICATION --- */
const handleAuthChange = (event, session) => {
    console.log("Auth Event:", event, "| Session:", !!session);

    /* Si el evento es SIGNED_IN y estamos en la vista de reset, */
    /* significa que updateUser tuvo éxito. Volvemos a login. */
    if (event === 'SIGNED_IN' && passwordResetSection && !passwordResetSection.classList.contains('hidden')) {
        console.log("Password updated successfully, returning to login.");
        showToast('Contraseña actualizada correctamente.', 'success');
        /* Limpiar URL hash para evitar re-entrar en modo reset al refrescar */
        history.replaceState(null, '', window.location.pathname + window.location.search);
        showView('auth');
        return; /* No procesar el resto del SIGNED_IN normal en este caso */
    }

    switch (event) {
        case 'SIGNED_IN':
            if (session) {
                currentUser = session.user;
                showView('app'); /* Usar nueva función de vista */
                if (authError) authError.textContent = '';
                if (resetError) resetError.textContent = ''; /* Limpiar error de reset también */
                if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || 'Usuario';
                initializeAppData();
            }
            break;
        case 'SIGNED_OUT':
            currentUser = null;
            showView('auth'); /* Usar nueva función de vista */
            /* Limpieza de estado de la app */
            masterExerciseList = []; workoutHistory = {}; loadedDatesSet = new Set(); exercisesWithHistory.clear();
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
            if (historyLog) historyLog.innerHTML = '';
            if (historyCountSpan) historyCountSpan.textContent = '(Total: 0 días)';
            clearWorkoutForm(); populateExerciseDropdowns(); populateGraphExerciseDropdown(); hideChart();
            if (filterDateInput) filterDateInput.value = '';
            break;
        case 'PASSWORD_RECOVERY':
            /* Este evento se dispara CUANDO el usuario hace clic en el enlace del email. */
            /* La lógica para mostrar el form de reset se maneja al cargar la página (DOMContentLoaded) */
            /* al detectar el hash #...&type=recovery. Aquí solo mostramos un toast informativo */
            /* si queremos, aunque puede ser redundante si ya mostramos el form. */
            console.log("PASSWORD_RECOVERY event detected (handled by hash check on load).");
            /* showToast('Introduce tu nueva contraseña.', 'info'); */ /* Opcional */
            break;
        case 'INITIAL_SESSION':
            console.log("INITIAL_SESSION event (handled by getSession)");
            break;
        case 'USER_UPDATED':
             /* Este evento se dispara DESPUÉS de updateUser. */
             /* Ya no lo necesitamos para redirigir aquí, lo hacemos en el listener del botón */
            if (session) {
                currentUser = session.user;
                if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || 'Usuario';
            }
            console.log("USER_UPDATED event");
            break;
        default:
            console.log("Unhandled Auth Event:", event);
    }
};

const initializeAppData = async () => { /* ... (sin cambios) ... */ if (!currentUser) return; console.log("Init App Data..."); if (workoutDateInput) { try { workoutDateInput.valueAsDate = new Date(); } catch (e) { workoutDateInput.value = new Date().toISOString().split('T')[0]; } } if (filterDateInput) filterDateInput.value = ''; const days = await fetchTotalWorkoutDays(); if (historyCountSpan) historyCountSpan.textContent = `(Total: ${days} días)`; const exercises = await fetchMasterExerciseList(); if (!exercises.length && currentUser && supabaseClient) { if (await insertDefaultExercises()) await fetchMasterExerciseList(); } await fetchAndDisplayWorkoutHistory('recent'); updateSetsUI(1); hideChart(); console.log("App Data Initialized."); };

/* --- THEME MANAGEMENT --- */
const applyTheme = (theme) => { /* ... (sin cambios) ... */ const isDark = theme === 'dark'; document.body.classList.toggle('dark-theme', isDark); themeToggleBtn?.querySelector('i')?.setAttribute('class', isDark ? 'fas fa-sun' : 'fas fa-moon'); try { localStorage.setItem(THEME_STORAGE_KEY, theme); console.log(`Theme applied: ${theme}`); if (chartInstance && chartContainer && !chartContainer.classList.contains('hidden')) { console.log("Re-rendering chart for new theme..."); updateChartData(true); } } catch (e) { console.error("Failed to save theme preference:", e); } };
const getInitialTheme = () => { /* ... (sin cambios - tema oscuro por defecto) ... */ let theme = 'dark'; try { const stored = localStorage.getItem(THEME_STORAGE_KEY); if (stored === 'light') { theme = 'light'; } } catch (e) { console.error("Failed to read theme pref, defaulting to dark:", e); } console.log(`Initial theme determined: ${theme}`); return theme; };

/* --- EVENT LISTENERS --- */
loginBtn?.addEventListener('click', async () => {
    if (authError) authError.textContent = '';
    const email = authEmailInput?.value;
    const password = authPasswordInput?.value;
    if (!email) { if (authError) authError.textContent = "Por favor, introduce tu email."; authEmailInput?.focus(); return; }
    if (!password) { if (authError) authError.textContent = "Por favor, introduce tu contraseña."; authPasswordInput?.focus(); return; }
    if (!supabaseClient) { if (authError) authError.textContent = "Error de configuración."; console.error("Supabase client not available for login."); return; }
    try { const { error } = await supabaseClient.auth.signInWithPassword({ email, password }); if (error) throw error; console.log("Login attempt successful for:", email); } catch (error) { console.error("Login Error:", error); if (authError) authError.textContent = traducirErrorAuth(error.message); }
});

signupBtn?.addEventListener('click', async () => {
    if (authError) authError.textContent = '';
    const email = authEmailInput?.value;
    const password = authPasswordInput?.value;
    if (!email) { if (authError) authError.textContent = "Introduce tu email para registrarte."; authEmailInput?.focus(); return; }
    if (!password) { if (authError) authError.textContent = "Introduce una contraseña para registrarte."; authPasswordInput?.focus(); return; }
    if (password.length < 6) { if (authError) authError.textContent = "La contraseña debe tener al menos 6 caracteres."; authPasswordInput?.focus(); return; }
    if (!supabaseClient) { if (authError) authError.textContent = "Error de configuración."; return; }
    try { const { error } = await supabaseClient.auth.signUp({ email, password }); if (error) throw error; showToast('¡Registro exitoso! Revisa tu email si es necesario.', 'success', 6000); authPasswordInput.value = ''; } catch (error) { console.error("Signup Error:", error); if (authError) authError.textContent = traducirErrorAuth(error.message); }
});

forgotPasswordLink?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (authError) authError.textContent = '';
    const email = authEmailInput?.value;
    if (!email || !/\S+@\S+\.\S+/.test(email)) { if (authError) authError.textContent = "Por favor, introduce un email válido."; authEmailInput?.focus(); return; }
    if (!supabaseClient) { if (authError) authError.textContent = "Error de configuración."; console.error("Supabase client not available for password reset."); return; }
    showToast('Procesando solicitud...', 'info', 2000);
    try {
        /* Quitamos redirectTo aquí, usará la config de Supabase */
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
        if (error) { if (error.message.includes("rate limit") || error.message.includes("For security purposes")) { throw error; } else { console.warn("Password Reset Issue (Supabase treated as success):", error.message); showResetConfirmation(true); } }
        else { showResetConfirmation(true); }
    } catch (error) { console.error("Password Reset Error (Catch):", error); if (authError) authError.textContent = traducirErrorAuth(error.message) || "Error al solicitar restablecimiento."; showResetConfirmation(false); }
});

backToLoginBtn?.addEventListener('click', () => { showResetConfirmation(false); });

/* === LISTENER PARA ACTUALIZAR CONTRASEÑA === */
updatePasswordBtn?.addEventListener('click', async () => {
    const newPassword = resetNewPasswordInput?.value;
    const confirmPassword = resetConfirmPasswordInput?.value;

    if (resetError) resetError.textContent = ''; /* Limpiar error previo */

    /* Validaciones */
    if (!newPassword || !confirmPassword) { if (resetError) resetError.textContent = "Ambos campos son obligatorios."; return; }
    if (newPassword.length < 6) { if (resetError) resetError.textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
    if (newPassword !== confirmPassword) { if (resetError) resetError.textContent = "Las contraseñas no coinciden."; return; }
    if (!supabaseClient) { if (resetError) resetError.textContent = "Error de configuración."; return; }

    try {
        /* La sesión temporal necesaria para updateUser se obtiene */
        /* automáticamente por Supabase a partir del fragmento hash */
        /* que está presente en la URL cuando llegamos a esta vista */
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;

        /* Éxito: handleAuthChange detectará el evento SIGNED_IN (por updateUser) */
        /* y mostrará el mensaje y volverá al login */
        /* No necesitamos hacer nada más aquí explícitamente tras el éxito */
         console.log("Update user call successful, waiting for SIGNED_IN event.");

    } catch (error) {
        console.error("Update Password Error:", error);
        if (resetError) resetError.textContent = traducirErrorAuth(error.message);
    }
});
/* === FIN LISTENER ACTUALIZAR === */

logoutMenuBtn?.addEventListener('click', async () => { /* ... (sin cambios) ... */ if (!currentUser) { showView('auth'); return; } if (!supabaseClient) { showToast('Error interno.', 'error'); return; } try { const { error } = await supabaseClient.auth.signOut(); if (error) throw error; } catch (error) { console.error("Logout Err:", error); if (error.message?.includes("Auth session missing")) { showToast('Sesión expirada.', 'info'); showView('auth'); } else showToast(`Error logout: ${error.message}`, 'error'); } });
userMenuBtn?.addEventListener('click', (e) => { /* ... (sin cambios) ... */ e.stopPropagation(); if (userMenuDropdown) { const hidden = userMenuDropdown.classList.toggle('hidden'); userMenuBtn.setAttribute('aria-expanded', String(!hidden)); } });
document.addEventListener('click', (e) => { /* ... (sin cambios) ... */ if (userMenuDropdown && !userMenuDropdown.classList.contains('hidden') && !userMenuDropdown.contains(e.target) && !userMenuBtn?.contains(e.target)) { userMenuDropdown.classList.add('hidden'); userMenuBtn?.setAttribute('aria-expanded', 'false'); } });
themeToggleBtn?.addEventListener('click', () => { /* ... (sin cambios) ... */ const current = document.body.classList.contains('dark-theme') ? 'dark' : 'light'; applyTheme(current === 'dark' ? 'light' : 'dark'); });
numSetsInput?.addEventListener('input', (e) => { /* ... (sin cambios) ... */ const v = Math.max(1, parseInt(e.target.value, 10) || 1); if (parseInt(e.target.value, 10) !== v) e.target.value = String(v); updateSetsUI(v); });
addSetButton?.addEventListener('click', () => { /* ... (sin cambios) ... */ const v = Math.max(1, parseInt(numSetsInput?.value||'0', 10) + 1); if(numSetsInput) numSetsInput.value = String(v); updateSetsUI(v); });
setsContainer?.addEventListener('click', (e) => { /* ... (sin cambios) ... */ if (e.target.closest('.remove-set-btn')) { e.target.closest('.set-row')?.remove(); renumberSetLabels(); } });
exerciseSelect?.addEventListener('change', (e) => { /* ... (sin cambios) ... */ prefillFormBasedOnHistory(e.target.value); });
workoutForm?.addEventListener('submit', (e) => { /* ... (sin cambios) ... */ e.preventDefault(); if (!workoutDateInput || !exerciseSelect || !setsContainer) return; const data = { date: formatDate(new Date(workoutDateInput.value + 'T00:00:00Z')), exercise: exerciseSelect.value, sets: [] }; if (!data.date) { showToast('Fecha inválida.', 'error'); workoutDateInput.focus(); return; } if (!data.exercise) { showToast('Selecciona ejercicio.', 'error'); exerciseSelect.focus(); return; } const rows = setsContainer.querySelectorAll('.set-row'); if (!rows.length) { showToast('Añade series.', 'error'); return; } let valid = true; for (const r of rows) { const repsI = r.querySelector('.reps-input'); const weightI = r.querySelector('.weight-input'); [repsI, weightI].forEach(i => i.setCustomValidity("")); if (!repsI.checkValidity() || !weightI.checkValidity()) { repsI.reportValidity(); weightI.reportValidity(); valid = false; break; } const w = parseFloat(weightI.value); if (isNaN(w) || w <= 0) { weightI.setCustomValidity("Peso > 0."); weightI.reportValidity(); valid = false; break; } data.sets.push({ setNumber: parseInt(r.dataset.setNumber, 10), reps: parseInt(repsI.value, 10), weight: w }); } if (valid) saveWorkoutToDB(data); });
toggleManageBtn?.addEventListener('click', () => { /* ... (sin cambios) ... */ if (!exerciseManagementSection || !toggleManageBtn) return; const hidden = exerciseManagementSection.classList.toggle('hidden'); toggleManageBtn.querySelector('i').className = hidden ? 'fas fa-list-ul' : 'fas fa-eye-slash'; });
addExerciseBtn?.addEventListener('click', () => { /* ... (sin cambios) ... */ if (newExerciseInput) addExerciseToDB(newExerciseInput.value); });
newExerciseInput?.addEventListener('keypress', (e) => { /* ... (sin cambios) ... */ if (e.key === 'Enter') { e.preventDefault(); addExerciseToDB(e.target.value); } });
deleteExerciseSelect?.addEventListener('change', (e) => { /* ... (sin cambios) ... */ if(deleteExerciseBtn) deleteExerciseBtn.disabled = !e.target.value; });
deleteExerciseBtn?.addEventListener('click', () => { /* ... (sin cambios) ... */ if(deleteExerciseSelect?.value) deleteExerciseFromDB(deleteExerciseSelect.value); });
filterDateInput?.addEventListener('change', (e) => { /* ... (sin cambios) ... */ const d = e.target.value; if (d) { const fmt = formatDate(new Date(d + 'T00:00:00Z')); if (fmt) { fetchAndDisplayWorkoutHistory('specific', fmt); hideChart(); } else showToast("Fecha inválida.", 'error'); } else showRecentBtn?.click(); });
showRecentBtn?.addEventListener('click', async () => { /* ... (sin cambios) ... */ if (filterDateInput) filterDateInput.value = ''; await fetchAndDisplayWorkoutHistory('recent'); hideChart(); });
showSelectedGraphBtn?.addEventListener('click', () => { /* ... (sin cambios) ... */ if (!graphExerciseSelect) return; const ex = graphExerciseSelect.value; if (!ex) { showToast('Selecciona ejercicio.', 'info'); hideChart(); return; } if (hasEnoughDataForChart(ex)) { if (chartContainer) chartContainer.classList.remove('hidden'); if (hideGraphBtn) hideGraphBtn.classList.remove('hidden'); if (showSelectedGraphBtn) showSelectedGraphBtn.classList.add('hidden'); updateChartData(); } else showToast(`Se necesitan ≥ 2 días para graficar '${ex}'.`, 'info'); });
hideGraphBtn?.addEventListener('click', hideChart);
graphExerciseSelect?.addEventListener('change', () => { /* ... (sin cambios) ... */ hideChart(); if (showSelectedGraphBtn) showSelectedGraphBtn.disabled = !graphExerciseSelect.value; });
editForm?.addEventListener('submit', (e) => { /* ... (sin cambios) ... */ e.preventDefault(); if (!editEntryIdInput || !editRepsInput || !editWeightInput) return; const id = parseInt(editEntryIdInput.value, 10); const rVal = editRepsInput.value.trim(); const wVal = editWeightInput.value.trim(); const reps = rVal === '' ? null : parseInt(rVal, 10); const weight = wVal === '' ? null : parseFloat(wVal); if (!id || isNaN(id)) { showToast('Error: ID inválido.', 'error'); return; } if ((reps !== null && (isNaN(reps) || reps < 0)) || (weight !== null && (isNaN(weight) || weight < 0))) { showToast('Valores inválidos.', 'error'); return; } updateWorkoutSetInDB(id, reps, weight); });
cancelEditBtns?.forEach(btn => btn.addEventListener('click', closeEditModal));

/* --- INICIALIZACIÓN --- */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded. Initializing...");
    applyTheme(getInitialTheme());

    if (!supabaseClient) {
        console.error("Supabase client NOT defined!");
        alert("Critical Error: Supabase client failed to initialize. Check console.");
        document.body.innerHTML = '<p style="color: red; padding: 20px;">Error crítico al cargar la aplicación.</p>';
        return;
    }
    if (!progressChartCanvas) { console.warn("Canvas #progress-chart not found."); }

    console.log("Setting up onAuthStateChange listener...");
    supabaseClient.auth.onAuthStateChange(handleAuthChange);

    /* === DETECCIÓN DE HASH PARA RESETEO DE CONTRASEÑA === */
    const hashParams = parseHashParams();
    let isPasswordRecovery = false;

    if (hashParams.type === 'recovery' && hashParams.access_token) {
        console.log("Password recovery link detected.");
        isPasswordRecovery = true;
        showView('resetPassword'); /* Mostrar la vista de reseteo de contraseña */
        /* No llamamos a getSession aquí, ya que estamos en un estado de recuperación */
    }
    /* === FIN DETECCIÓN HASH === */


    /* Si no estamos en recuperación de contraseña, proceder con la carga normal */
    if (!isPasswordRecovery) {
        console.log("No password recovery detected. Checking initial session...");
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            console.log("Initial getSession result:", !!session);
            if (session) {
                currentUser = session.user;
                showView('app'); /* Mostrar app si hay sesión */
                if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || 'Usuario';
                initializeAppData();
            } else {
                showView('auth'); /* Mostrar login si no hay sesión */
            }
            console.log("Initial UI state set based on session.");
        }).catch(error => {
            console.error("Error during initial getSession:", error);
            showView('auth'); /* Fallback a Auth en caso de error */
        });
    } else {
         console.log("Password recovery mode active. Skipping initial session check.");
    }

    console.log("App Initialization sequence started.");
});