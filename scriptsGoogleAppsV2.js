// --- Nombres de Hojas ---
const SHEET_NAME_REGISTROS = "RegistrosGym";
const SHEET_NAME_EJERCICIOS = "Ejercicios";

// --- Constantes ---
const DEFAULT_EXERCISES = [ "Press Banca Plano", "Press Banca Inclinado", "Aperturas de Pecho", "Jalón al Pecho", "Remo Espalda", "Remo Trapecio", "Prensa Pierna", "Extensión de Cuádriceps", "Biceps Femoral", "Press Militar", "Hombro Laterales", "Triceps con Cuerda", "Triceps tras Nuca", "Curl Biceps", "Curl Martillo" ];

// --- Funciones Helper ---
function getSheetByNameOrThrow(ss, sheetName) { const sheet = ss.getSheetByName(sheetName); if (!sheet) throw new Error(`Hoja "${sheetName}" no encontrada.`); return sheet; }
function getMasterExerciseList(ss) {
  const exerciseSheet = getSheetByNameOrThrow(ss, SHEET_NAME_EJERCICIOS); let exerciseList = []; const lastRow = exerciseSheet.getLastRow();
  if (lastRow < 1) { Logger.log(`Hoja '${SHEET_NAME_EJERCICIOS}' vacía. Poblando.`); const dataToAdd = DEFAULT_EXERCISES.map(ex => [ex]); exerciseSheet.getRange(1, 1, dataToAdd.length, 1).setValues(dataToAdd); exerciseList = DEFAULT_EXERCISES.slice(); }
  else { const range = exerciseSheet.getRange(1, 1, lastRow, 1); const values = range.getValues(); exerciseList = values.map(row => row[0]).filter(value => typeof value === 'string' && value.trim() !== "").map(value => value.trim()); }
  exerciseList.sort((a, b) => a.localeCompare(b)); Logger.log(`Lista ejercicios obtenida (${exerciseList.length}).`); return exerciseList;
}

// --- doGet ---
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet(); const sheetRegistros = getSheetByNameOrThrow(ss, SHEET_NAME_REGISTROS);
    const exerciseList = getMasterExerciseList(ss);
    const loadType = e.parameter.load || 'recent'; const daysToLoadParam = e.parameter.days; const specificDateParam = e.parameter.date;
    Logger.log(`doGet: load=${loadType}, days=${daysToLoadParam}, date=${specificDateParam}`);
    const allSheetDataWithHeader = sheetRegistros.getDataRange().getValues();
    if (allSheetDataWithHeader.length <= 1) { Logger.log(`'${SHEET_NAME_REGISTROS}' vacía.`); return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [], totalWorkoutDays: 0, exerciseList: exerciseList })).setMimeType(ContentService.MimeType.JSON); }
    const headers = allSheetDataWithHeader.shift(); const allSheetData = allSheetDataWithHeader;
    const uniqueWorkoutDaysSet = new Set(); allSheetData.forEach(row => { const dateValue = row[2]; if (dateValue) { let fmtDate = null; if (dateValue instanceof Date) { try { fmtDate = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "dd/MM/yyyy"); } catch (e) {} } else if (typeof dateValue === 'string' && dateValue.includes('/')) { fmtDate = dateValue.trim(); } if (fmtDate) uniqueWorkoutDaysSet.add(fmtDate); } });
    const totalWorkoutDays = uniqueWorkoutDaysSet.size; Logger.log(`Total días únicos: ${totalWorkoutDays}`);
    let filteredDataRows = [];
    if (loadType === 'recent') { const days = parseInt(daysToLoadParam) || 7; filteredDataRows = filterRecentDaysData(allSheetData, days); }
    else if (loadType === 'specific') { if (!specificDateParam) throw new Error("'date' requerido."); filteredDataRows = filterSpecificDateData(allSheetData, specificDateParam); }
    else { filteredDataRows = allSheetData; }
    Logger.log(`Filas regs filtradas: ${filteredDataRows.length}`);
    const processedResult = processAndGroupData(filteredDataRows);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: processedResult, totalWorkoutDays: totalWorkoutDays, exerciseList: exerciseList })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) { Logger.log(`Error doGet: ${error.message}\n${error.stack}`); return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message, exerciseList: [] })).setMimeType(ContentService.MimeType.JSON); }
}

