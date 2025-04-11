// ID de tu Hoja de Cálculo (Obtenlo de la URL: docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit)
// Déjalo vacío si el script está VINCULADO a la hoja (lo más común si lo creaste desde Extensiones)
// const SPREADSHEET_ID = "TU_ID_DE_HOJA_DE_CALCULO_SI_NO_ESTA_VINCULADO";

// Nombre de la Hoja dentro del archivo de cálculo
const SHEET_NAME = "RegistrosGym"; // Asegúrate que coincida con el nombre de tu hoja

// Función principal para manejar peticiones GET (Leer datos)
function doGet(e) {
  try {
    // const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    const ss = SpreadsheetApp.getActiveSpreadsheet(); // Usar si el script está vinculado
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      throw new Error(`Hoja "${SHEET_NAME}" no encontrada.`);
    }

    const data = sheet.getDataRange().getValues();

    // Quitar cabecera
    const headers = data.shift();

    // Agrupar por WorkoutID
    const workouts = {};
    data.forEach(row => {
      const timestamp = row[0]; // Timestamp (col A)
      const workoutId = row[1]; // WorkoutID (col B)
      const date = row[2];      // Date (col C)
      const exercise = row[3];  // Exercise (col D)
      const setNumber = row[4]; // SetNumber (col E)
      const reps = row[5];      // Reps (col F)
      const weight = row[6];    // Weight (col G)

      if (!workouts[workoutId]) {
        workouts[workoutId] = {
          id: workoutId, // Usamos el WorkoutID como ID principal
          timestamp: timestamp, // Guardamos el timestamp del primer set para ordenar
          date: date,
          exercise: exercise,
          sets: []
        };
      }
      workouts[workoutId].sets.push({
        set: setNumber,
        reps: reps,
        weight: weight
      });
    });

    // Convertir el objeto de workouts a un array y ordenar por timestamp (más reciente primero)
    const result = Object.values(workouts).sort((a, b) => b.timestamp - a.timestamp);

    // Devolver como JSON
    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log(error);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Función principal para manejar peticiones POST (Guardar, Borrar)
function doPost(e) {
  try {
    // const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    const ss = SpreadsheetApp.getActiveSpreadsheet(); // Usar si el script está vinculado
    const sheet = ss.getSheetByName(SHEET_NAME);
     if (!sheet) {
      throw new Error(`Hoja "${SHEET_NAME}" no encontrada.`);
    }

    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;

    if (action === 'save') {
      const workout = requestData.data;
      const timestamp = new Date().getTime(); // Marca de tiempo única
      const workoutId = "WID_" + timestamp; // ID único para este grupo de series
      const date = new Date().toLocaleDateString('es-ES'); // Fecha actual

      // Añadir una fila por cada serie
      workout.sets.forEach(set => {
        sheet.appendRow([
          timestamp,        // Timestamp
          workoutId,        // WorkoutID
          date,             // Date
          workout.exercise, // Exercise
          set.set,          // SetNumber
          set.reps,         // Reps
          set.weight        // Weight
        ]);
      });

      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", message: "Entrenamiento guardado", workoutId: workoutId }))
        .setMimeType(ContentService.MimeType.JSON);

    } else if (action === 'delete') {
      const workoutIdToDelete = requestData.id;
      if (!workoutIdToDelete) {
         throw new Error("Falta el ID del workout a eliminar.");
      }

      const data = sheet.getDataRange().getValues();
      const rowsToDelete = [];

      // Encontrar las filas que coinciden con el WorkoutID (empezando desde el final para evitar problemas con índices)
      for (let i = data.length - 1; i >= 1; i--) { // i >= 1 para saltar cabecera
        if (data[i][1] === workoutIdToDelete) { // Columna B es WorkoutID
          rowsToDelete.push(i + 1); // Guardamos el número de fila (base 1)
        }
      }

      if (rowsToDelete.length === 0) {
         throw new Error(`No se encontró ningún registro con el WorkoutID: ${workoutIdToDelete}`);
      }

      // Eliminar las filas encontradas (de abajo hacia arriba)
      rowsToDelete.sort((a, b) => b - a).forEach(rowIndex => {
        sheet.deleteRow(rowIndex);
      });

      return ContentService
        .createTextOutput(JSON.stringify({ status: "success", message: `Entrenamiento ${workoutIdToDelete} eliminado.` }))
        .setMimeType(ContentService.MimeType.JSON);

    } else {
      throw new Error("Acción no válida: " + action);
    }

  } catch (error) {
    Logger.log(error);
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- FUNCIONES AUXILIARES (Si fueran necesarias en el futuro) ---
// Por ejemplo, para edición (más complejo):
// function updateWorkout(workoutData) { ... }