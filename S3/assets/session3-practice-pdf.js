/* Local, paginated PDF export. Each A4 page is rendered at 1400 × 1980 px.
 * Raster pages preserve browser-rendered Unicode, long answers and screenshots,
 * without a CDN, server, print dialog, or runtime PDF dependency.
 * PDF image XObjects follow Adobe PDF Reference 1.6, §4.8.4:
 * https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/pdfreference1.6.pdf
 */
(() => {
  'use strict';
  const WIDTH=1400, HEIGHT=1980, MARGIN=88, BOTTOM=1860, FONT='"Deck Sans",Arial,sans-serif';
  const encoder=new TextEncoder();
  const colors={ink:'#202d36',navy:'#334f68',muted:'#596b77',line:'#d9e0e4',pale:'#edf2f5'};

  function wrap(context,text,width){
    const lines=[];
    for(const paragraph of String(text).replace(/\r\n?/g,'\n').split('\n')){
      if(!paragraph){lines.push('');continue;}
      let line='';
      for(const word of paragraph.split(/\s+/u)){
        const proposal=line?line+' '+word:word;
        if(context.measureText(proposal).width<=width){line=proposal;continue;}
        if(line){lines.push(line);line='';}
        if(context.measureText(word).width<=width){line=word;continue;}
        let fragment='';
        for(const character of Array.from(word)){
          if(fragment&&context.measureText(fragment+character).width>width){lines.push(fragment);fragment=character;}
          else fragment+=character;
        }
        line=fragment;
      }
      lines.push(line);
    }
    return lines.length?lines:[''];
  }

  async function loadImage(dataUrl){
    const image=new Image();image.src=dataUrl;await image.decode();return image;
  }

  function plan(data,image){
    const context=document.createElement('canvas').getContext('2d');
    const identity='Group: '+(data.groupNumber||'Not provided')+'    |    Group Assessment \u00b7 Graded';
    context.font='23px '+FONT;
    const identityLines=wrap(context,identity,WIDTH-2*MARGIN);
    if(identityLines.length>12)throw Error('The group number is too long for the report header. Please shorten it.');
    const pages=[];let page,y,section='',reference='',bodyTop;
    function newPage(continuation=false){
      const ruleY=126+identityLines.length*28;
      page={section,ruleY,commands:[]};pages.push(page);bodyTop=ruleY+52;y=bodyTop;
      page.commands.push({kind:'text',x:MARGIN,y,text:section+(continuation?' \u00b7 continued':''),size:32,weight:700,color:colors.navy});y+=34;
      if(reference){page.commands.push({kind:'text',x:MARGIN,y,text:reference,size:22,weight:400,color:colors.muted});y+=34;}else y+=14;
    }
    function field(label,value,options={}){
      context.font='600 26px '+FONT;
      const labelLines=options.reference?[]:wrap(context,label,WIDTH-2*MARGIN);
      context.font='26px '+FONT;
      const indent=options.hanging?30:0;
      const answer=String(value).trim()?value:'Not entered.';
      const lines=wrap(context,(options.reference?label+' ': '')+answer,WIDTH-2*MARGIN-indent);
      const fullHeight=labelLines.length*32+6+lines.length*36+18;
      if(y+fullHeight>BOTTOM&&fullHeight<=BOTTOM-bodyTop-62)newPage(true);
      let at=0;
      while(at<lines.length){
        const labels=at&&!options.reference?[label+' (continued)']:labelLines,labelHeight=labels.length*32;
        if(y+labelHeight+84>BOTTOM)newPage(true);
        for(const text of labels){page.commands.push({kind:'text',x:MARGIN,y,text,size:26,weight:600,color:colors.navy});y+=32;}
        y+=6;
        const capacity=Math.max(1,Math.floor((BOTTOM-y-8)/36));
        const chunk=lines.slice(at,at+capacity);
        chunk.forEach((text,i)=>page.commands.push({kind:'text',x:MARGIN+(options.hanging&&(at+i)>0?indent:0),y:y+i*36,text,size:26,weight:400,color:colors.ink}));
        y+=chunk.length*36+18;at+=chunk.length;
        if(at<lines.length)newPage(true);
      }
    }
    function start(title,onNewPage=true){section=title;reference='';if(onNewPage||!page){newPage();return;}if(y+110>BOTTOM){newPage();return;}y+=20;page.commands.push({kind:'text',x:MARGIN,y,text:section,size:32,weight:700,color:colors.navy});y+=58;}
    const total=data.groupMembers.reduce((sum,member)=>sum+(member.contribution.trim()&&Number.isFinite(Number(member.contribution))?Math.round(Number(member.contribution)*100):0),0)/100;
    start('Group Information');
    field('Group Members & Contribution (%)',data.groupMembers.map((member,i)=>(i+1)+'. '+(member.name||'Name not entered')+' \u2014 '+(member.contribution.trim()?member.contribution+'%':'Contribution not entered')).join('\n')+'\nTotal contribution: '+total+'%');
    start('Part 1 \u2014 Find Academic Papers',false);
    field('Research Question',data.researchQuestion);
    field('Main Concepts and Alternative Keywords',data.concepts.map((item,i)=>({item,i})).filter(({item,i})=>i<2||item.concept.trim()||item.keywords.trim()).map(({item,i})=>'Concept '+(i+1)+': '+(item.concept||'Not entered.')+'\nKeywords: '+(item.keywords||'Not entered.')).join('\n'));
    field('Search String',data.searchString);
    field('Search Database',data.database==='other'?'Other \u2014 '+(data.databaseOther||'not specified'):({'web-of-science':'Web of Science','google-scholar':'Google Scholar'}[data.database]||''));
    if(image){
      const available=BOTTOM-y-70;
      const imageHeight=available>=320?Math.min(650,available):Math.min(650,BOTTOM-bodyTop-130);
      const factor=Math.min((WIDTH-2*MARGIN)/image.naturalWidth,imageHeight/image.naturalHeight);
      const w=image.naturalWidth*factor,h=image.naturalHeight*factor;
      if(y+h+70>BOTTOM)newPage(true);
      page.commands.push({kind:'text',x:MARGIN,y,text:'Initial Search Results',size:26,weight:600,color:colors.navy});y+=30;
      page.commands.push({kind:'image',x:(WIDTH-w)/2,y,width:w,height:h});y+=h+25;
    }else field('Initial Search Results','No screenshot uploaded.');
    start('Part 2 \u2014 Literature Review');
    field('Literature Review Structure',({funnel:'Funnel',thematic:'Thematic'}[data.reviewStructure]||''));
    field('Literature Review',data.literatureReview);
    start('Part 3 \u2014 Qualitative Methodology');
    field('Qualitative Methodology',data.methodology);
    start('Part 4 \u2014 Citations & References');
    field('Academic References (APA)',data.references);
    return {pages,identityLines};
  }

  function jpegBytes(canvas){
    const binary=atob(canvas.toDataURL('image/jpeg',.94).split(',')[1]);
    return Uint8Array.from(binary,c=>c.charCodeAt(0));
  }

  async function create(data,onProgress=()=>{}){
    await document.fonts.ready;
    const image=data.screenshot?await loadImage(data.screenshot.dataUrl):null;
    const {pages,identityLines}=plan(data,image),parts=[],offsets=[0];let length=0;
    const append=part=>{const bytes=typeof part==='string'?encoder.encode(part):part;parts.push(bytes);length+=bytes.length;};
    const object=(id,body)=>{offsets[id]=length;append(id+' 0 obj\n');for(const part of body)append(part);append('\nendobj\n');};
    append('%PDF-1.4\n');append(new Uint8Array([37,226,227,207,211,10]));
    object(1,['<< /Type /Catalog /Pages 2 0 R >>']);
    object(2,['<< /Type /Pages /Count '+pages.length+' /Kids ['+pages.map((_,i)=>(3+i*3)+' 0 R').join(' ')+'] >>']);
    const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;
    const context=canvas.getContext('2d');
    for(let i=0;i<pages.length;i++){
      context.fillStyle='#ffffff';context.fillRect(0,0,WIDTH,HEIGHT);context.textAlign='left';context.textBaseline='alphabetic';
      const {ruleY}=pages[i];
      context.font='700 24px '+FONT;context.fillStyle=colors.navy;
      context.fillText('Group Research Proposal Worksheet \u2014 Sessions 3 & 4',MARGIN,90);
      context.font='23px '+FONT;context.fillStyle=colors.ink;
      identityLines.forEach((line,index)=>context.fillText(line,MARGIN,126+index*28));
      context.strokeStyle=colors.line;context.beginPath();context.moveTo(MARGIN,ruleY);context.lineTo(WIDTH-MARGIN,ruleY);context.stroke();
      for(const command of pages[i].commands){
        if(command.kind==='line'){context.strokeStyle=colors.line;context.beginPath();context.moveTo(command.x,command.y);context.lineTo(command.x+command.width,command.y);context.stroke();}
        else if(command.kind==='image')context.drawImage(image,command.x,command.y,command.width,command.height);
        else{context.fillStyle=command.color;context.font=command.weight+' '+command.size+'px '+FONT;context.fillText(command.text,command.x,command.y);}
      }
      context.font='21px '+FONT;context.fillStyle=colors.muted;context.fillText('Sessions 3 & 4 \u00b7 Graded group assessment',MARGIN,HEIGHT-42);
      context.textAlign='right';context.fillText('Page '+(i+1)+' / '+pages.length,WIDTH-MARGIN,HEIGHT-42);context.textAlign='left';
      const jpeg=jpegBytes(canvas),pageId=3+i*3,imageId=pageId+1,contentId=pageId+2;
      object(pageId,['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 '+imageId+' 0 R >> >> /Contents '+contentId+' 0 R >>']);
      object(imageId,['<< /Type /XObject /Subtype /Image /Width '+WIDTH+' /Height '+HEIGHT+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n',jpeg,'\nendstream']);
      const content='q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';
      object(contentId,['<< /Length '+encoder.encode(content).length+' >>\nstream\n'+content+'endstream']);
      onProgress(i+1,pages.length);await new Promise(resolve=>setTimeout(resolve,0));
    }
    const infoId=3+pages.length*3;
    object(infoId,['<< /Title (Group Research Proposal Worksheet - Sessions 3 and 4) /Subject (Graded group assessment) /Creator (Session 3 local worksheet) >>']);
    const xref=length;
    append('xref\n0 '+(infoId+1)+'\n0000000000 65535 f \n');
    for(let id=1;id<=infoId;id++)append(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
    append('trailer\n<< /Size '+(infoId+1)+' /Root 1 0 R /Info '+infoId+' 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
    canvas.width=1;canvas.height=1;
    return {blob:new Blob(parts,{type:'application/pdf'}),pageCount:pages.length};
  }
  window.Session3WorksheetPDF=Object.freeze({create});
})();
