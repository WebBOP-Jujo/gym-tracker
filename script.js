document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFKlZunWd5cvnNdtERuUWEu5CXiq-csMPECnyzBjoC7UO8QDZHQHI9OwPOKizwclFX/exec'; // Reemplaza con tu URL
    const INITIAL_DAYS_TO_LOAD = 7;
    // ---------------------

    // --- Elementos del DOM ---
    const form = document.getElementById('workout-form'); // Necesario para el scroll
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
    const exerciseManagementSection = document.getElementById('exercise-management-section');
    const manageExerciseListBtn = document.getElementById('manage-exercise-list-btn');
    const closeManageSectionBtn = document.getElementById('close-manage-section-btn');
    const newExerciseInput = document.getElementById('new-exercise-name');
    const addExerciseBtn = document.getElementById('add-exercise-btn');
    const addExerciseSpinner = document.getElementById('add-exercise-spinner');
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
    if (manageExerciseListBtn) { manageExerciseListBtn.addEventListener('click', handleToggleManageSection); }
    if (closeManageSectionBtn) { closeManageSectionBtn.addEventListener('click', handleToggleManageSection); }
    if (addExerciseBtn) { addExerciseBtn.addEventListener('click', handleAddExercise); }
    if (deleteExerciseSelect) { deleteExerciseSelect.addEventListener('change', handleDeleteExerciseSelectChange); }
    if (deleteExerciseBtn) { deleteExerciseBtn.addEventListener('click', handleDeleteExercise); }

    // --- Funciones de Notificación Toast ---
    function showNotification(message, type = 'info', duration = 3000) { const nArea=document.getElementById('notification-area'); if(!nArea){console.error("No #notification-area"); console.warn(`NOTIF(${type}): ${message}`); return;} const n=document.createElement('div'); n.classList.add('toast-notification',type); n.textContent=message; nArea.insertBefore(n,nArea.firstChild); const t=setTimeout(()=>{n.classList.add('fade-out'); n.addEventListener('animationend',()=>{if(n.parentNode===nArea)nArea.removeChild(n);},{once:true});},duration); n.addEventListener('click',()=>{clearTimeout(t); n.classList.add('fade-out'); n.addEventListener('animationend',()=>{if(n.parentNode===nArea)nArea.removeChild(n);},{once:true});},{once:true}); }

    // --- Funciones de Spinner ---
    function showHistorySpinner(message = "Procesando...") { if(historySpinner){const p=historySpinner.querySelector('p'); if(p)p.textContent=message; historySpinner.style.display='flex';} if(historyLog&&historySpinner){Array.from(historyLog.children).forEach(c=>{if(c!==historySpinner)historyLog.removeChild(c);});} }
    function hideHistorySpinner() { if(historySpinner)historySpinner.style.display='none'; }

    // --- Funciones del Formulario y Series ---
    function handleExerciseChange() { const sv = exerciseSelect.value; if (sv) { if (initiallyLoadedData?.length > 0) prefillFormWithLastWorkout(sv); else { console.log("No datos. 1 serie."); setsInput.value=1; generateSetsInputs(1,false); } } else { generateSetsInputs(0,false); setsInput.value=''; } }
    function handleSetsChange() { const ns = parseInt(setsInput.value) || 0; generateSetsInputs(ns, false); }
    function generateSetsInputs(numberOfSets, shouldPrefill = false, lastData = null) { setsInputsContainer.innerHTML = ''; const num = Math.max(0, numberOfSets); if (num>0 && num<=20) { for(let i=1;i<=num;i++) addSingleSetInput(i); if (shouldPrefill && lastData?.sets) { setTimeout(()=>updatePlaceholders(lastData), 0); } } else if (num>20) { showNotification("Máx 20 series.",'info'); } addAddSetButton(); updateSetNumbers(); }
    function addSingleSetInput(setNumber) { const setGroup = document.createElement('div'); setGroup.classList.add('set-group'); setGroup.innerHTML = ` <div class="set-main-line"> <strong>Serie ${setNumber}:</strong> <div class="set-input-pair"> <label for="reps-set-${setNumber}">Reps:</label> <input type="number" id="reps-set-${setNumber}" name="reps-set-${setNumber}" min="0" required placeholder="Reps"> </div> <div class="set-input-pair"> <label for="weight-set-${setNumber}">Peso (kg):</label> <input type="number" id="weight-set-${setNumber}" name="weight-set-${setNumber}" min="0" step="0.1" required placeholder="kg"> </div> </div> <button type="button" class="remove-set-btn" onclick="removeSetInput(this)" title="Quitar serie">X</button>`; const addButton = document.getElementById('add-set-button'); if (addButton) setsInputsContainer.insertBefore(setGroup, addButton); else setsInputsContainer.appendChild(setGroup); }
    function addAddSetButton() { if (!document.getElementById('add-set-button')) { const btn = document.createElement('button'); btn.type='button'; btn.id='add-set-button'; btn.innerHTML=`<i class="fas fa-plus"></i> Añadir Serie`; btn.onclick=addSetInput; setsInputsContainer.appendChild(btn); } }
    window.addSetInput = function() { const cs = setsInputsContainer.querySelectorAll('.set-group').length; const next=cs+1; if(next>20) { showNotification("Máx 20.",'info'); return; } addSingleSetInput(next); updateSetNumbers(); }
    window.removeSetInput = function(button) { button.closest('.set-group').remove(); updateSetNumbers(); }
    function updateSetNumbers() { const sgs = setsInputsContainer.querySelectorAll('.set-group'); const ns = sgs.length; sgs.forEach((g, i) => { const sn=i+1; g.querySelector('strong').textContent=`Serie ${sn}:`; const rl=g.querySelector('label[for^="reps-set"]'); const ri=g.querySelector('input[id^="reps-set"]'); const wl=g.querySelector('label[for^="weight-set"]'); const wi=g.querySelector('input[id^="weight-set"]'); if(rl)rl.setAttribute('for',`reps-set-${sn}`); if(ri){ri.id=`reps-set-${sn}`; ri.name=`reps-set-${sn}`;} if(wl)wl.setAttribute('for',`weight-set-${sn}`); if(wi){wi.id=`weight-set-${sn}`; wi.name=`weight-set-${sn}`;} }); setsInput.value=ns>=0?ns:''; }

    // --- Funciones Pre-relleno ---
    function findLastWorkoutForExercise(exName) { console.log(`Buscando local (${initiallyLoadedData.length} regs) para: ${exName}`); return initiallyLoadedData.find(e => e.exercise === exName) || null; }
    function prefillFormWithLastWorkout(exName) { const last=findLastWorkoutForExercise(exName); if(last?.sets?.length>0){ console.log("Último local:",last); const ns=last.sets.length; setsInput.value=ns; generateSetsInputs(ns,true,last); } else { console.log("No local. 1 serie."); setsInput.value=1; generateSetsInputs(1,false); } }
    function updatePlaceholders(lastData) { console.log("Actualizando con:", lastData); const sorted=(lastData.sets||[]).sort((a,b)=>(a.set||0)-(b.set||0)); sorted.forEach((si)=>{ const sn=si.set; if(typeof sn !== 'number' || sn<=0) return; const wi=document.getElementById(`weight-set-${sn}`); if(wi){const w=si.weight; if(w!==undefined && w!==null && !isNaN(parseFloat(w))){wi.value=String(w);wi.placeholder='kg';}else{wi.value='';wi.placeholder='kg';}} const ri=document.getElementById(`reps-set-${sn}`); if(ri){ri.placeholder=si.reps!==undefined&&si.reps!==null?String(si.reps):'Reps'; ri.value='';} }); document.getElementById('reps-set-1')?.focus(); }

    // --- Función Guardado Entrenamiento ---
    async function handleFormSubmit(event) { event.preventDefault(); if(!SCRIPT_URL){showNotification("Error: URL.",'error');return;} const exName=exerciseSelect.value; const sgs=setsInputsContainer.querySelectorAll('.set-group'); const ns=sgs.length; const sd=[]; if(!exName){showNotification("Selecciona ejercicio.",'error');exerciseSelect.focus();return;} if(ns===0){showNotification("Añade series.",'error');document.getElementById('add-set-button')?.focus();return;} let isValid=true; for(let i=0;i<ns;i++){ const g=sgs[i]; const sn=i+1; const ri=g.querySelector(`input[id='reps-set-${sn}']`); const wi=g.querySelector(`input[id='weight-set-${sn}']`); if(!ri||!wi||ri.value.trim()===''||wi.value.trim()===''){showNotification(`Completa S${sn}.`,'error');(ri?.value.trim()===''?ri:wi)?.focus();isValid=false;break;} const r=parseInt(ri.value); const w=parseFloat(wi.value); if(isNaN(r)||isNaN(w)||r<0||w<0){showNotification(`Valores inválidos S${sn}.`,'error');(isNaN(r)||r<0?ri:wi)?.focus();isValid=false;break;} sd.push({set:sn,reps:r,weight:w});} if(!isValid)return; const entry={exercise:exName,sets:sd}; setLoading(true,'Guardando...'); try{ const resp=await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'save',data:entry})}); let res; try{res=await resp.json();} catch(e){console.error("Err parse save:",e); const txt=await resp.text(); console.error("Resp:",txt); if(!resp.ok)throw new Error(`HTTP ${resp.status}`); else throw new Error("Resp inesperada");} if(res?.status==='success'){showNotification('¡Guardado!','success');form.reset();generateSetsInputs(0,false);loadInitialHistory();} else {throw new Error(res?.message||'Resp inválida');}} catch(err){console.error('Error fetch guardar:',err); showNotification(`Error: ${err.message}`,'error',5000);} finally{setLoading(false);} }

    // --- Funciones Carga y Filtro Historial ---
    async function fetchHistoryData(specificDate=null) { if(!SCRIPT_URL){console.error("No URL."); return {status:"error",message:"No URL"};} const p=new URLSearchParams(); if(specificDate){p.append('load','specific'); p.append('date',specificDate);} else{p.append('load','recent'); p.append('days',INITIAL_DAYS_TO_LOAD);} const url=`${SCRIPT_URL}?${p.toString()}`; console.log("Fetch:",url); try{ const r=await fetch(url,{method:'GET',mode:'cors'}); if(!r.ok){const et=await r.text(); throw new Error(`Err ${r.status}: ${r.statusText}. ${et}`);} const res=await r.json(); console.log("Datos RX:",res); return res;} catch(err){console.error('Err fetch hist:',err); return {status:"error",message:`Error carga: ${err.message}`};} }
    async function loadInitialHistory() { filterDateInput.value=''; hideProgressGraph(); if(historyTitleElement)historyTitleElement.textContent=baseHistoryTitle+'...'; showHistorySpinner("Cargando..."); const res=await fetchHistoryData(); hideHistorySpinner(); if(res.status==='success'){ if(res.exerciseList?.length>=0){masterExerciseList=res.exerciseList; console.log("Lista:",masterExerciseList); populateFormExerciseSelect(masterExerciseList); populateGraphExerciseSelect(masterExerciseList); populateDeleteExerciseSelect(masterExerciseList);} else{console.error("No lista RX."); masterExerciseList=[]; populateFormExerciseSelect([]); populateGraphExerciseSelect([]); populateDeleteExerciseSelect([]); showNotification("Error lista.", "error");} initiallyLoadedData=res.data||[]; loadedDatesSet.clear(); initiallyLoadedData.forEach(e=>{if(e.timestamp)try{loadedDatesSet.add(new Date(e.timestamp).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}));}catch(e){}}); console.log("Fechas locales:",loadedDatesSet); if(historyTitleElement){historyTitleElement.textContent=`${baseHistoryTitle} ${res.totalWorkoutDays!==undefined?`(Total: ${res.totalWorkoutDays} días)`:''}`;} displayGroupedHistory(initiallyLoadedData);} else{displayGroupedHistory([]); showNotification(res.message||'Error carga.','error'); initiallyLoadedData=[]; loadedDatesSet.clear(); masterExerciseList=[]; populateFormExerciseSelect([]); populateGraphExerciseSelect([]); populateDeleteExerciseSelect([]); if(historyTitleElement)historyTitleElement.textContent=baseHistoryTitle;} }
    async function loadSpecificDateHistory(dateYMD) { hideProgressGraph(); if(historyTitleElement)historyTitleElement.textContent=baseHistoryTitle+'...'; let dDate=dateYMD; try{dDate=new Date(dateYMD+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){} showHistorySpinner(`Cargando ${dDate}...`); const res=await fetchHistoryData(dateYMD); hideHistorySpinner(); if(res.status==='success'){if(historyTitleElement)historyTitleElement.textContent=`Historial para ${dDate}`; displayGroupedHistory(res.data||[]);} else{displayGroupedHistory([]); showNotification(res.message||`Error carga ${dDate}.`,'error'); if(historyTitleElement)historyTitleElement.textContent=baseHistoryTitle;} }
    function displayGroupedHistory(data) { hideHistorySpinner(); historyLog.innerHTML=''; if(historySpinner&&!historyLog.contains(historySpinner)){historyLog.appendChild(historySpinner); hideHistorySpinner();} if(!data||data.length===0){const m=filterDateInput.value?'No registros fecha.':'Aún no hay registros.'; historyLog.innerHTML=`<p>${m}</p>`; return;} const grouped=data.reduce((acc,e)=>{if(!e?.timestamp)return acc; let ds; try{ds=new Date(e.timestamp).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(err){return acc;} if(!acc[ds])acc[ds]=[]; acc[ds].push(e); return acc;},{}); const dates=Object.keys(grouped).sort((a,b)=>{const[da,ma,ya]=a.split('/'); const[db,mb,yb]=b.split('/'); return new Date(yb,mb-1,db)-new Date(ya,ma-1,da);}); dates.forEach(date=>{ const h2=document.createElement('h2'); h2.classList.add('history-date-header'); h2.innerHTML=`<i class="fas fa-calendar-alt"></i> ${date}`; historyLog.appendChild(h2); grouped[date].forEach(e=>{ const div=document.createElement('div'); div.classList.add('history-entry'); div.dataset.workoutId=e.id||''; let sets=(e.sets||[]).sort((a,b)=>(a.set||0)-(b.set||0)).map(s=>`<li class="history-set-item">Serie ${s.set||'?'}: <strong>${s.reps||0}</strong> reps → <strong>${s.weight||0}</strong> kg</li>`).join(''); const id=e.id||''; const delBtn=`<button class="button-delete" onclick="deleteWorkoutEntry('${id}')" ${!id?'disabled':''} title="Eliminar registro"><i class="fas fa-trash-alt"></i> Eliminar</button>`; const editBtn=`<button class="button-edit" disabled onclick="editWorkoutEntry('${id}')" ${!id?'disabled':''} title="Editar (Próx)"><i class="fas fa-pencil-alt"></i> Editar</button>`; div.innerHTML=`<h3 class="history-exercise-title"><i class="fas fa-dumbbell"></i> ${e.exercise||'N/A'}</h3><ul class="history-sets-list">${sets||'<li>No series.</li>'}</ul><div class="history-entry-actions">${editBtn}${delBtn}</div>`; historyLog.appendChild(div); }); }); }

    // --- Función handleFilterChange ---
    function handleFilterChange() {
        const selectedDate = filterDateInput.value; // Formato YYYY-MM-DD
        console.log("handleFilterChange - Fecha seleccionada:", selectedDate);

        if (!selectedDate) {
            loadInitialHistory();
            return;
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
             showNotification("Formato de fecha inválido. Usa el selector.", "error");
             filterDateInput.value = '';
             return;
        }

        let dateToCheck_DDMMYYYY;
        try {
            console.log("handleFilterChange - Intentando convertir fecha...");
            const [y, m, d] = selectedDate.split('-');
            if (!y || !m || !d || y.length !== 4 || m.length !== 2 || d.length !== 2) {
                throw new Error("Resultado inesperado de split.");
            }
            dateToCheck_DDMMYYYY = `${d}/${m}/${y}`;
            console.log("handleFilterChange - Fecha convertida a DD/MM/YYYY:", dateToCheck_DDMMYYYY);
        } catch (e) {
            console.error("handleFilterChange - Error en el bloque try/catch de conversión:", e);
            showNotification("Error procesando fecha seleccionada.", "error");
            return;
        }

        hideHistorySpinner();

        console.log("handleFilterChange - Verificando si la fecha está en loadedDatesSet:", loadedDatesSet);
        if (loadedDatesSet.has(dateToCheck_DDMMYYYY)) {
             console.log("handleFilterChange - Filtrando localmente para", dateToCheck_DDMMYYYY);
             const filtered = initiallyLoadedData.filter(e => {
                 if (!e?.timestamp) return false;
                 try {
                     const entryDateStr = new Date(e.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
                     return entryDateStr === dateToCheck_DDMMYYYY;
                 } catch (filterError) {
                     console.error("handleFilterChange - Error al formatear/comparar fecha en filtro local:", filterError);
                     return false;
                 }
             });
             if (historyTitleElement) { historyTitleElement.textContent = `Historial para ${dateToCheck_DDMMYYYY}`; }
             displayGroupedHistory(filtered);
        } else {
            console.log("handleFilterChange - Fecha no encontrada localmente. Pidiendo al servidor:", selectedDate);
            loadSpecificDateHistory(selectedDate);
        }
     }
    // --- Fin handleFilterChange ---

    function handleClearFilter() { console.log("Limpiando filtro."); loadInitialHistory(); }

    // --- Funciones Poblar Desplegables ---
    function populateFormExerciseSelect(list) { if(!exerciseSelect)return; const cv=exerciseSelect.value; while(exerciseSelect.options.length>1)exerciseSelect.remove(1); (list||[]).forEach(ex=>{const o=document.createElement('option');o.value=ex;o.textContent=ex;exerciseSelect.appendChild(o);}); if(cv&&exerciseSelect.querySelector(`option[value="${CSS.escape(cv)}"]`)){exerciseSelect.value=cv;} else{exerciseSelect.value="";} console.log("Populate form select."); populateDeleteExerciseSelect(list); }
    function populateGraphExerciseSelect(list) { if(!graphExerciseSelect)return; const exs=[...(list||[])]; graphExerciseSelect.innerHTML='<option value="" disabled selected>-- Selecciona --</option>'; exs.forEach(ex=>{const o=document.createElement('option');o.value=ex;o.textContent=ex;graphExerciseSelect.appendChild(o);}); graphExerciseSelect.value=""; if(showGraphBtn)showGraphBtn.disabled=true; hideProgressGraph(); console.log("Populate graph select."); populateDeleteExerciseSelect(list); }
    function populateDeleteExerciseSelect(list) { if(!deleteExerciseSelect)return; while(deleteExerciseSelect.options.length>1)deleteExerciseSelect.remove(1); (list||[]).forEach(ex=>{const o=document.createElement('option');o.value=ex;o.textContent=ex;deleteExerciseSelect.appendChild(o);}); deleteExerciseSelect.value=""; if(deleteExerciseBtn)deleteExerciseBtn.disabled=true; console.log("Populate delete select."); }

    // --- Funciones Gráfica ---
    function handleGraphExerciseSelectChange() { if(showGraphBtn) showGraphBtn.disabled=!graphExerciseSelect.value; }
    function calculateEpleyE1RM(w,r) { if(typeof w!=='number'||typeof r!=='number'||isNaN(w)||isNaN(r)||w<=0||r<=0) return 0; return w*(1+(r/30)); }
    function calculateAverageDailyE1RM(data,exName) { const es=(data||[]).filter(e=>e?.exercise===exName); const d={}; es.forEach(e=>{if(!e?.timestamp)return; let k; try{k=new Date(e.timestamp).toISOString().split('T')[0];}catch(err){return;} if(!d[k])d[k]=[]; (e.sets||[]).forEach(s=>{if(s){const e1=calculateEpleyE1RM(s.weight,s.reps); if(e1>0)d[k].push(e1);}});}); const cd=[]; for(const k in d){const e1s=d[k]; if(e1s.length>0){const avg=e1s.reduce((a,b)=>a+b,0)/e1s.length; cd.push({date:k,avgE1RM:parseFloat(avg.toFixed(2))});}} cd.sort((a,b)=>new Date(a.date)-new Date(b.date)); return cd; }
    function displayExerciseProgressGraph() { const ex=graphExerciseSelect.value; if(!ex||!chartCanvas)return; console.log(`Graficando: ${ex}`); const d=calculateAverageDailyE1RM(initiallyLoadedData,ex); if(d.length<2){showNotification(`Se necesitan al menos 2 días para graficar ${ex}.`,'info');hideProgressGraph();return;} const lbls=d.map(i=>{try{return new Date(i.date+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit'});}catch{return '?';}}); const pts=d.map(i=>i.avgE1RM); if(!pts.some(p=>p>0)){showNotification(`No e1RM para ${ex}.`,'info');hideProgressGraph();return;} if(progressChartInstance)progressChartInstance.destroy(); try{ progressChartInstance=new Chart(chartCanvas,{type:'line',data:{labels:lbls,datasets:[{label:`Progreso - ${ex}`,data:pts,borderColor:'rgb(75,192,192)',backgroundColor:'rgba(75,192,192,0.2)',tension:0.1,fill:true,pointRadius:4,pointBackgroundColor:'rgb(75,192,192)'}]},options:{responsive:true,maintainAspectRatio:false,scales:{y:{beginAtZero:false,title:{display:true,text:'e1RM Medio (kg)'}},x:{title:{display:false}}},plugins:{legend:{position:'top',labels:{padding:15}},tooltip:{callbacks:{title:(items)=>{if(!items.length)return ''; const idx=items[0].dataIndex; if(d?.[idx])try{return new Date(d[idx].date+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});}catch{return lbls[idx]||'';} return lbls[idx]||'';},label:(ctx)=>ctx.parsed?.y!==null?`e1RM Medio: ${ctx.parsed.y.toFixed(2)} kg`:''}}}}}); console.log("Gráfica creada."); if(graphContainer)graphContainer.style.display='block'; if(hideGraphBtn)hideGraphBtn.style.display='inline-block'; } catch(err){console.error("Error gráfica:",err); showNotification("Error gráfica.",'error'); hideProgressGraph();} }
    function hideProgressGraph() { if(progressChartInstance){progressChartInstance.destroy(); progressChartInstance=null; console.log("Gráfica destruida.");} if(graphContainer)graphContainer.style.display='none'; if(hideGraphBtn)hideGraphBtn.style.display='none'; }

    // --- Funciones Gestión Ejercicios ---
    // MODIFICADO: Añadido scroll al formulario al cerrar la sección
    function handleToggleManageSection() {
        if (!exerciseManagementSection || !manageExerciseListBtn) return;

        const isVisible = exerciseManagementSection.style.display === 'block';

        if (isVisible) {
            // --- Ocultando la sección ---
            exerciseManagementSection.style.display = 'none';
            manageExerciseListBtn.classList.remove('active');

            // **** MODIFICADO: Scroll hacia el formulario al cerrar ****
            if (form) { // Asegurarse de que el formulario existe
                form.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            // *****************************************************

        } else {
            // --- Mostrando la sección ---
            exerciseManagementSection.style.display = 'block';
            manageExerciseListBtn.classList.add('active');
            exerciseManagementSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    function setAddExerciseLoading(isLoading) { if(addExerciseBtn)addExerciseBtn.disabled=isLoading; if(addExerciseSpinner)addExerciseSpinner.style.display=isLoading?'inline':'none'; }
    async function handleAddExercise() { if(!newExerciseInput)return; const name=newExerciseInput.value.trim(); if(!name){showNotification("Introduce nombre.",'error');newExerciseInput.focus();return;} if(name.length>100){showNotification("Nombre largo.",'error');return;} setAddExerciseLoading(true); try{ console.log(`Añadiendo: ${name}`); const r=await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'addExercise',exerciseName:name})}); let res; try{res=await r.json();console.log("Resp addEx:",res);} catch(e){console.error("Err parse addEx:",e); const txt=await r.text();console.error("Resp(txt):",txt); if(!r.ok)throw new Error(`HTTP ${r.status}`); else throw new Error(`Resp inesperada`);} if(res?.status==='success'){showNotification(`Ejercicio "${res.addedExercise||name}" añadido.`,'success'); newExerciseInput.value=''; if(res.updatedExerciseList?.length>=0){masterExerciseList=res.updatedExerciseList; console.log("Lista actualizada:",masterExerciseList); populateFormExerciseSelect(masterExerciseList); populateGraphExerciseSelect(masterExerciseList);} else{console.warn("No lista RX. Recargando..."); loadInitialHistory();}} else{throw new Error(res?.message||'Error desconocido');}} catch(err){console.error('Error fetch añadir:',err); showNotification(`Error añadir: ${err.message}`,'error',5000);} finally{setAddExerciseLoading(false);} }
    function handleDeleteExerciseSelectChange() { if(deleteExerciseBtn)deleteExerciseBtn.disabled=!deleteExerciseSelect.value; }
    function setDeleteExerciseLoading(isLoading) { if(deleteExerciseSelect)deleteExerciseSelect.disabled=isLoading; if(deleteExerciseBtn)deleteExerciseBtn.disabled=isLoading; if(deleteExerciseSpinner)deleteExerciseSpinner.style.display=isLoading?'inline':'none'; }
    async function handleDeleteExercise() { if(!deleteExerciseSelect||!deleteExerciseSelect.value){showNotification("Selecciona ejercicio.", "error");return;} const exName=deleteExerciseSelect.value; const confirmMsg=`¿Seguro eliminar "${exName}"?\n\nImportante: NO se borrarán registros pasados.`; if(!confirm(confirmMsg)){console.log("Eliminación cancelada.");return;} setDeleteExerciseLoading(true); try{ console.log(`Eliminando: ${exName}`); const r=await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'deleteExercise',exerciseName:exName})}); let res; try{res=await r.json(); console.log("Resp delEx:",res);} catch(e){console.error("Err parse delEx:",e); const txt=await r.text(); console.error("Resp(txt):",txt); if(!r.ok)throw new Error(`HTTP ${r.status}`); else throw new Error(`Resp inesperada`);} if(res?.status==='success'){showNotification(`Ejercicio "${res.deletedExercise||exName}" eliminado.`,'success'); if(res.updatedExerciseList?.length>=0){masterExerciseList=res.updatedExerciseList; console.log("Lista actualizada:",masterExerciseList); populateFormExerciseSelect(masterExerciseList); populateGraphExerciseSelect(masterExerciseList);} else{console.warn("No lista RX. Recargando..."); loadInitialHistory();}} else{throw new Error(res?.message||'Error desconocido');}} catch(err){console.error('Error fetch eliminar:',err); showNotification(`Error eliminar: ${err.message}`,'error',5000);} finally{setDeleteExerciseLoading(false); if(deleteExerciseSelect&&!deleteExerciseSelect.value&&deleteExerciseBtn)deleteExerciseBtn.disabled=true;} }

    // --- Funciones Borrado/Edición Workout Entries ---
    window.deleteWorkoutEntry = async function(id) { if(!id){showNotification("ID inválido.",'error');return;} if(confirm(`¿Seguro eliminar registro?\nNo se puede deshacer.`)){ if(!SCRIPT_URL){showNotification("Error: URL.",'error');return;} showHistorySpinner(`Eliminando ${id}...`); try{ const r=await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify({action:'deleteWorkout',id:id})}); let res; try{res=await r.json();} catch(e){console.error("Err parse delW:",e); const txt=await r.text(); console.error("Resp:",txt); if(!r.ok)throw new Error(`HTTP ${r.status}`); else throw new Error("Resp inesperada");} if(res?.status==='success'){showNotification(res.message||'Eliminado.','success'); loadInitialHistory();} else{throw new Error(res?.message||'Error eliminar');}} catch(err){hideHistorySpinner(); console.error('Error fetch eliminarW:',err); showNotification(`Error eliminar: ${err.message}`,'error',5000);} } else{console.log("Eliminación cancelada.");} }
    window.editWorkoutEntry = function(id) { showNotification(`Editar (ID: ${id}) no implementado.`, 'info'); console.log("Editar ID:", id); }

    // --- Utilidad Carga Botón Submit ---
    function setLoading(isLoading, message='Guardando...') { const saveHTML='<i class="fas fa-save"></i> Guardar Entrenamiento'; const loadHTML=`<i class="fas fa-spinner fa-spin"></i> ${message}`; if(!submitButton)return; submitButton.disabled=isLoading; submitButton.innerHTML=isLoading?loadHTML:saveHTML; }

    // --- Inicialización ---
    function initializeApp() {
        console.log("Inicializando...");
        if(exerciseManagementSection) exerciseManagementSection.style.display = 'none';
        if(manageExerciseListBtn) manageExerciseListBtn.classList.remove('active');
        if(submitButton) {
            submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Entrenamiento';
            submitButton.disabled = false;
        }
        addAddSetButton();
        loadInitialHistory();
    }
    initializeApp();

}); // Fin DOMContentLoaded