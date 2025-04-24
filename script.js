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
const passwordResetSection = document.getElementById('password-reset-section');
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
const resetNewPasswordInput = document.getElementById('reset-new-password');
const resetConfirmPasswordInput = document.getElementById('reset-confirm-password');
const updatePasswordBtn = document.getElementById('update-password-btn');
const resetError = document.getElementById('reset-error');
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
const showLoading = (button, isLoading) => { /* ... */ };
const showToast = (message, type = 'info', duration = 3500) => { /* ... */ };
const traducirErrorAuth = (message) => { /* ... */ };
const showView = (viewName) => { /* ... (sin cambios respecto a la última versión) ... */
    authSection?.classList.add('hidden');
    appSection?.classList.add('hidden');
    passwordResetSection?.classList.add('hidden');
    document.body.classList.remove('auth-active', 'reset-active');

    if (viewName === 'auth') {
        authSection?.classList.remove('hidden');
        document.body.classList.add('auth-active');
        showResetConfirmation(false);
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
        authSection?.classList.remove('hidden');
        document.body.classList.add('auth-active');
    }
};
const formatDate = (date) => { /* ... */ };
const parseDate = (dateString) => { /* ... */ };
const formatToInputDate = (dateString) => { /* ... */ };
const createSetRowHTML = (setNumber) => { /* ... */ };
const updateSetsUI = (numberOfSets) => { /* ... */ };
const renumberSetLabels = () => { /* ... */ };
const populateExerciseDropdowns = () => { /* ... */ };
const populateGraphExerciseDropdown = () => { /* ... */ };
const clearWorkoutForm = () => { /* ... */ };
const calculateE1RM = (weight, reps) => { /* ... */ };
const updateGraphDropdownAndChart = async () => { /* ... */ };
const showResetConfirmation = (show) => { /* ... (sin cambios respecto a la última versión) ... */
    if (show) {
        passwordInputContainer?.classList.add('hidden');
        authButtonsContainer?.classList.add('hidden');
        resetConfirmationMessage?.classList.remove('hidden');
        if(authError) authError.textContent = '';
    } else {
        passwordInputContainer?.classList.remove('hidden');
        authButtonsContainer?.classList.remove('hidden');
        resetConfirmationMessage?.classList.add('hidden');
    }
};
/* --- SUPABASE INTERACTIONS --- */
const fetchMasterExerciseList = async () => { /* ... */ };
const insertDefaultExercises = async () => { /* ... */ };
const addExerciseToDB = async (name) => { /* ... */ };
const deleteExerciseFromDB = async (name) => { /* ... */ };
const fetchTotalWorkoutDays = async () => { /* ... */ };
const saveWorkoutToDB = async (data) => { /* ... */ };
const fetchAndDisplayWorkoutHistory = async (type = 'recent', date = null) => { /* ... */ };
const processFetchedHistoryData = (data, isSpecific, date) => { /* ... */ };
const getRecentHistorySubset = (days = 7) => { /* ... */ };
const filterSpecificDate = (date) => { /* ... */ };
const deleteWorkoutEntry = async (id) => { /* ... */ };
const updateWorkoutSetInDB = async (id, reps, weight) => { /* ... */ };
/* --- UI Update Functions --- */
const displayWorkoutHistory = (hist) => { /* ... */ };
const prefillFormBasedOnHistory = (exName) => { /* ... */ };
const openEditModal = (set) => { /* ... */ };
const closeEditModal = () => { /* ... */ };
const hideChart = () => { /* ... */ };
/* --- Chart Functions --- */
const hasEnoughDataForChart = (exName) => { /* ... */ };
const updateChartData = async (forceRender = false) => { /* ... */ };
const renderProgressChart = (labels, data, exName) => { /* ... */ };
/* --- AUTHENTICATION --- */
const handleAuthChange = (event, session) => { /* ... (sin cambios respecto a la última versión) ... */
    console.log("Auth Event:", event, "| Session:", !!session);

    switch (event) {
        case 'SIGNED_IN':
            if (session) {
                currentUser = session.user;
                showView('app');
                if (authError) authError.textContent = '';
                if (resetError) resetError.textContent = '';
                if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || 'Usuario';
                initializeAppData();
            } else {
                 console.warn("SIGNED_IN event without session.");
                 showView('auth');
            }
            break;
        case 'SIGNED_OUT':
            currentUser = null;
            showView('auth');
            /* Limpieza de estado */
            masterExerciseList = []; workoutHistory = {}; loadedDatesSet = new Set(); exercisesWithHistory.clear();
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
            if (historyLog) historyLog.innerHTML = '';
            if (historyCountSpan) historyCountSpan.textContent = '(Total: 0 días)';
            clearWorkoutForm(); populateExerciseDropdowns(); populateGraphExerciseDropdown(); hideChart();
            if (filterDateInput) filterDateInput.value = '';
            history.replaceState(null, '', window.location.pathname + window.location.search);
            break;
        case 'PASSWORD_RECOVERY':
            console.log("PASSWORD_RECOVERY event detected by SDK.");
            showView('resetPassword');
             history.replaceState(null, '', window.location.pathname + window.location.search);
            break;
        case 'USER_UPDATED':
            if (session) {
                currentUser = session.user;
                if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || 'Usuario';
                 console.log("USER_UPDATED event", currentUser);
            } else {
                 console.log("USER_UPDATED event without session.");
            }
            break;
        case 'INITIAL_SESSION':
            console.log("INITIAL_SESSION event (likely handled by getSession).");
            break;
        default:
            console.log("Unhandled Auth Event:", event);
    }
};
const initializeAppData = async () => { /* ... */ };
/* --- THEME MANAGEMENT --- */
const applyTheme = (theme) => { /* ... */ };
const getInitialTheme = () => { /* ... */ };

