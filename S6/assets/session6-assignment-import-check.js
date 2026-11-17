/* Reject unsupported data before the legacy normalizer can discard it. */
(()=>{'use strict';window.Session6AssignmentImportCheck=raw=>{
 function keys(value,allowed,path){if(value==null)return;if(typeof value!=='object'||Array.isArray(value))throw Error('Invalid '+path+' in backup. Your current work was not replaced.');for(const key of Object.keys(value))if(!allowed.includes(key))throw Error('Unsupported field '+path+'.'+key+'. Import cancelled to avoid losing data; your current work was not replaced.');}
 keys(raw,['app','version','updatedAt','ui','group','researchQuestion','theory','constructs','hypotheses','peer','model','references','ai'],'backup');
 keys(raw.ui,['layoutVersion','section','h1Stage','reviewIndex','hypothesisPart','activeHypothesis','writerSteps','reportView','reportIndex','memberPage'],'ui');
 keys(raw.group,['author','review','members'],'group');for(const m of raw.group?.members||[])keys(m,['name','contribution'],'group.members');
 keys(raw.theory,['names','explanation'],'theory');for(const c of raw.constructs||[])keys(c,['construct','definition','role','scale'],'constructs');
 for(const h of raw.hypotheses||[]){keys(h,['id','moves','argument','formal','assembledFrom','revisedArgument','revisedFormal','revisionSource'],'hypotheses');keys(h.moves,['define','theorise','evidence','apply','state'],'hypotheses.moves');}
 keys(raw.peer,['results','feedback','reviewedArgument','reviewedFormal'],'peer');
 for(const key of ['results','feedback'])if(raw.peer?.[key]!==undefined&&(!Array.isArray(raw.peer[key])||raw.peer[key].length>8))throw Error('Unsupported peer.'+key+' entries in backup. Import cancelled; current work was not replaced.');
 if(raw.peer?.results?.some(v=>v!==null&&!['Met','Needs Improvement'].includes(v)))throw Error('Unsupported peer-review result in backup. Import cancelled; current work was not replaced.');
 keys(raw.ai,['use','details','drafts'],'ai');keys(raw.ai?.drafts,['used','none'],'ai.drafts');if(raw.ai?.use&&!['used','none'].includes(raw.ai.use))throw Error('Unsupported AI-use declaration in backup. Import cancelled; current work was not replaced.');
 if(raw.model){keys(raw.model,['version','graph','relations','counter'],'model');if(raw.model.version!==undefined&&raw.model.version!==1)throw Error('Unsupported model version in backup.');keys(raw.model.graph,['drawflow'],'model.graph');keys(raw.model.graph?.drawflow,['Home'],'model.graph.drawflow');keys(raw.model.graph?.drawflow?.Home,['data'],'model.graph.drawflow.Home');
  for(const n of Object.values(raw.model.graph?.drawflow?.Home?.data||{})){keys(n,['id','name','data','class','html','typenode','inputs','outputs','pos_x','pos_y'],'model.node');keys(n.data,['kind','label'],'model.node.data');for(const p of ['pos_x','pos_y'])if(!Number.isFinite(n[p])||n[p]<0||n[p]>5000)throw Error('Unsupported model '+p+' coordinate in backup. Import cancelled instead of clipping it.');}
  for(const r of Object.values(raw.model.relations||{})){keys(r,['id','type','source','target','targetRelation','number','direction','label'],'model.relation');if(r.direction!==undefined&&!['+','-',''].includes(r.direction))throw Error('Unsupported model relationship direction in backup.');}
 }
};})();
