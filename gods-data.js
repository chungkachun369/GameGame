/* Myth-themed action patterns are fiction; quiz labels follow the supplied textbook page. */
const GOD_LIST = [
 {id:'ra',name:'Ra',title:'Sun god',color:'#eeb652',accent:'#b94a3b',pos:[.3,-10],theme:'SUN COURT',pattern:'sun',fact:'Ancient Egyptians worshipped Ra as a sun god. Your textbook links sunlight with the harvest.',symbol:'sun',skin:'#b98059',robe:'#b34738',head:'#e7dec1',reward:'Solar Crown',cape:'Sunwoven Sash'},
 {id:'isis',name:'Isis',title:'Birth goddess',color:'#d4a65b',accent:'#b45648',pos:[17,-4],theme:'SANCTUARY OF LIFE',pattern:'seals',fact:'Your textbook introduces Isis as a birth goddess. This is a description of ancient religious belief.',symbol:'horn',skin:'#bc9850',robe:'#a13f34',head:'#bc9850',reward:'Isis Sun Headdress',cape:'Lifeweaver Mantle'},
 {id:'shu',name:'Shu',title:'Wind god',color:'#a7d4cb',accent:'#4a857e',pos:[17,1],theme:'COURT OF WINDS',pattern:'wind',fact:'Your textbook calls Shu the wind god. The wind attacks in this game are fictional, not historical evidence.',symbol:'feather',skin:'#ae704b',robe:'#b08c55',head:'#ae704b',reward:'Feather of the Winds',cape:'Breeze Mantle'},
 {id:'apis',name:'Apis',title:'Bull god',color:'#e6d5a0',accent:'#8b7050',pos:[18,12],theme:'COURT OF THE BULL',pattern:'charge',fact:'Apis appears in your textbook as a bull god. Keep the bull silhouette distinct from the human-shaped deities.',symbol:'bull',skin:'#665b43',robe:'#d8cba4',head:'#665b43',reward:'Bullhorn Crest',cape:'Dappled Sash'},
 {id:'hapi',name:'Hapi',title:'River god',color:'#72c4d5',accent:'#44768d',pos:[-5,14],theme:'RIVER SANCTUARY',pattern:'water',fact:'Your textbook introduces Hapi as a river god. Beliefs about the Nile are different from scientific explanations of flooding.',symbol:'reeds',skin:'#356983',robe:'#d3ad5e',head:'#356983',reward:'River Reed Crown',cape:'Nilewater Mantle'},
 {id:'osiris',name:'Osiris',title:'Underworld god',color:'#a6c89b',accent:'#638b6b',pos:[7.5,-10],theme:'COURT OF RENEWAL',pattern:'rings',fact:'Your textbook describes Osiris as an underworld god. Afterlife beliefs help explain ancient burial practices.',symbol:'crown',skin:'#79896b',robe:'#efe7cc',head:'#79896b',reward:'Crown of Renewal',cape:'White Linen Mantle'},
 {id:'anubis',name:'Anubis',title:'Death god',color:'#b7a3d3',accent:'#513f65',pos:[12,-11],theme:'TWILIGHT COURT',pattern:'dash',fact:'Your textbook labels Anubis a death god and depicts him with a jackal head. These are ancient religious associations.',symbol:'jackal',skin:'#2c3334',robe:'#8c3942',head:'#242b2e',reward:'Jackal Mask',cape:'Twilight Mantle'}
];
const GOD_IDS=GOD_LIST.map(g=>g.id);
const godById=id=>GOD_LIST.find(g=>g.id===id);
function godQuestions(g){return [
 {q:`In the textbook, ${g.name} is introduced as which deity?`,options:[g.title,...GOD_LIST.filter(x=>x.title!==g.title).slice(0,3).map(x=>x.title)],answer:0,explain:g.fact},
 {q:`What does the textbook image of ${g.name} help us learn about?`,options:['Ancient Egyptian beliefs and symbols','Proof that magical attacks happened','Modern farming machinery'],answer:0,explain:'Images and texts can be evidence of beliefs, not proof of supernatural powers.'},
 {q:'Which part of this game is an invented fantasy activity?',options:['Dodging magical attacks and defeating a divine shield','The names shown on the supplied textbook page','The fact that ancient Egyptians held religious beliefs'],answer:0,explain:'The duel is game fiction. It is not an ancient historical event.'}
];}
function freshGods(){return {progress:{},equipped:null,decorations:[],completeReward:false,assist:false};}
function validateGods(raw){
 if(raw===undefined)return freshGods();
 if(!plainObject(raw)||!plainObject(raw.progress)||!Array.isArray(raw.decorations)||raw.decorations.length>7||new Set(raw.decorations).size!==raw.decorations.length||typeof raw.assist!=='boolean'||typeof raw.completeReward!=='boolean')throw Error('Invalid Gods Collection.');
 const out=freshGods();
 for(const [id,p] of Object.entries(raw.progress)){
   if(!GOD_IDS.includes(id)||!plainObject(p)||['seen','quiz','won'].some(k=>typeof p[k]!=='boolean')||(p.won&&!p.quiz)||(p.quiz&&!p.seen))throw Error('Invalid god encounter progress.');
   out.progress[id]={seen:p.seen,quiz:p.quiz,won:p.won};
 }
 const owns=id=>out.progress[id]?.won;
 if(raw.equipped!==null&&(!GOD_IDS.includes(raw.equipped)||!owns(raw.equipped)))throw Error('Unowned god outfit.');
 if(raw.decorations.some(id=>!GOD_IDS.includes(id)||!owns(id)))throw Error('Unowned god decoration.');
 if(raw.completeReward&&!GOD_IDS.every(owns))throw Error('Invalid complete collection reward.');
 out.equipped=raw.equipped;out.decorations=[...raw.decorations];out.assist=raw.assist;out.completeReward=raw.completeReward;return out;
}
function godRecord(id){return state.gods.progress[id]??=( {seen:false,quiz:false,won:false} );}
function grantGodVictory(id){const p=godRecord(id);if(!p.quiz)return false;const first=!p.won;p.won=true;state.gods.completeReward=GOD_IDS.every(i=>state.gods.progress[i]?.won);return first;}
