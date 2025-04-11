// Nombre de la Hoja dentro del archivo de cálculo
// Asegúrate que coincida EXACTAMENTE con el nombre de tu hoja en Google Sheets
const SHEET_NAME = "RegistrosGym";

// --- doGet: Modificado para manejar carga inicial limitada y fechas específicas ---
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Hoja "${SHEET_NAME}" no encontrada.`);
    }

    // Parámetros de la petición GET (enviados desde script.js)
    const loadType = e.parameter.load || 'recent'; // 'recent' (default) o 'specific'
    const daysToLoadParam = e.parameter.days;
    const specificDateParam = e.parameter.date; // Formato esperado: YYYY-MM-DD

    Logger.log(`doGet: loadType=${loadType}, days=${daysToLoadParam}, date=${specificDateParam}`);

    const allSheetData = sheet.getDataRange().getValues();
    const headers = allSheetData.shift(); // Quitar cabecera

    let filteredDataRows = []; // Almacenará las filas que cumplen el filtro

    if (loadType === 'recent') {
      const daysToLoad = parseInt(daysToLoadParam) || 7; // Usar 7 días por defecto si no se especifica
      Logger.log(`Cargando datos de los últimos ${daysToLoad} días distintos.`);
      filteredDataRows = filterRecentDaysData(allSheetData, daysToLoad);
    } else if (loadType === 'specific') {
      if (!specificDateParam) {
        throw new Error("Parámetro 'date' (YYYY-MM-DD) es requerido para load=specific.");
      }
      Logger.log(`Cargando datos para la fecha específica: ${specificDateParam}`);
      filteredDataRows = filterSpecificDateData(allSheetData, specificDateParam);
    } else {
      // Si no es 'recent' ni 'specific', cargar todo como antes (fallback, opcional)
      Logger.log(`Parámetro 'load' inválido o ausente. Cargando todos los datos.`);
      filteredDataRows = allSheetData; // Cargar todo si el parámetro es incorrecto
      // O lanzar error: throw new Error("Parámetro 'load' inválido. Usar 'recent' o 'specific'.");
    }

    Logger.log(`Filas filtradas encontradas: ${filteredDataRows.length}`);

    // Procesar (agrupar y ordenar) SOLO las filas filtradas
    const processedResult = processAndGroupData(filteredDataRows);

    // Devolver como JSON
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", data: processedResult }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(`Error en doGet: ${error.message}\n${error.stack}`);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Filtra los datos de la hoja para devolver solo las filas
 * correspondientes a los N días más recientes con registros.
 * @param {Array[]} allSheetData - Array 2D con todos los datos (sin cabecera).
 * @param {number} daysToLoad - Número de días distintos a cargar.
 * @return {Array[]} - Array 2D con las filas filtradas.
 */
function filterRecentDaysData(allSheetData, daysToLoad) {
  if (allSheetData.length === 0 || daysToLoad <= 0) return [];

  const uniqueDatesTimestamps = new Map(); // Map<string(YYYY-MM-DD), number(latest_timestamp)>

  // Recorrer para encontrar las fechas únicas y su timestamp más reciente
  allSheetData.forEach(row => {
    const timestamp = row[0]; // Columna A: Timestamp
    // Validar timestamp
    if (timestamp == null || typeof timestamp !== 'number' || timestamp <= 0 || isNaN(timestamp)) return;

    try {
      const dateObj = new Date(timestamp);
      // Usar formato YYYY-MM-DD para consistencia y comparación fácil
      const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");

      // Guardar el timestamp MÁS RECIENTE para cada fecha encontrada
      if (!uniqueDatesTimestamps.has(dateStr) || timestamp > uniqueDatesTimestamps.get(dateStr)) {
        uniqueDatesTimestamps.set(dateStr, timestamp);
      }
    } catch (e) {
      // Ignorar filas con timestamp inválido
      Logger.log(`Timestamp inválido o error al procesar fecha para timestamp: ${timestamp}`);
    }
  });

  // Ordenar las fechas únicas por su timestamp más reciente (descendente)
  const sortedUniqueDates = Array.from(uniqueDatesTimestamps.keys()).sort((a, b) => {
      return uniqueDatesTimestamps.get(b) - uniqueDatesTimestamps.get(a);
  });

  // Tomar las N fechas más recientes
  const targetDates = new Set(sortedUniqueDates.slice(0, daysToLoad));
  Logger.log(`Fechas recientes seleccionadas (${targetDates.size}): ${Array.from(targetDates).join(', ')}`);

  // Filtrar los datos originales para incluir solo las filas de esas fechas
  return allSheetData.filter(row => {
    const timestamp = row[0];
    if (timestamp == null || typeof timestamp !== 'number' || timestamp <= 0 || isNaN(timestamp)) return false;
    try {
        const dateObj = new Date(timestamp);
        const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
        return targetDates.has(dateStr);
    } catch (e) {
        return false; // Ignorar si hay error de fecha
    }
  });
}

/**
 * Filtra los datos de la hoja para devolver solo las filas
 * correspondientes a una fecha específica.
 * @param {Array[]} allSheetData - Array 2D con todos los datos (sin cabecera).
 * @param {string} specificDateYYYYMMDD - Fecha a buscar en formato 'YYYY-MM-DD'.
 * @return {Array[]} - Array 2D con las filas filtradas.
 */
function filterSpecificDateData(allSheetData, specificDateYYYYMMDD) {
    // Validar formato de fecha (básico)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(specificDateYYYYMMDD)) {
       throw new Error("Formato de fecha inválido para specificDate. Usar YYYY-MM-DD.");
    }

    return allSheetData.filter(row => {
      const timestamp = row[0]; // Columna A: Timestamp
      if (timestamp == null || typeof timestamp !== 'number' || timestamp <= 0 || isNaN(timestamp)) return false;
      try {
          const dateObj = new Date(timestamp);
          const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
          return dateStr === specificDateYYYYMMDD;
      } catch (e) {
          Logger.log(`Error al comparar fecha para timestamp: ${timestamp}`);
          return false;
      }
   });
}


/**
 * Agrupa las filas de datos por WorkoutID y las ordena por timestamp.
 * @param {Array[]} dataRows - Filas de datos ya filtradas.
 * @return {Array<Object>} - Array de objetos de workout agrupados y ordenados.
 */
function processAndGroupData(dataRows) {
  const workouts = {};
  dataRows.forEach(row => {
    const timestamp = row[0]; // Timestamp (col A)
    const workoutId = row[1]; // WorkoutID (col B)
    const dateStr = row[2];   // Date DD/MM/YYYY (col C)
    const exercise = row[3];  // Exercise (col D)
    const setNumber = row[4]; // SetNumber (col E)
    const reps = row[5];      // Reps (col F)
    const weight = row[6];    // Weight (col G)

    // Validar timestamp antes de usarlo
    const validTimestamp = (typeof timestamp === 'number' && !isNaN(timestamp) && timestamp > 0) ? timestamp : 0;

    if (!workouts[workoutId]) {
      workouts[workoutId] = {
        id: workoutId,
        timestamp: validTimestamp, // Usar timestamp validado
        date: dateStr,             // Usar la fecha string original guardada
        exercise: exercise,
        sets: []
      };
    } else if (validTimestamp > workouts[workoutId].timestamp) {
      // Si encontramos un timestamp posterior para el mismo workoutId, actualizarlo
      // (esto no debería pasar si los datos vienen ordenados, pero es una salvaguarda)
      workouts[workoutId].timestamp = validTimestamp;
    }

    workouts[workoutId].sets.push({
      set: setNumber,
      reps: reps,
      weight: weight
    });
  });

  // Convertir el objeto de workouts a un array y ordenar por timestamp descendente
  const result = Object.values(workouts).sort((a, b) => b.timestamp - a.timestamp);
  return result;
}


// --- doPost: SIN CAMBIOS respecto a tu versión anterior ---
function doPost(e) {
  let output;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Hoja "${SHEET_NAME}" no encontrada.`);
    }

    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    Logger.log(`doPost recibió acción: ${action}`);

    if (action === 'save') {
      const workout = requestData.data;
      const timestamp = new Date().getTime();
      const workoutId = "WID_" + timestamp;
      // Guardar fecha en formato DD/MM/YYYY
      const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

      workout.sets.forEach(set => {
        sheet.appendRow([
          timestamp, workoutId, date, workout.exercise, set.set, set.reps, set.weight
        ]);
      });
      Logger.log(`Workout guardado: ${workoutId}`);
      output = { status: "success", message: "Entrenamiento guardado", workoutId: workoutId };

    } else if (action === 'delete') {
      const workoutIdToDelete = requestData.id;
      if (!workoutIdToDelete) { throw new Error("Falta ID a eliminar."); }
      Logger.log(`Intentando eliminar WorkoutID: ${workoutIdToDelete}`);

      const data = sheet.getDataRange().getValues(); // Obtener datos incluyendo cabecera
      const rowsToDelete = [];
      // Empezar desde la última fila de datos (índice data.length - 1) hasta la primera (índice 1, justo después de cabecera)
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][1] === workoutIdToDelete) { // Columna B es WorkoutID (índice 1)
          rowsToDelete.push(i + 1); // Guardamos el número de fila (base 1)
        }
      }

      if (rowsToDelete.length === 0) { throw new Error(`WorkoutID no encontrado: ${workoutIdToDelete}`); }

      // Ordenar filas a eliminar de mayor a menor para no afectar índices
      rowsToDelete.sort((a, b) => b - a).forEach(rowIndex => {
         Logger.log(`Eliminando fila: ${rowIndex}`);
         sheet.deleteRow(rowIndex);
       });

      Logger.log(`Filas eliminadas para ${workoutIdToDelete}: ${rowsToDelete.join(', ')}`);
      output = { status: "success", message: `Entrenamiento ${workoutIdToDelete} eliminado.` };

    } else {
      throw new Error("Acción no válida: " + action);
    }

  } catch (error) {
    Logger.log(`Error en doPost: ${error.toString()}\nStack: ${error.stack}`);
    output = { status: "error", message: error.message };
  }
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}