// Nombre de la Hoja dentro del archivo de cálculo
// Asegúrate que coincida EXACTAMENTE con el nombre de tu hoja en Google Sheets
const SHEET_NAME = "RegistrosGym";

// --- doGet: Modificado para filtros y contador total de días ---
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Hoja "${SHEET_NAME}" no encontrada.`);
    }

    // Parámetros de la petición GET
    const loadType = e.parameter.load || 'recent';
    const daysToLoadParam = e.parameter.days;
    const specificDateParam = e.parameter.date; // Formato esperado: YYYY-MM-DD

    Logger.log(`doGet: loadType=${loadType}, days=${daysToLoadParam}, date=${specificDateParam}`);

    // Leer TODOS los datos (incluyendo cabecera)
    const allSheetDataWithHeader = sheet.getDataRange().getValues();

    // Verificar si hay datos más allá de la cabecera
    if (allSheetDataWithHeader.length <= 1) {
       Logger.log("La hoja está vacía o solo tiene cabecera.");
       // Devolver éxito con datos vacíos y contador 0
       return ContentService.createTextOutput(JSON.stringify({ status: "success", data: [], totalWorkoutDays: 0 })).setMimeType(ContentService.MimeType.JSON);
    }

    const headers = allSheetDataWithHeader.shift(); // Quitar cabecera
    const allSheetData = allSheetDataWithHeader; // Datos sin cabecera

    // --- Calcular el número total de días de entrenamiento ÚNICOS ---
    // Se hace sobre TODOS los datos antes de filtrar para la vista
    // --- Calcular el número total de días de entrenamiento ÚNICOS ---
    const uniqueWorkoutDaysSet = new Set();
    allSheetData.forEach(row => {
      const dateValue = row[2]; // Leer el valor de la columna C

      if (dateValue) { // Asegurarse de que la celda no esté vacía
        let formattedDateStr = null;

        if (dateValue instanceof Date) {
          // Si es un objeto Date, formatearlo a DD/MM/YYYY
          try {
            formattedDateStr = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "dd/MM/yyyy");
             // OJO: usamos dd minúscula y yyyy minúscula según la doc de Utilities.formatDate
          } catch (e) {
            Logger.log(`Error formateando objeto Date: ${dateValue} - ${e}`);
          }
        } else if (typeof dateValue === 'string' && dateValue.includes('/')) {
          // Si ya es un string con el formato esperado, usarlo directamente
          formattedDateStr = dateValue.trim();
        } else {
           // Registrar si el formato es inesperado (ni Date ni string DD/MM/YYYY)
           Logger.log(`Formato de fecha inesperado o no manejado en columna C: ${dateValue} (Tipo: ${typeof dateValue})`);
        }

        // Si logramos obtener una fecha formateada válida, añadirla al Set
        if (formattedDateStr) {
          uniqueWorkoutDaysSet.add(formattedDateStr);
        }
      }
    });
    const totalWorkoutDays = uniqueWorkoutDaysSet.size;
    Logger.log(`Total de días únicos encontrados: ${totalWorkoutDays}`);
    // --- Fin cálculo total días ---


    let filteredDataRows = []; // Almacenará las filas que cumplen el filtro

    // Aplicar filtros (recent o specific)
    if (loadType === 'recent') {
      const daysToLoad = parseInt(daysToLoadParam) || 7;
      Logger.log(`Filtrando por los últimos ${daysToLoad} días distintos.`);
      filteredDataRows = filterRecentDaysData(allSheetData, daysToLoad);
    } else if (loadType === 'specific') {
      if (!specificDateParam) { throw new Error("Parámetro 'date' (YYYY-MM-DD) requerido para load=specific."); }
      Logger.log(`Filtrando por fecha específica: ${specificDateParam}`);
      filteredDataRows = filterSpecificDateData(allSheetData, specificDateParam);
    } else {
      // Fallback: Cargar todo si 'load' es inválido
      Logger.log(`Parámetro 'load' inválido o ausente: '${loadType}'. Cargando todos los datos.`);
      filteredDataRows = allSheetData;
    }

    Logger.log(`Filas después de filtrar: ${filteredDataRows.length}`);

    // Procesar (agrupar y ordenar) SOLO las filas filtradas
    const processedResult = processAndGroupData(filteredDataRows);

    // Devolver como JSON, incluyendo el contador total de días
    return ContentService
      .createTextOutput(JSON.stringify({
          status: "success",
          data: processedResult,
          totalWorkoutDays: totalWorkoutDays // <-- Incluir el contador aquí
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Error en doGet: ${error.message}\n${error.stack}`);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- Funciones auxiliares filterRecentDaysData, filterSpecificDateData, processAndGroupData ---
// (Estas funciones no han cambiado respecto a la versión anterior)