/* --- EVENT LISTENERS --- */
loginBtn?.addEventListener('click', async () => { /* ... (sin cambios) ... */ });
signupBtn?.addEventListener('click', async () => { /* ... (sin cambios) ... */ });

/* === LISTENER RESTABLECER CONTRASEÑA (MODIFICADO CON redirectTo) === */
forgotPasswordLink?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (authError) authError.textContent = '';
    const email = authEmailInput?.value;
    if (!email || !/\S+@\S+\.\S+/.test(email)) { if (authError) authError.textContent = "Por favor, introduce un email válido."; authEmailInput?.focus(); return; }
    if (!supabaseClient) { if (authError) authError.textContent = "Error de configuración."; console.error("Supabase client not available for password reset."); return; }

    showToast('Procesando solicitud...', 'info', 2000);
    try {
        /* --- AÑADIR redirectTo EXPLÍCITAMENTE --- */
        const redirectUrl = 'https://webbop-jujo.github.io/gym-tracker/';
        console.log('Requesting password reset with redirect to:', redirectUrl);

        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });
        /* --- FIN redirectTo --- */

        if (error) {
            if (error.message.includes("rate limit") || error.message.includes("For security purposes")) { throw error; }
            else { console.warn("Password Reset Issue (Supabase treated as success):", error.message); showResetConfirmation(true); }
        } else {
            showResetConfirmation(true);
        }
    } catch (error) {
        console.error("Password Reset Error (Catch):", error);
        if (authError) authError.textContent = traducirErrorAuth(error.message) || "Error al solicitar restablecimiento.";
        showResetConfirmation(false);
    }
});
/* === FIN LISTENER MODIFICADO === */

backToLoginBtn?.addEventListener('click', () => { showResetConfirmation(false); });

updatePasswordBtn?.addEventListener('click', async () => {
    /* ... (sin cambios respecto a la última versión) ... */
     const newPassword = resetNewPasswordInput?.value;
    const confirmPassword = resetConfirmPasswordInput?.value;

    if (resetError) resetError.textContent = '';

    if (!newPassword || !confirmPassword) { if (resetError) resetError.textContent = "Ambos campos son obligatorios."; return; }
    if (newPassword.length < 6) { if (resetError) resetError.textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
    if (newPassword !== confirmPassword) { if (resetError) resetError.textContent = "Las contraseñas no coinciden."; return; }
    if (!supabaseClient) { if (resetError) resetError.textContent = "Error de configuración."; return; }

    try {
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;

        showToast('Contraseña actualizada correctamente. Inicia sesión.', 'success', 5000);
        if(resetNewPasswordInput) resetNewPasswordInput.value = '';
        if(resetConfirmPasswordInput) resetConfirmPasswordInput.value = '';
        showView('auth');

    } catch (error) {
        console.error("Update Password Error:", error);
        if (resetError) resetError.textContent = traducirErrorAuth(error.message);
    }
});

logoutMenuBtn?.addEventListener('click', async () => { /* ... */ });
userMenuBtn?.addEventListener('click', (e) => { /* ... */ });
document.addEventListener('click', (e) => { /* ... */ });
themeToggleBtn?.addEventListener('click', () => { /* ... */ });
numSetsInput?.addEventListener('input', (e) => { /* ... */ });
addSetButton?.addEventListener('click', () => { /* ... */ });
setsContainer?.addEventListener('click', (e) => { /* ... */ });
exerciseSelect?.addEventListener('change', (e) => { /* ... */ });
workoutForm?.addEventListener('submit', (e) => { /* ... */ });
toggleManageBtn?.addEventListener('click', () => { /* ... */ });
addExerciseBtn?.addEventListener('click', () => { /* ... */ });
newExerciseInput?.addEventListener('keypress', (e) => { /* ... */ });
deleteExerciseSelect?.addEventListener('change', (e) => { /* ... */ });
deleteExerciseBtn?.addEventListener('click', () => { /* ... */ });
filterDateInput?.addEventListener('change', (e) => { /* ... */ });
showRecentBtn?.addEventListener('click', async () => { /* ... */ });
showSelectedGraphBtn?.addEventListener('click', () => { /* ... */ });
hideGraphBtn?.addEventListener('click', hideChart);
graphExerciseSelect?.addEventListener('change', () => { /* ... */ });
editForm?.addEventListener('submit', (e) => { /* ... */ });
cancelEditBtns?.forEach(btn => btn.addEventListener('click', closeEditModal));

/* --- INICIALIZACIÓN --- */
/* Sin cambios respecto a la última versión, depende de onAuthStateChange */
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded. Initializing...");
    applyTheme(getInitialTheme());

    if (!supabaseClient) { console.error("Supabase client NOT defined!"); /* ... */ return; }
    if (!progressChartCanvas) { console.warn("Canvas #progress-chart not found."); }

    console.log("Setting up onAuthStateChange listener...");
    supabaseClient.auth.onAuthStateChange(handleAuthChange);

    console.log("Checking initial session...");
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        console.log("Initial getSession result:", !!session);
        if (session) {
            currentUser = session.user;
            showView('app');
            if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email || 'Usuario';
            initializeAppData();
        } else {
             setTimeout(() => {
                if (!passwordResetSection?.classList.contains('hidden')) {
                     console.log("Password recovery view already active.");
                } else if (!appSection?.classList.contains('hidden')) {
                    console.log("App view already active.");
                }
                else {
                     showView('auth');
                }
             }, 50);
        }
        console.log("Initial UI check complete.");
    }).catch(error => {
        console.error("Error during initial getSession:", error);
        showView('auth');
    });

    console.log("App Initialization sequence started.");
});