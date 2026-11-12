(() => {
  'use strict';
  const KEY='kedge-session3-literature-practice-v1',APP='GroupResearchProposalWorksheet';
  const TABS=['find','evaluate','synthesize','cite'];
  const MAX_IMAGE=2000000,MAX_FILE=15*1024*1024;
  const $=id=>document.getElementById(id);
  const clone=value=>JSON.parse(JSON.stringify(value));
  const fresh=()=>({app:APP,version:2,updatedAt:null,ui:{active:'find'},data:{groupMembers:[{name:'',contribution:''}],groupNumber:'',researchQuestion:'',concepts:Array.from({length:3},()=>({concept:'',keywords:''})),searchString:'',database:'',databaseOther:'',screenshot:null,reviewStructure:'',literatureReview:'',methodology:'',references:'',legacyResponses:null}});
  let state=fresh(),saveTimer=null,dirty=false,blocked=false,conflict=false,uploading=false,uploadGeneration=0,exporting=false;

  function message(text,error=false){$('feedback').textContent=text;$('feedback').dataset.tone=error?'error':'info';$('feedback').hidden=false;}
  function status(text){$('save-status').textContent=text;}
  function string(value,name){if(typeof value!=='string')throw Error('Invalid '+name+'.');return value;}
  function normalize(input){
    const legacy=input?.app==='Session3LiteratureReviewPractice'&&input.version===1;
    if(!input||(!legacy&&(input.app!==APP||input.version!==2))||!input.data)throw Error('This is not a supported group proposal or legacy Session 3 worksheet backup.');
    const result=fresh(),d=input.data;
    for(const key of ['groupNumber','researchQuestion','searchString','databaseOther'])result.data[key]=d[key]===undefined?'':string(d[key],key);
    if(!['','web-of-science','google-scholar','other'].includes(d.database))throw Error('Invalid database choice.');result.data.database=d.database;
    if(!Array.isArray(d.concepts)||d.concepts.length>200)throw Error('Invalid concept rows.');
    result.data.concepts=d.concepts.map(item=>({concept:string(item?.concept,'concept'),keywords:string(item?.keywords,'keywords')}));
    if(legacy){
      if(!Array.isArray(d.papers)||d.papers.length!==5)throw Error('Invalid legacy paper entries.');
      const papers=d.papers.map(item=>string(item,'paper reference'));
      result.data.groupMembers=[{name:d.studentName===undefined?'':string(d.studentName,'student name'),contribution:''}];
      result.data.references=papers.filter(text=>text.trim()).join('\n\n');
      result.data.legacyResponses={};
      for(const key of ['studentName','papers','relationships','connectedPapers','connection','citationPaper','paraphrasing','quotation','summarizing'])if(d[key]!==undefined)result.data.legacyResponses[key]=clone(d[key]);
    }else{
      if(!Array.isArray(d.groupMembers)||!d.groupMembers.length||d.groupMembers.length>200)throw Error('Invalid group members.');
      result.data.groupMembers=d.groupMembers.map(member=>({name:string(member?.name,'group member name'),contribution:typeof member?.contribution==='number'&&Number.isFinite(member.contribution)?String(member.contribution):string(member?.contribution,'contribution')}));
      for(const key of ['literatureReview','methodology','references'])result.data[key]=d[key]===undefined?'':string(d[key],key);
      if(!['','funnel','thematic'].includes(d.reviewStructure))throw Error('Invalid literature review structure.');result.data.reviewStructure=d.reviewStructure;
      if(d.legacyResponses!==undefined&&d.legacyResponses!==null){
        if(typeof d.legacyResponses!=='object'||Array.isArray(d.legacyResponses))throw Error('Invalid archived practice responses.');
        result.data.legacyResponses={};
        for(const key of ['studentName','papers','relationships','connectedPapers','connection','citationPaper','paraphrasing','quotation','summarizing']){
          const value=d.legacyResponses[key];if(value===undefined)continue;
          if(typeof value==='string'||Array.isArray(value)&&value.every(item=>typeof item==='string'))result.data.legacyResponses[key]=clone(value);else throw Error('Invalid archived practice response.');
        }
      }
    }
    if(d.screenshot!==null&&d.screenshot!==undefined){
      const image=d.screenshot;
      if(!image||typeof image.dataUrl!=='string'||image.dataUrl.length>MAX_IMAGE||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image.dataUrl))throw Error('Invalid or oversized screenshot in backup.');
      if(!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||image.width*image.height>20000000)throw Error('Invalid screenshot dimensions.');
      result.data.screenshot={name:string(image.name,'screenshot name'),dataUrl:image.dataUrl,width:image.width,height:image.height};
    }
    result.ui.active=TABS.includes(input.ui?.active)?input.ui.active:'find';result.updatedAt=typeof input.updatedAt==='string'?input.updatedAt:null;return result;
  }

  function saveNow(){
    clearTimeout(saveTimer);saveTimer=null;
    if(blocked||conflict){status('Not autosaved — use Save Progress to keep a backup.');return false;}
    if(!dirty)return true;
    const stamp=new Date().toISOString();
    try{localStorage.setItem(KEY,JSON.stringify({...state,updatedAt:stamp}));state.updatedAt=stamp;dirty=false;status('Saved in this browser · '+new Date(stamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));return true;}
    catch(error){status('Browser saving unavailable — use Save Progress.');message('Your responses are still on this page. Browser storage is unavailable or full. Download Save Progress before closing it.',true);return false;}
  }
  function changed(){dirty=true;if(blocked||conflict){saveNow();return;}status('Saving…');clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,350);}
  function fileStamp(){return new Date().toISOString().slice(0,10);}
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  function saveProgress(){if(uploading){message('Wait for the screenshot to finish loading before saving a backup.',true);return;}saveNow();download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'group-research-proposal-progress-'+fileStamp()+'.json');message('JSON backup downloaded, including your responses and screenshot.');}
  function hasWork(){const d=state.data;return ['groupNumber','researchQuestion','searchString','databaseOther','literatureReview','methodology','references'].some(key=>d[key].trim())||d.groupMembers.some(member=>member.name.trim()||member.contribution.trim())||d.database||d.reviewStructure||d.concepts.some(c=>c.concept.trim()||c.keywords.trim())||d.screenshot||d.legacyResponses;}
  function contributionTotal(){return state.data.groupMembers.reduce((total,member)=>total+(member.contribution.trim()&&Number.isFinite(Number(member.contribution))?Math.round(Number(member.contribution)*100):0),0)/100;}
  function updateContributions(){const total=contributionTotal();$('contribution-total').textContent='Total contribution: '+total+'%';$('contribution-total').dataset.complete=String(total===100);}


  function activeTab(name,remember=true){
    if(!TABS.includes(name))name='find';if(remember&&name!==state.ui.active&&!exporting&&$('feedback').dataset.tone!=='error')$('feedback').hidden=true;state.ui.active=name;
    for(const key of TABS){const selected=key===name;$('panel-'+key).hidden=!selected;$('tab-'+key).setAttribute('aria-selected',String(selected));$('tab-'+key).tabIndex=selected?0:-1;}
    const index=TABS.indexOf(name);$('previous-part').disabled=index===0;$('next-part').disabled=index===3;$('part-position').textContent='Part '+String.fromCharCode(65+index)+' of D';
    try{history.replaceState(null,'','#'+name);}catch(error){/* File-based browsers may restrict history; the form still works. */}
    if(remember)changed();
  }

  function renderConcepts(focusIndex=null){
    const rows=$('concept-rows');rows.replaceChildren();
    state.data.concepts.forEach((item,index)=>{
      const row=document.createElement('div');row.className='concept-row';
      for(const [key,label,placeholder] of [['concept','Main concept','e.g., Winemaker gender cues'],['keywords','Alternative keywords or related terms','e.g., Gender cues, gender signals']]){
        const input=document.createElement('textarea');input.rows=2;input.value=item[key];input.placeholder=placeholder;input.dataset.conceptIndex=String(index);input.dataset.conceptKey=key;input.setAttribute('aria-label',label+' '+(index+1));row.append(input);
      }
      const remove=document.createElement('button');remove.type='button';remove.className='remove-concept';remove.textContent='×';remove.dataset.removeConcept=String(index);remove.setAttribute('aria-label','Remove concept '+(index+1));row.append(remove);rows.append(row);
    });
    if(focusIndex!==null)rows.querySelector('[data-concept-index="'+focusIndex+'"]')?.focus();
  }
  function renderMembers(focusIndex=null){
    const rows=$('member-rows');rows.replaceChildren();
    state.data.groupMembers.forEach((member,index)=>{
      const row=document.createElement('div');row.className='member-row';
      for(const key of ['name','contribution']){
        const input=document.createElement('input');input.type=key==='name'?'text':'number';input.id='member-'+index+'-'+key;input.value=member[key];input.dataset.memberIndex=String(index);input.dataset.memberKey=key;input.required=true;input.setAttribute('aria-label',(key==='name'?'Group member name ':'Contribution percentage for member ')+(index+1));
        if(key==='contribution'){input.min='0';input.max='100';input.step='0.01';input.inputMode='decimal';input.placeholder='%';}else input.placeholder='Member '+(index+1);
        row.append(input);
      }
      const remove=document.createElement('button');remove.type='button';remove.className='remove-member';remove.textContent='\u00d7';remove.dataset.removeMember=String(index);remove.disabled=state.data.groupMembers.length===1;remove.setAttribute('aria-label','Remove group member '+(index+1));row.append(remove);rows.append(row);
    });
    updateContributions();if(focusIndex!==null)$('member-'+focusIndex+'-name')?.focus();
  }
  function renderScreenshot(){
    const image=state.data.screenshot;$('screenshot-preview').hidden=!image;$('remove-screenshot').hidden=!image;
    if(image){$('screenshot-image').src=image.dataUrl;$('screenshot-caption').textContent=image.name+' · '+image.width+' × '+image.height;}
    else{$('screenshot-image').removeAttribute('src');$('screenshot-caption').textContent='';}
  }
  function render(){
    for(const element of document.querySelectorAll('[data-field]'))element.value=state.data[element.dataset.field];
    $('database-other-wrap').hidden=state.data.database!=='other';renderConcepts();renderMembers();renderScreenshot();
    activeTab(state.ui.active,false);
  }

  const readFile=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('The file could not be read.'));reader.readAsDataURL(file);});
  async function decodeImage(dataUrl){const image=new Image();image.src=dataUrl;await image.decode();if(!image.naturalWidth||image.naturalWidth*image.naturalHeight>20000000)throw Error('Choose an image smaller than 20 megapixels.');return image;}
  async function optimizedImage(file){
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>MAX_FILE)throw Error('Choose a PNG, JPG, or WebP screenshot smaller than 15 MB.');
    let dataUrl=await readFile(file);const image=await decodeImage(dataUrl);
    let width=image.naturalWidth,height=image.naturalHeight;
    if(dataUrl.length>MAX_IMAGE||Math.max(width,height)>2400){
      const scale=Math.min(1,2400/Math.max(width,height));width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);
      for(const quality of [.94,.88,.8,.7]){dataUrl=canvas.toDataURL('image/jpeg',quality);if(dataUrl.length<=MAX_IMAGE)break;}
      canvas.width=1;canvas.height=1;
    }
    if(dataUrl.length>MAX_IMAGE)throw Error('This screenshot is too large for reliable browser saving. Choose a smaller image.');
    return {name:file.name,dataUrl,width,height};
  }
  async function upload(file){
    if(!file)return;const generation=++uploadGeneration;uploading=true;status('Preparing screenshot…');
    try{const image=await optimizedImage(file);if(generation!==uploadGeneration)return;state.data.screenshot=image;renderScreenshot();changed();message('Screenshot added to your worksheet. It is included in JSON backups and PDF exports.');}
    catch(error){if(generation===uploadGeneration)message(error.message,true);}
    finally{if(generation===uploadGeneration){uploading=false;$('screenshot-file').value='';if(!dirty)status(state.updatedAt?'Saved in this browser.':'No saved responses yet.');}}
  }
  async function importProgress(file){
    if(!file)return;
    try{
      if(file.size>10*1024*1024)throw Error('Choose a worksheet JSON backup smaller than 10 MB.');
      const incoming=normalize(JSON.parse((await file.text()).replace(/^\uFEFF/,'')));
      if(incoming.data.screenshot){const img=await decodeImage(incoming.data.screenshot.dataUrl);if(img.naturalWidth!==incoming.data.screenshot.width||img.naturalHeight!==incoming.data.screenshot.height)throw Error('The screenshot dimensions do not match the backup.');}
      if(hasWork()&&!confirm('Replace the responses on this page with the imported worksheet? Save Progress first if you need to keep both versions.'))return;
      uploadGeneration++;uploading=false;state=incoming;blocked=false;conflict=false;$('storage-conflict').hidden=true;render();dirty=true;saveNow();message('Progress restored, including the screenshot and selections.');
    }catch(error){message('Import did not change your worksheet. '+error.message,true);}
    finally{$('import-file').value='';}
  }
  function resetWorksheet(){
    if(!confirm('Reset this worksheet? This clears all responses and the screenshot saved in this browser. Download Save Progress first if you want to keep a backup.'))return;
    clearTimeout(saveTimer);uploadGeneration++;uploading=false;
    try{localStorage.removeItem(KEY);}catch(error){message('Browser storage could not be cleared. Download a backup if you need it.',true);return;}
    state=fresh();dirty=false;blocked=false;conflict=false;$('storage-conflict').hidden=true;$('feedback').hidden=true;render();status('Worksheet reset · No saved responses yet.');
  }
  async function exportPDF(){
    if(exporting)return;if(uploading){message('Wait for the screenshot to finish loading before exporting.',true);return;}
    const group=$('group-number');group.setCustomValidity(state.data.groupNumber.trim()?'':'Enter your group number.');
    if(!group.reportValidity()){group.focus();message('Add your group number before exporting the final report.',true);return;}
    for(const input of document.querySelectorAll('#member-rows input')){if(!input.reportValidity()){input.focus();message('Complete each group member name and contribution percentage before exporting.',true);return;}}
    exporting=true;$('export-pdf').disabled=true;saveNow();const snapshot=clone(state.data);
    try{message('Preparing your PDF…');const result=await window.Session3WorksheetPDF.create(snapshot,(page,total)=>message('Preparing PDF · '+page+' of '+total+' pages'));download(result.blob,'group-research-proposal-sessions3-4-'+fileStamp()+'.pdf');message('Final report PDF downloaded · '+result.pageCount+' pages, covering all four parts.');}
    catch(error){message('PDF export could not finish. Your responses are unchanged. '+error.message,true);}
    finally{exporting=false;$('export-pdf').disabled=false;}
  }

  // Restore before attaching change handlers; a damaged record is never replaced by an empty form.
  try{
    const saved=localStorage.getItem(KEY);
    if(saved){state=normalize(JSON.parse(saved));status('Restored saved responses in this browser.');if(state.data.legacyResponses)message('Your saved search and paper references have been carried over. Earlier practice responses are retained in Save Progress JSON backups.');}
    else status('No saved responses yet.');
  }catch(error){blocked=true;status('Browser saving unavailable or saved data unreadable.');message('Your previous stored data has not been overwritten. Import a JSON backup, or use Reset Worksheet to start again.',true);}
  const requested=location.hash.slice(1);if(TABS.includes(requested))state.ui.active=requested;render();

  document.querySelectorAll('[data-tab]').forEach(button=>{
    button.addEventListener('click',()=>activeTab(button.dataset.tab));
    button.addEventListener('keydown',event=>{let index=TABS.indexOf(button.dataset.tab);if(event.key==='ArrowRight')index=(index+1)%4;else if(event.key==='ArrowLeft')index=(index+3)%4;else if(event.key==='Home')index=0;else if(event.key==='End')index=3;else return;event.preventDefault();activeTab(TABS[index]);$('tab-'+TABS[index]).focus();});
  });
  document.querySelectorAll('[data-field]').forEach(element=>element.addEventListener(element.tagName==='SELECT'?'change':'input',()=>{state.data[element.dataset.field]=element.value;if(element.dataset.field==='groupNumber')element.setCustomValidity('');if(element.dataset.field==='database')$('database-other-wrap').hidden=element.value!=='other';changed();}));
  $('concept-rows').addEventListener('input',event=>{const e=event.target;if(e.dataset.conceptIndex!==undefined){state.data.concepts[Number(e.dataset.conceptIndex)][e.dataset.conceptKey]=e.value;changed();}});
  $('concept-rows').addEventListener('click',event=>{const button=event.target.closest('[data-remove-concept]');if(!button)return;const index=Number(button.dataset.removeConcept);state.data.concepts.splice(index,1);renderConcepts(state.data.concepts.length?Math.min(index,state.data.concepts.length-1):null);if(!state.data.concepts.length)$('add-concept').focus();changed();});
  $('add-concept').addEventListener('click',()=>{if(state.data.concepts.length>=200){message('The worksheet supports up to 200 concept rows.',true);return;}state.data.concepts.push({concept:'',keywords:''});renderConcepts(state.data.concepts.length-1);changed();});
  $('member-rows').addEventListener('input',event=>{const e=event.target;if(e.dataset.memberIndex!==undefined){state.data.groupMembers[Number(e.dataset.memberIndex)][e.dataset.memberKey]=e.value;updateContributions();changed();}});
  $('member-rows').addEventListener('click',event=>{const button=event.target.closest('[data-remove-member]');if(!button||state.data.groupMembers.length===1)return;const index=Number(button.dataset.removeMember);state.data.groupMembers.splice(index,1);renderMembers(Math.min(index,state.data.groupMembers.length-1));changed();});
  $('add-member').addEventListener('click',()=>{if(state.data.groupMembers.length>=200){message('The worksheet supports up to 200 group members.',true);return;}state.data.groupMembers.push({name:'',contribution:''});renderMembers(state.data.groupMembers.length-1);changed();});
  $('screenshot-file').addEventListener('change',event=>upload(event.target.files[0]));
  $('remove-screenshot').addEventListener('click',()=>{uploadGeneration++;uploading=false;state.data.screenshot=null;renderScreenshot();changed();});
  $('upload-area').addEventListener('dragover',event=>{event.preventDefault();$('upload-area').classList.add('drag-over');});
  $('upload-area').addEventListener('dragleave',()=>$('upload-area').classList.remove('drag-over'));
  $('upload-area').addEventListener('drop',event=>{event.preventDefault();$('upload-area').classList.remove('drag-over');upload(event.dataTransfer.files[0]);});
  $('save-progress').addEventListener('click',saveProgress);$('export-pdf').addEventListener('click',exportPDF);
  $('import-progress').addEventListener('click',()=>$('import-file').click());$('import-file').addEventListener('change',event=>importProgress(event.target.files[0]));$('reset-worksheet').addEventListener('click',resetWorksheet);
  $('previous-part').addEventListener('click',()=>{activeTab(TABS[Math.max(0,TABS.indexOf(state.ui.active)-1)]);$('tab-'+state.ui.active).focus();});
  $('next-part').addEventListener('click',()=>{activeTab(TABS[Math.min(3,TABS.indexOf(state.ui.active)+1)]);$('tab-'+state.ui.active).focus();});
  window.addEventListener('hashchange',()=>{const name=location.hash.slice(1);if(TABS.includes(name))activeTab(name);});
  window.addEventListener('pagehide',saveNow);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveNow();});
  window.addEventListener('beforeunload',event=>{saveNow();if(dirty||uploading){event.preventDefault();event.returnValue='';}});
  window.addEventListener('storage',event=>{
    if(event.key!==KEY)return;
    if(dirty||uploading||blocked){conflict=true;clearTimeout(saveTimer);$('storage-conflict').hidden=false;status('Another tab changed the worksheet · autosave paused.');return;}
    try{const incoming=event.newValue?normalize(JSON.parse(event.newValue)):fresh();incoming.ui.active=state.ui.active;state=incoming;render();status('Updated from another worksheet tab.');}
    catch(error){conflict=true;$('storage-conflict').hidden=false;status('Could not load another tab’s changes.');}
  });
  $('load-latest').addEventListener('click',()=>{if(!confirm('Load the latest saved worksheet and replace the responses in this tab? Download Save Progress first to keep a copy.'))return;try{const raw=localStorage.getItem(KEY),incoming=raw?normalize(JSON.parse(raw)):fresh();uploadGeneration++;uploading=false;state=incoming;dirty=false;blocked=false;conflict=false;$('storage-conflict').hidden=true;render();status('Latest saved worksheet loaded.');}catch(error){message('The saved worksheet could not be loaded. '+error.message,true);}});
  $('keep-current').addEventListener('click',()=>{if(!confirm('Replace the saved worksheet with this tab’s work? Make a JSON backup of any other version you need first.'))return;conflict=false;blocked=false;$('storage-conflict').hidden=true;dirty=true;saveNow();});
})();