function filterRecentDaysData(allSheetData, daysToLoad) {
  if (allSheetData.length === 0 || daysToLoad <= 0) return [];
  const uniqueDatesTimestamps = new Map();
  allSheetData.forEach(row => {
    const timestamp = row[0];
    if (timestamp == null || typeof timestamp !== 'number' || timestamp <= 0 || isNaN(timestamp)) return;
    try {
      const dateObj = new Date(timestamp);
      const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
      if (!uniqueDatesTimestamps.has(dateStr) || timestamp > uniqueDatesTimestamps.get(dateStr)) {
        uniqueDatesTimestamps.set(dateStr, timestamp);
      }
    } catch (e) { Logger.log(`Error procesando fecha para timestamp: ${timestamp}`); }
  });
  const sortedUniqueDates = Array.from(uniqueDatesTimestamps.keys()).sort((a, b) => uniqueDatesTimestamps.get(b) - uniqueDatesTimestamps.get(a));
  const targetDates = new Set(sortedUniqueDates.slice(0, daysToLoad));
  Logger.log(`Fechas recientes seleccionadas (${targetDates.size}): ${Array.from(targetDates).join(', ')}`);
  return allSheetData.filter(row => {
    const timestamp = row[0];
    if (timestamp == null || typeof timestamp !== 'number' || timestamp <= 0 || isNaN(timestamp)) return false;
    try {
      const dateObj = new Date(timestamp);
      const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
      return targetDates.has(dateStr);
    } catch (e) { return false; }
  });
}

function filterSpecificDateData(allSheetData, specificDateYYYYMMDD) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(specificDateYYYYMMDD)) { throw new Error("Formato de fecha inválido. Usar YYYY-MM-DD."); }
    return allSheetData.filter(row => {
      const timestamp = row[0];
      if (timestamp == null || typeof timestamp !== 'number' || timestamp <= 0 || isNaN(timestamp)) return false;
      try {
        const dateObj = new Date(timestamp);
        const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
        return dateStr === specificDateYYYYMMDD;
      } catch (e) { Logger.log(`Error al comparar fecha para timestamp: ${timestamp}`); return false; }
   });
}

function processAndGroupData(dataRows) {
  const workouts = {};
  dataRows.forEach(row => {
    const timestamp = row[0]; const workoutId = row[1]; const dateStr = row[2]; const exercise = row[3]; const setNumber = row[4]; const reps = row[5]; const weight = row[6];
    const validTimestamp = (typeof timestamp === 'number' && !isNaN(timestamp) && timestamp > 0) ? timestamp : 0;
    if (!workouts[workoutId]) { workouts[workoutId] = { id: workoutId, timestamp: validTimestamp, date: dateStr, exercise: exercise, sets: [] }; }
    else if (validTimestamp > workouts[workoutId].timestamp) { workouts[workoutId].timestamp = validTimestamp; }
    // Añadir validación básica para sets, reps, weight si es necesario
    const validSet = setNumber !== undefined ? setNumber : 'N/A';
    const validReps = reps !== undefined ? reps : 0;
    const validWeight = weight !== undefined ? weight : 0;
    workouts[workoutId].sets.push({ set: validSet, reps: validReps, weight: validWeight });
  });
  return Object.values(workouts).sort((a, b) => b.timestamp - a.timestamp);
}


// --- doPost (SIN CAMBIOS) ---
function doPost(e) {
  let output;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) { throw new Error(`Hoja "${SHEET_NAME}" no encontrada.`); }
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    Logger.log(`doPost recibió acción: ${action}`);
    if (action === 'save') { const workout = requestData.data; const timestamp = new Date().getTime(); const workoutId = "WID_" + timestamp; const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); workout.sets.forEach(set => { sheet.appendRow([ timestamp, workoutId, date, workout.exercise, set.set, set.reps, set.weight ]); }); Logger.log(`Workout guardado: ${workoutId}`); output = { status: "success", message: "Entrenamiento guardado", workoutId: workoutId };
    } else if (action === 'delete') { const workoutIdToDelete = requestData.id; if (!workoutIdToDelete) { throw new Error("Falta ID a eliminar."); } Logger.log(`Intentando eliminar WorkoutID: ${workoutIdToDelete}`); const data = sheet.getDataRange().getValues(); const rowsToDelete = []; for (let i = data.length - 1; i >= 1; i--) { if (data[i][1] === workoutIdToDelete) { rowsToDelete.push(i + 1); } } if (rowsToDelete.length === 0) { throw new Error(`WorkoutID no encontrado: ${workoutIdToDelete}`); } rowsToDelete.sort((a, b) => b - a).forEach(rowIndex => { Logger.log(`Eliminando fila: ${rowIndex}`); sheet.deleteRow(rowIndex); }); Logger.log(`Filas eliminadas para ${workoutIdToDelete}: ${rowsToDelete.join(', ')}`); output = { status: "success", message: `Entrenamiento ${workoutIdToDelete} eliminado.` };
    } else { throw new Error("Acción no válida: " + action); }
  } catch (error) { Logger.log(`Error en doPost: ${error.toString()}\nStack: ${error.stack}`); output = { status: "error", message: error.message }; }
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);
}