// --- Funciones auxiliares filtro/proceso historial (sin cambios) ---
function filterRecentDaysData(allSheetData, daysToLoad) { if (allSheetData.length === 0 || daysToLoad <= 0) return []; const uniqueDatesTimestamps = new Map(); allSheetData.forEach(row => { const ts = row[0]; if (ts == null || typeof ts !== 'number' || ts <= 0 || isNaN(ts)) return; try { const d = new Date(ts); const ds = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"); if (!uniqueDatesTimestamps.has(ds) || ts > uniqueDatesTimestamps.get(ds)) { uniqueDatesTimestamps.set(ds, ts); } } catch (e) {} }); const sortedDates = Array.from(uniqueDatesTimestamps.keys()).sort((a, b) => uniqueDatesTimestamps.get(b) - uniqueDatesTimestamps.get(a)); const targetDates = new Set(sortedDates.slice(0, daysToLoad)); Logger.log(`Fechas recientes (${targetDates.size})`); return allSheetData.filter(row => { const ts = row[0]; if (ts == null || typeof ts !== 'number' || ts <= 0 || isNaN(ts)) return false; try { const d = new Date(ts); const ds = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"); return targetDates.has(ds); } catch (e) { return false; } }); }
function filterSpecificDateData(allSheetData, specificDateYYYYMMDD) { if (!/^\d{4}-\d{2}-\d{2}$/.test(specificDateYYYYMMDD)) { throw new Error("Formato fecha inválido."); } return allSheetData.filter(row => { const ts = row[0]; if (ts == null || typeof ts !== 'number' || ts <= 0 || isNaN(ts)) return false; try { const d = new Date(ts); const ds = Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd"); return ds === specificDateYYYYMMDD; } catch (e) { return false; } }); }
function processAndGroupData(dataRows) { const workouts = {}; dataRows.forEach(row => { const ts = row[0]; const wid = row[1]; const dt = row[2]; const ex = row[3]; const set = row[4]; const reps = row[5]; const w = row[6]; const vTs = (typeof ts === 'number' && !isNaN(ts) && ts > 0) ? ts : 0; if (!workouts[wid]) { workouts[wid] = { id: wid, timestamp: vTs, date: dt, exercise: ex, sets: [] }; } else if (vTs > workouts[wid].timestamp) { workouts[wid].timestamp = vTs; } const vSet = set !== undefined ? set : '?'; const vReps = reps !== undefined ? reps : 0; const vW = w !== undefined ? w : 0; workouts[wid].sets.push({ set: vSet, reps: vReps, weight: vW }); }); return Object.values(workouts).sort((a, b) => b.timestamp - a.timestamp); }

// --- doPost ---
function doPost(e) {
  let output;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    Logger.log(`doPost action: ${action}`);

    if (action === 'save') {
      const sheetRegistros = getSheetByNameOrThrow(ss, SHEET_NAME_REGISTROS); const workout = requestData.data;
      if (!workout?.exercise || !Array.isArray(workout.sets)) { throw new Error("Datos entreno inválidos."); }
      const ts = new Date().getTime(); const wid = "WID_" + ts; const dt = new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' });
      workout.sets.forEach(set => { if (set.set===undefined || set.reps===undefined || set.weight===undefined) return; sheetRegistros.appendRow([ ts, wid, dt, workout.exercise, set.set, set.reps, set.weight ]); });
      Logger.log(`Workout guardado: ${wid}`); output = { status: "success", message: "Entrenamiento guardado", workoutId: wid };

    } else if (action === 'deleteWorkout') {
      const sheetRegistros = getSheetByNameOrThrow(ss, SHEET_NAME_REGISTROS); const workoutIdToDelete = requestData.id;
      if (!workoutIdToDelete) { throw new Error("Falta ID a eliminar."); } Logger.log(`Eliminando WorkoutID: ${workoutIdToDelete}`);
      const data = sheetRegistros.getDataRange().getValues(); const rowsToDelete = [];
      for (let i=data.length-1; i>=1; i--) { if (data[i]?.[1] === workoutIdToDelete) { rowsToDelete.push(i + 1); } }
      if (rowsToDelete.length === 0) { Logger.log(`WorkoutID no encontrado: ${workoutIdToDelete}`); output = { status: "success", message: `Registro ${workoutIdToDelete} no encontrado.` }; }
      else { rowsToDelete.sort((a, b) => b - a).forEach(rIdx => { Logger.log(`Eliminando fila: ${rIdx}`); sheetRegistros.deleteRow(rIdx); }); Logger.log(`Filas eliminadas para ${workoutIdToDelete}: ${rowsToDelete.length}`); output = { status: "success", message: `Entrenamiento eliminado.` }; }

    } else if (action === 'addExercise') {
      const exerciseNameToAdd = requestData.exerciseName; if (!exerciseNameToAdd || typeof exerciseNameToAdd !== 'string' || exerciseNameToAdd.trim() === "") { throw new Error("Nombre ejercicio inválido."); }
      const trimmedName = exerciseNameToAdd.trim(); const nameLower = trimmedName.toLowerCase();
      const exerciseSheet = getSheetByNameOrThrow(ss, SHEET_NAME_EJERCICIOS); const currentList = getMasterExerciseList(ss);
      const exists = currentList.some(ex => ex.toLowerCase() === nameLower);
      if (exists) { Logger.log(`Duplicado: ${trimmedName}`); output = { status: "error", message: `El ejercicio "${trimmedName}" ya existe.` }; }
      else { exerciseSheet.appendRow([trimmedName]); Logger.log(`Ejercicio añadido: ${trimmedName}`); const updatedList = getMasterExerciseList(ss); output = { status: "success", message: `Ejercicio "${trimmedName}" añadido.`, addedExercise: trimmedName, updatedExerciseList: updatedList }; }

    } else if (action === 'deleteExercise') { // NUEVO: Lógica para eliminar ejercicio
      const exerciseNameToDelete = requestData.exerciseName;
      if (!exerciseNameToDelete || typeof exerciseNameToDelete !== 'string' || exerciseNameToDelete.trim() === "") {
        throw new Error("Nombre de ejercicio a eliminar inválido o vacío.");
      }
      const trimmedName = exerciseNameToDelete.trim();
      const nameLower = trimmedName.toLowerCase();

      const exerciseSheet = getSheetByNameOrThrow(ss, SHEET_NAME_EJERCICIOS);
      const data = exerciseSheet.getDataRange().getValues(); // Obtener todos los datos [[ex1], [ex2], ...]
      let rowIndexToDelete = -1;

      // Buscar la fila que coincide (insensible a mayúsculas/minúsculas y espacios)
      for (let i = 0; i < data.length; i++) {
        if (data[i] && typeof data[i][0] === 'string' && data[i][0].trim().toLowerCase() === nameLower) {
          rowIndexToDelete = i + 1; // El índice de fila es 1-based
          break;
        }
      }

      if (rowIndexToDelete === -1) {
        Logger.log(`Ejercicio no encontrado para eliminar: ${trimmedName}`);
        output = { status: "error", message: `El ejercicio "${trimmedName}" no se encontró en la lista.` };
      } else {
        Logger.log(`Eliminando ejercicio "${trimmedName}" en fila: ${rowIndexToDelete}`);
        exerciseSheet.deleteRow(rowIndexToDelete);
        // Obtener la lista actualizada DESPUÉS de eliminar
        const updatedList = getMasterExerciseList(ss);
        output = {
          status: "success",
          message: `Ejercicio "${trimmedName}" eliminado de la lista.`,
          deletedExercise: trimmedName, // Opcional: devolver nombre eliminado
          updatedExerciseList: updatedList // Devolver lista actualizada
        };
      }

    } else { throw new Error("Acción no válida: " + action); }

  } catch (error) { Logger.log(`Error doPost: ${error.toString()}\nStack: ${error.stack}`); output = { status: "error", message: error.message }; }
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}