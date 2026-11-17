/* PDF-only renderer: use saved logical graph coordinates, never the screen viewport. */
(()=>{'use strict';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
window.Session6AssignmentReportModel=async model=>{
 const ctx=document.createElement('canvas').getContext('2d');ctx.font='24px Arial';
 function lines(value,width){const out=[];for(const p of String(value).split(/\r?\n/)){let line='';for(const ch of Array.from(p)){if(line&&ctx.measureText(line+ch).width>width){out.push(line);line=''}line+=ch}out.push(line)}return out}
 const boxes=Object.fromEntries(Object.entries(model?.graph?.drawflow?.Home?.data||{}).map(([id,n])=>{const text=lines(n.data.label,260);return [id,{x:n.pos_x,y:n.pos_y,w:300,h:Math.max(90,text.length*30+30),text,kind:n.data.kind}]}));
 const relations=model?.relations||{},geometry={},labels=[];
 const center=b=>({x:b.x+b.w/2,y:b.y+b.h/2});
 function edge(box,target){const c=center(box),dx=target.x-c.x,dy=target.y-c.y,ratio=Math.max(Math.abs(dx)/(box.w/2),Math.abs(dy)/(box.h/2),0.001);return {x:c.x+dx/ratio,y:c.y+dy/ratio}}
 for(const r of Object.values(relations).filter(r=>r.type==='direct')){const a=boxes[r.source],b=boxes[r.target];if(!a||!b)throw Error('Missing saved model endpoint');geometry[r.id]={a:edge(a,center(b)),b:edge(b,center(a))}}
 for(const r of Object.values(relations).filter(r=>r.type==='moderation')){const target=geometry[r.targetRelation],box=boxes[r.source];if(!box||!target)throw Error('Missing saved moderation endpoint');const b={x:(target.a.x+target.b.x)/2,y:(target.a.y+target.b.y)/2};geometry[r.id]={a:edge(box,b),b}}
 let paths='';for(const r of Object.values(relations)){const g=geometry[r.id],label=r.number+(r.direction?' ('+r.direction+')':'')+(r.label?' · '+r.label:''),text=lines(label,360),x=(g.a.x+g.b.x)/2,y=(g.a.y+g.b.y)/2-16;
  paths+='<path d="M '+g.a.x+' '+g.a.y+' L '+g.b.x+' '+g.b.y+'" stroke="#d17d00" stroke-width="3" fill="none"'+(r.type==='moderation'?' stroke-dasharray="8 6"':'')+' marker-end="url(#arrow)"/>';
  labels.push({x:x-185,y:y-26,w:370,h:text.length*30+12,svg:'<text x="'+x+'" y="'+y+'" text-anchor="middle" font-size="24" fill="#b56c00" stroke="white" stroke-width="6" paint-order="stroke">'+text.map((t,i)=>'<tspan x="'+x+'" dy="'+(i?30:0)+'">'+esc(t)+'</tspan>').join('')+'</text>'});
 }
 const bounds=[...Object.values(boxes),...labels],minX=Math.min(0,...bounds.map(b=>b.x))-45,minY=Math.min(0,...bounds.map(b=>b.y))-45,maxX=Math.max(300,...bounds.map(b=>b.x+b.w))+45,maxY=Math.max(180,...bounds.map(b=>b.y+b.h))+45,width=Math.ceil(maxX-minX),height=Math.ceil(maxY-minY);
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="'+minX+' '+minY+' '+width+' '+height+'"><rect x="'+minX+'" y="'+minY+'" width="100%" height="100%" fill="white"/><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10" fill="#d17d00"/></marker></defs><g font-family="Arial,sans-serif">'+paths;
 for(const b of Object.values(boxes)){svg+='<rect x="'+b.x+'" y="'+b.y+'" width="'+b.w+'" height="'+b.h+'" rx="10" fill="white" stroke="'+(b.kind==='moderator'?'#d17d00':b.kind==='control'?'#9ca3af':'#7898af')+'" stroke-width="2"'+(b.kind==='control'?' stroke-dasharray="8 6"':'')+'/><text x="'+(b.x+b.w/2)+'" y="'+(b.y+b.h/2-(b.text.length-1)*15+8)+'" text-anchor="middle" font-size="24" fill="#202d36">'+b.text.map((t,i)=>'<tspan x="'+(b.x+b.w/2)+'" dy="'+(i?30:0)+'">'+esc(t)+'</tspan>').join('')+'</text>'}
 svg+=labels.map(l=>l.svg).join('')+'</g></svg>';
 const regions=bounds.map(b=>({x:b.x-minX,y:b.y-minY,w:b.w,h:b.h})),segments=Object.values(geometry).map(g=>({a:{x:g.a.x-minX,y:g.a.y-minY},b:{x:g.b.x-minX,y:g.b.y-minY}}));
 return {dataUrl:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),width,height,svg,regions,segments};
};})();
