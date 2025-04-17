esumen de Mejoras y Correcciones (Post-V1 Inicial):
Corrección del Contador Total de Días:
Se solucionó el bug que causaba que el contador siempre mostrara "0 días".
El problema estaba en Google Apps Script (codigo.gs), que no interpretaba correctamente las celdas formateadas como "Fecha" en Google Sheets. Se modificó para manejar tanto objetos Date como strings "DD/MM/YYYY".
Corrección del Título al Filtrar por Fecha:
Se arregló el bug donde al seleccionar una fecha específica (ej. 11/04), el título mostraba el día anterior (ej. "Historial para 10/04").
El problema estaba en JavaScript (script.js) debido a cómo se interpretaban las zonas horarias al formatear la fecha para el título. Se eliminó la opción timeZone: 'UTC' de toLocaleDateString.
Mejora del Formato del Historial:
Se cambió la forma en que se muestran los detalles de cada serie en el historial para mayor claridad.
Ahora se usa el formato: Serie N: <strong>R</strong> reps &rarr; <strong>W</strong> kg.
Optimización de la Visualización de la Gráfica en Móviles:
Se acortó el título de la leyenda a Progreso - {Ejercicio} para ocupar menos espacio.
Se ocultó el título del eje X ("Fecha (DD/MM)") para ganar espacio vertical.
Se configuró maintainAspectRatio: false en Chart.js para permitir que el gráfico use mejor el ancho disponible.
Se eliminó el padding horizontal del contenedor #graph-container en CSS (style.css) para reducir el espacio blanco lateral dentro del área del gráfico.
Implementación de Spinner de Carga:
Se añadió un icono de spinner (<i class="fas fa-spinner fa-spin"></i>) que se muestra en el botón "Guardar Entrenamiento" mientras se envían los datos.
Se añadió un spinner más grande con un fondo semitransparente que se muestra sobre el área del historial (#history-log) mientras se carga el historial inicial, se carga una fecha específica o se elimina un registro.
Reemplazo de alert() por Notificaciones Toast:
Se eliminaron todas las llamadas a alert() del navegador (que requerían un clic extra).
Se implementó un sistema de notificaciones "toast" (mensajes temporales no intrusivos) usando HTML, CSS y JavaScript.
Estas notificaciones aparecen en la esquina superior derecha para informar sobre éxitos (guardado, eliminado) o errores (validación, conexión) y desaparecen solas.
Mejora del Mensaje de Eliminación:
Se modificó el mensaje de confirmación confirm() para no mostrar el WorkoutID técnico (esto lo hiciste tú).
Se modificó el backend (codigo.gs) para que, tras una eliminación exitosa, devuelva un mensaje genérico ("Registro eliminado correctamente.") en lugar de uno que incluya el WorkoutID, mejorando el mensaje mostrado en la notificación toast.
Se añade la funcionalidad de que al registrar un ejercicio si no hay datos anteriores, las series empiezan directamente en 1, no en 0.
NUEVO:
Se añade la funcionalidad de que cuando hay registros anteriores para un ejercicio, que los kilos no sean un placeholder sino que ponga el dato como tal, ya que el peso no se cambia mucho de un día a otro.
Se añade también la opción de que al hacer esto, el foco va directamente a Resp de la primera serie.
NUEVO V12
Se añaden la opciones de añadir y borrar ejercicio. También debido a esto se ha quitado la opción "otro" del desplegable.
NEUEVO V13
Se hacen mejor visuales sobre todo para moviles.
