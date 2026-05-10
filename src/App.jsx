import { useState, useEffect, useRef, useCallback } from 'react';
import { initSync, teardownSync, saveGameResult, fetchLeaderboard } from './lib/supabaseSync'
import { signInEmail, signUpEmail, signInGoogle, signInFacebook, signOut, supabaseEnabled } from './lib/supabase'

const SUITS=[{sym:'♠'},{sym:'♥'},{sym:'♦'},{sym:'♣'}];
const RANKS=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RV=Object.fromEntries(RANKS.map((r,i)=>[r,i+2]));
const N=4;
const AVATARS=['🦁','🐯','🦅','🐉','🦊','🐺','👑','🔥','⚡','💎','🃏','🥷','🐻','🦄','🐸','🤠'];

const THEMES={
  classic:{name:'Classic',swatch:['#1a4d40','#f0c674'],vars:{'--bg-radial':'radial-gradient(ellipse at center,#1a4d40 0%,#0a2922 80%)','--bg-overlay':'radial-gradient(ellipse 100% 60% at 50% 15%,rgba(212,160,82,.10) 0%,transparent 60%)','--panel-bg':'rgba(10,41,34,.65)','--panel-border':'rgba(212,160,82,.28)','--accent':'#f0c674','--accent-deep':'#d4a052','--accent-text':'#0a2922','--text':'#f5e9d3','--text-muted':'#a8b5a8','--danger':'#f87171','--success':'#6ee7b7','--card-bg':'linear-gradient(180deg,#fdfaf1 0%,#f5e9d3 100%)','--card-border':'rgba(139,102,40,.5)','--card-red':'#c1272d','--card-black':'#1a1a1a','--display-font':"'Cinzel','Cormorant Garamond',serif",'--body-font':"'Manrope',system-ui,sans-serif",'--accent-glow':'0 0 0 0 rgba(240,198,116,.4)','--felt':'radial-gradient(ellipse at center,#2d6e52 0%,#1a4d38 60%,#0f3224 100%)'}},
  neon:{name:'Neon',swatch:['#0d0220','#ff2d95'],vars:{'--bg-radial':'radial-gradient(ellipse at center,#1a0633 0%,#03000a 85%)','--bg-overlay':'radial-gradient(ellipse 100% 60% at 50% 15%,rgba(255,45,149,.18) 0%,transparent 60%)','--panel-bg':'rgba(12,4,28,.75)','--panel-border':'rgba(0,229,255,.35)','--accent':'#ff2d95','--accent-deep':'#00e5ff','--accent-text':'#fff','--text':'#e8f7ff','--text-muted':'#7a8aa0','--danger':'#ff3860','--success':'#00ffa3','--card-bg':'linear-gradient(180deg,#fafaff 0%,#dde6ff 100%)','--card-border':'rgba(0,229,255,.6)','--card-red':'#e6005c','--card-black':'#0a0a3a','--display-font':"'Audiowide','Manrope',sans-serif",'--body-font':"'Manrope',system-ui,sans-serif",'--accent-glow':'0 0 18px rgba(255,45,149,.7),0 0 35px rgba(0,229,255,.3)','--felt':'radial-gradient(ellipse at center,#1a0040 0%,#0a001e 60%,#030009 100%)'}},
  mehfil:{name:'Mehfil',swatch:['#3d0a2c','#e8b85c'],vars:{'--bg-radial':'radial-gradient(ellipse at center,#4a1538 0%,#1a0612 85%)','--bg-overlay':'radial-gradient(ellipse 100% 60% at 50% 15%,rgba(232,184,92,.18) 0%,transparent 60%)','--panel-bg':'rgba(50,12,36,.65)','--panel-border':'rgba(232,184,92,.4)','--accent':'#e8b85c','--accent-deep':'#b88838','--accent-text':'#2a0814','--text':'#f5e0d3','--text-muted':'#c89bb0','--danger':'#ff7a8a','--success':'#ffd700','--card-bg':'linear-gradient(180deg,#fff8e7 0%,#f5dcc0 100%)','--card-border':'rgba(139,82,40,.6)','--card-red':'#a01030','--card-black':'#2a1810','--display-font':"'Cinzel','Cormorant Garamond',serif",'--body-font':"'Manrope',system-ui,sans-serif",'--accent-glow':'0 0 12px rgba(232,184,92,.5)','--felt':'radial-gradient(ellipse at center,#5a1a3a 0%,#3a0a24 60%,#1a0412 100%)'}},
};

// ── BOT CHAT ──
const BOT_CHAT={
  thullaGiven:{easy:['oops 😅','lol sorry','hehe'],medium:['pakad! 💥','enjoy the cards 😏','thulla!'],hard:['calculated. 🧠','you walked into that.','Ace delivery. 📦']},
  thullaReceived:{easy:['oh no 😭','not again!','ugh'],medium:["I'll get you back 😤",'just wait...',"this isn't over"],hard:['noted.','smart play.',"won't happen again."]},
  roundWon:{easy:['yay!','nice!','wooo'],medium:['senior! 👑','clean round','my lead now'],hard:['as expected.','control maintained.','mine.']},
  winning:{easy:['bye bye! 👋',"I'm out!"],medium:['GG! 🏆','too easy'],hard:['efficient.','flawless.']},
  aceThulla:{easy:['big card! 😳','ACE!'],medium:['ACE THULLA! 🔥','eat this ace!'],hard:['saved this for you. 🎯','Ace of pain.']},
  requestReceived:{easy:['sure take them 😊','okay okay'],medium:['hmm...',"you wish 😤"],hard:['interesting.','strategically unwise for me.']},
};
const getBotChat=(s,d)=>{const m=BOT_CHAT[s]?.[d];if(!m?.length)return null;return m[Math.floor(Math.random()*m.length)];};

// ── BOT AI ──
function botPickCard(hand,trick,ledSuit,firstRound,difficulty){
  const isLead=trick.length===0;const validIdxs=[];
  if(isLead){
    if(firstRound){const idx=hand.findIndex(c=>c.rank==='A'&&c.suit==='♠');if(idx>=0)return{idx,isThulla:false,isAceThulla:false};}
    for(let i=0;i<hand.length;i++)validIdxs.push(i);
  }else{const hasLed=hand.some(c=>c.suit===ledSuit);for(let i=0;i<hand.length;i++){if(hasLed){if(hand[i].suit===ledSuit)validIdxs.push(i);}else validIdxs.push(i);}}
  if(!validIdxs.length)return{idx:0,isThulla:false,isAceThulla:false};
  if(validIdxs.length===1){const c=hand[validIdxs[0]];const isTh=!isLead&&c.suit!==ledSuit;return{idx:validIdxs[0],isThulla:isTh,isAceThulla:isTh&&c.rank==='A'};}
  if(difficulty==='easy'){const pick=validIdxs[Math.floor(Math.random()*validIdxs.length)];const c=hand[pick];const isTh=!isLead&&c.suit!==ledSuit;return{idx:pick,isThulla:isTh,isAceThulla:isTh&&c.rank==='A'};}
  const isThullaing=!isLead&&!hand.some(c=>c.suit===ledSuit);
  if(isLead)return botLead(hand,validIdxs,difficulty);
  if(isThullaing)return botThulla(hand,validIdxs,difficulty);
  return botFollow(hand,validIdxs,trick,ledSuit,difficulty);
}
function botLead(hand,validIdxs,difficulty){
  const byRank=[...validIdxs].sort((a,b)=>RV[hand[a].rank]-RV[hand[b].rank]);
  if(difficulty==='hard'){
    const sc={};for(const c of hand)sc[c.suit]=(sc[c.suit]||0)+1;
    const short=Object.entries(sc).filter(([,n])=>n<=2).map(([s])=>s);
    if(short.length>0){const fs=validIdxs.filter(i=>short.includes(hand[i].suit));if(fs.length>0){fs.sort((a,b)=>RV[hand[a].rank]-RV[hand[b].rank]);const na=fs.filter(i=>hand[i].rank!=='A');return{idx:na.length?na[0]:fs[0],isThulla:false,isAceThulla:false};}}
    const na=byRank.filter(i=>hand[i].rank!=='A');return{idx:na.length?na[0]:byRank[0],isThulla:false,isAceThulla:false};
  }
  const na=byRank.filter(i=>hand[i].rank!=='A');const pick=na.length?na[Math.floor(na.length*0.25)]:byRank[0];return{idx:pick,isThulla:false,isAceThulla:false};
}
function botThulla(hand,validIdxs,difficulty){
  const desc=[...validIdxs].sort((a,b)=>RV[hand[b].rank]-RV[hand[a].rank]);
  if(difficulty==='hard'){const aces=desc.filter(i=>hand[i].rank==='A');if(aces.length)return{idx:aces[0],isThulla:true,isAceThulla:true};return{idx:desc[0],isThulla:true,isAceThulla:false};}
  const aces=desc.filter(i=>hand[i].rank==='A');if(aces.length&&Math.random()<0.45)return{idx:aces[0],isThulla:true,isAceThulla:true};
  const top=desc.slice(0,Math.max(1,Math.ceil(desc.length/3)));return{idx:top[Math.floor(Math.random()*top.length)],isThulla:true,isAceThulla:false};
}
function botFollow(hand,validIdxs,trick,ledSuit,difficulty){
  const byRank=[...validIdxs].sort((a,b)=>RV[hand[a].rank]-RV[hand[b].rank]);
  let cur=-1;for(const t of trick)if(t.card.suit===ledSuit&&RV[t.card.rank]>cur)cur=RV[t.card.rank];
  const winners=byRank.filter(i=>RV[hand[i].rank]>cur);
  if(difficulty==='hard'){if(hand.length<=5&&winners.length)return{idx:winners[0],isThulla:false,isAceThulla:false};return{idx:byRank[0],isThulla:false,isAceThulla:false};}
  if(winners.length&&hand.length<=7&&Math.random()<0.35)return{idx:winners[0],isThulla:false,isAceThulla:false};
  return{idx:byRank[0],isThulla:false,isAceThulla:false};
}
function botDecideRequest(difficulty,count){
  if(difficulty==='easy')return true;if(difficulty==='medium')return Math.random()<0.55;
  if(count<=3)return false;if(count>=9)return true;return Math.random()<0.4;
}

// ── AUDIO ──
let audioCtx=null,sfxVolume=0.7,musicVolume=0.4,musicNodes=null;
const getCtx=()=>{if(!audioCtx)try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}return audioCtx;};
const setSfxVol=v=>{sfxVolume=v;};
const setMusicVol=v=>{musicVolume=v;if(musicNodes){const c=getCtx();if(c)musicNodes.master.gain.setValueAtTime(v*0.18,c.currentTime);}};
const playSlam=()=>{if(sfxVolume<=0)return;const ctx=getCtx();if(!ctx)return;const t=ctx.currentTime;const b=ctx.createOscillator(),bG=ctx.createGain();b.connect(bG);bG.connect(ctx.destination);b.type='sawtooth';b.frequency.setValueAtTime(180,t);b.frequency.exponentialRampToValueAtTime(28,t+0.35);bG.gain.setValueAtTime(0.6*sfxVolume,t);bG.gain.exponentialRampToValueAtTime(0.01,t+0.4);b.start(t);b.stop(t+0.42);const sz=ctx.sampleRate*0.18,nb=ctx.createBuffer(1,sz,ctx.sampleRate),d=nb.getChannelData(0);for(let i=0;i<sz;i++)d[i]=Math.random()*2-1;const ns=ctx.createBufferSource();ns.buffer=nb;const fl=ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.value=1200;const nG=ctx.createGain();nG.gain.setValueAtTime(0.45*sfxVolume,t);nG.gain.exponentialRampToValueAtTime(0.01,t+0.15);ns.connect(fl);fl.connect(nG);nG.connect(ctx.destination);ns.start(t);ns.stop(t+0.18);const ec=ctx.createOscillator(),eG=ctx.createGain();ec.connect(eG);eG.connect(ctx.destination);ec.type='sine';ec.frequency.setValueAtTime(55,t+0.25);eG.gain.setValueAtTime(0.15*sfxVolume,t+0.25);eG.gain.exponentialRampToValueAtTime(0.01,t+0.9);ec.start(t+0.25);ec.stop(t+0.95);};
const playCardSnd=()=>{if(sfxVolume<=0)return;const ctx=getCtx();if(!ctx)return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(900,t);o.frequency.exponentialRampToValueAtTime(450,t+0.07);g.gain.setValueAtTime(0.10*sfxVolume,t);g.gain.exponentialRampToValueAtTime(0.01,t+0.07);o.start(t);o.stop(t+0.08);};
const playDealSnd=()=>{if(sfxVolume<=0)return;const ctx=getCtx();if(!ctx)return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(500+Math.random()*500,t);g.gain.setValueAtTime(0.035*sfxVolume,t);g.gain.exponentialRampToValueAtTime(0.01,t+0.04);o.start(t);o.stop(t+0.05);};
const playWinSnd=()=>{if(sfxVolume<=0)return;const ctx=getCtx();if(!ctx)return;const t=ctx.currentTime;[523,659,784,1046].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='triangle';o.frequency.setValueAtTime(f,t+i*0.08);g.gain.setValueAtTime(0.20*sfxVolume,t+i*0.08);g.gain.exponentialRampToValueAtTime(0.01,t+i*0.08+0.22);o.start(t+i*0.08);o.stop(t+i*0.08+0.24);});};
const playFlush=()=>{if(sfxVolume<=0)return;const ctx=getCtx();if(!ctx)return;const t=ctx.currentTime;[330,440,550].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(f,t+i*0.04);g.gain.setValueAtTime(0.10*sfxVolume,t+i*0.04);g.gain.exponentialRampToValueAtTime(0.01,t+i*0.04+0.18);o.start(t+i*0.04);o.stop(t+i*0.04+0.2);});};
const playAceFlash=()=>{if(sfxVolume<=0)return;const ctx=getCtx();if(!ctx)return;const t=ctx.currentTime;[220,330,440,660,880,1100].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sawtooth';o.frequency.setValueAtTime(f,t+i*0.04);g.gain.setValueAtTime(0.15*sfxVolume,t+i*0.04);g.gain.exponentialRampToValueAtTime(0.01,t+i*0.04+0.38);o.start(t+i*0.04);o.stop(t+i*0.04+0.4);});};
const playCoinSnd=()=>{if(sfxVolume<=0)return;const ctx=getCtx();if(!ctx)return;const t=ctx.currentTime;[800,1000,1200].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='triangle';o.frequency.setValueAtTime(f,t+i*0.06);g.gain.setValueAtTime(0.12*sfxVolume,t+i*0.06);g.gain.exponentialRampToValueAtTime(0.01,t+i*0.06+0.15);o.start(t+i*0.06);o.stop(t+i*0.06+0.17);});};
const startMusic=()=>{const ctx=getCtx();if(!ctx||musicNodes)return;const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);const oscs=[110,165,220,277].map((f,i)=>{const o=ctx.createOscillator();o.type=i%2===0?'sine':'triangle';o.frequency.value=f;const og=ctx.createGain();og.gain.value=0.1;const lfo=ctx.createOscillator();lfo.frequency.value=0.08+i*0.04;const lg=ctx.createGain();lg.gain.value=0.06;lfo.connect(lg);lg.connect(og.gain);o.connect(og);og.connect(master);o.start();lfo.start();return{osc:o,lfo,gain:og};});master.gain.linearRampToValueAtTime(musicVolume*0.18,ctx.currentTime+2);musicNodes={master,oscs};};
const stopMusic=()=>{if(!musicNodes)return;const ctx=getCtx();if(!ctx)return;const m=musicNodes;m.master.gain.cancelScheduledValues(ctx.currentTime);m.master.gain.linearRampToValueAtTime(0,ctx.currentTime+0.6);setTimeout(()=>{try{m.oscs.forEach(o=>{o.osc.stop();o.lfo.stop();});}catch(e){}},700);musicNodes=null;};

// ── CARD HELPERS ──
const newDeck=()=>{const d=[];for(const s of SUITS)for(const r of RANKS)d.push({suit:s.sym,red:s.sym==='♥'||s.sym==='♦',rank:r,id:r+s.sym});return d;};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const sortHand=h=>{const ord={'♠':0,'♥':1,'♣':2,'♦':3};return[...h].sort((a,b)=>a.suit!==b.suit?ord[a.suit]-ord[b.suit]:RV[a.rank]-RV[b.rank]);};
const deal=n=>{const deck=shuffle(newDeck());const hands=Array.from({length:n},()=>[]);for(let i=0;i<deck.length;i++)hands[i%n].push(deck[i]);return hands.map(sortHand);};
const aceSpadesIdx=hands=>{for(let i=0;i<hands.length;i++)if(hands[i].some(c=>c.rank==='A'&&c.suit==='♠'))return i;return 0;};
const findSenior=(trick,ledSuit)=>{let s=null,max=-1;for(const t of trick)if(t.card.suit===ledSuit&&RV[t.card.rank]>max){s=t.player;max=RV[t.card.rank];}return s??trick[0].player;};
const nextActive=(idx,elim,n)=>{let next=(idx+1)%n;let safety=n+1;while(elim.includes(next)&&safety>0){next=(next+1)%n;safety--;}return next;};

// ── COIN / TROPHY ──
const PROFILE_KEY='thulla_profiles_v1';
const LB_KEY='thulla_lb_v1';
const COIN_REWARDS=[150,75,25,0];
const TROPHY_REWARDS=[30,10,-5,-20];
const PART_COINS=10;
const AI_RIVALS=[
  {name:'Shadow Khan',avatar:'🥷',trophies:280,isAI:true},
  {name:'Ace Falcon',avatar:'🦅',trophies:195,isAI:true},
  {name:'The Don',avatar:'👑',trophies:155,isAI:true},
  {name:'Tiger Raja',avatar:'🐯',trophies:120,isAI:true},
  {name:'Phantom',avatar:'💎',trophies:85,isAI:true},
];
const loadProfile=n=>{try{const a=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}');return a[n]||{coins:500,trophies:0};}catch{return{coins:500,trophies:0};}};
const loadLB=()=>{try{const d=JSON.parse(localStorage.getItem(LB_KEY)||'null');if(!d){localStorage.setItem(LB_KEY,JSON.stringify(AI_RIVALS));return[...AI_RIVALS];}return d;}catch{return[...AI_RIVALS];}};
const upsertLB=(name,avatar,trophies)=>{try{const lb=loadLB();const idx=lb.findIndex(e=>e.name===name&&!e.isAI);if(idx>=0)lb[idx]={...lb[idx],trophies,avatar};else lb.push({name,avatar,trophies,isAI:false});lb.sort((a,b)=>b.trophies-a.trophies);localStorage.setItem(LB_KEY,JSON.stringify(lb));}catch{}};

// ── COSMETICS (locked) ──
const COSMETICS=[
  {id:'back_gold',cat:'Card Back',name:'Golden Court',price:800,preview:'🟡'},
  {id:'back_dragon',cat:'Card Back',name:'Dragon Scale',price:1200,preview:'🐉'},
  {id:'back_neon',cat:'Card Back',name:'Neon Dreams',price:600,preview:'💜'},
  {id:'table_silk',cat:'Table Theme',name:'Silk Road',price:1000,preview:'🏺'},
  {id:'table_marble',cat:'Table Theme',name:'Marble Palace',price:1500,preview:'🏛️'},
  {id:'slam_fire',cat:'Slam Effect',name:'Inferno Slam',price:700,preview:'🔥'},
  {id:'slam_ice',cat:'Slam Effect',name:'Arctic Blast',price:700,preview:'❄️'},
  {id:'slam_galaxy',cat:'Slam Effect',name:'Galaxy Smash',price:900,preview:'🌌'},
  {id:'frame_crown',cat:'Avatar Frame',name:'Crown Frame',price:500,preview:'👑'},
  {id:'frame_flame',cat:'Avatar Frame',name:'Flame Frame',price:500,preview:'🔥'},
  {id:'trail_gold',cat:'Coin Trail',name:'Gold Rush',price:400,preview:'✨'},
  {id:'trail_stars',cat:'Coin Trail',name:'Stardust',price:600,preview:'⭐'},
];

// ================================================================
// COMPONENTS
// ================================================================

function CardFace({card,onClick,disabled,playable,size='md',dim,slamming}){
  const sz={md:{w:68,h:98,fs:22,cs:12},sm:{w:52,h:74,fs:16,cs:10}}[size];
  return(
    <button onClick={onClick} disabled={disabled}
      className={`tc-btn${playable?' playable':''}${dim?' dim':''}${slamming?' slam-anim':''}`}
      style={{width:sz.w,height:sz.h,background:'var(--card-bg)',border:'1.5px solid var(--card-border)',
        borderRadius:8,boxShadow:'0 3px 10px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.6)',
        color:card.red?'var(--card-red)':'var(--card-black)',fontFamily:'var(--display-font)',
        position:'relative',flexShrink:0,touchAction:'manipulation',cursor:disabled?'default':'pointer'}}>
      <span style={{position:'absolute',top:3,left:5,fontSize:sz.cs,fontWeight:700,lineHeight:1}}>{card.rank}<br/>{card.suit}</span>
      <span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:sz.fs,fontWeight:700}}>{card.suit}</span>
      <span style={{position:'absolute',bottom:3,right:5,fontSize:sz.cs,fontWeight:700,lineHeight:1,transform:'rotate(180deg)'}}>{card.rank}<br/>{card.suit}</span>
    </button>
  );
}

function CardBack({size='sm'}){
  const sz={md:{w:68,h:98},sm:{w:36,h:52},xs:{w:22,h:32}}[size]||{w:36,h:52};
  return(
    <div style={{width:sz.w,height:sz.h,borderRadius:6,flexShrink:0,
      background:'linear-gradient(135deg,var(--accent-deep) 0%,var(--accent) 50%,var(--accent-deep) 100%)',
      border:'1.5px solid var(--accent)',boxShadow:'0 2px 6px rgba(0,0,0,.4)',
      display:'flex',alignItems:'center',justifyContent:'center',
      fontSize:sz.w*0.35,color:'var(--accent-text)',fontWeight:900,fontFamily:'var(--display-font)'}}>T</div>
  );
}

function FaceDownFan({count}){
  const show=Math.min(count,7);
  if(!show)return<span className="muted text-xs">0</span>;
  return(
    <div style={{position:'relative',height:42,width:Math.min(show,7)*10+32}}>
      {Array.from({length:show}).map((_,i)=>(
        <div key={i} style={{position:'absolute',left:i*9,top:0,transform:`rotate(${(i-(show-1)/2)*5}deg)`,zIndex:i}}>
          <CardBack size="xs"/>
        </div>
      ))}
    </div>
  );
}

function DealAnimation({names,avatars,onComplete}){
  const [dealt,setDealt]=useState(0);
  useEffect(()=>{
    getCtx();let count=0;
    const iv=setInterval(()=>{count++;setDealt(count);playDealSnd();if(count>=52){clearInterval(iv);setTimeout(onComplete,700);}},55);
    return()=>clearInterval(iv);
  },[onComplete]);
  const labelPos=[
    {bottom:20,left:'50%',transform:'translateX(-50%)'},
    {top:'38%',left:14},
    {top:20,left:'50%',transform:'translateX(-50%)'},
    {top:'38%',right:14},
  ];
  return(
    <div className="fixed inset-0 flex items-center justify-center" style={{zIndex:200}}>
      <div style={{position:'absolute',inset:0,background:'var(--bg-overlay),var(--bg-radial)'}}/>
      {[0,1,2,3].map(p=>{
        const cnt=Math.floor(dealt/4)+(dealt%4>p?1:0);
        return(
          <div key={p} style={{position:'absolute',...labelPos[p],zIndex:210}}>
            <div className="panel px-3 py-2" style={{display:'inline-flex',alignItems:'center',gap:6}}>
              <span style={{fontSize:20}}>{avatars[p]}</span>
              <span className="text-xs">{names[p]}</span>
              <span className="gold font-bold text-sm" style={{minWidth:16,textAlign:'right'}}>{Math.min(cnt,13)}</span>
            </div>
          </div>
        );
      })}
      <div style={{position:'relative',zIndex:205,textAlign:'center'}}>
        <CardBack size="md"/>
        <div className="muted text-[10px] mt-1">{52-dealt} left</div>
      </div>
      {Array.from({length:dealt}).map((_,i)=><FlyingCard key={i} player={i%4}/>)}
      <div style={{position:'absolute',bottom:56,left:'50%',transform:'translateX(-50%)',zIndex:210,textAlign:'center'}}>
        <div className="display gold text-lg font-bold tracking-widest mb-2">Dealing…</div>
        <div style={{width:180,height:4,borderRadius:2,background:'var(--panel-bg)',border:'1px solid var(--panel-border)'}}>
          <div style={{width:`${(dealt/52)*100}%`,height:'100%',borderRadius:2,background:'var(--accent)',transition:'width 40ms'}}/>
        </div>
      </div>
    </div>
  );
}

function FlyingCard({player}){
  return(
    <div className={`flying-card fly-to-${player}`}>
      <CardBack size="sm"/>
    </div>
  );
}

function HandSlam({isAce}){
  return(
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:120}}>
      <div className="shockwave"/>
      <div className="shockwave shockwave-2"/>
      <div className="hand-slam-wrapper">
        <svg viewBox="0 0 200 320" style={{width:140,height:224}} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e8b08a"/><stop offset="100%" stopColor="#b8784a"/>
            </linearGradient>
            <filter id="hs"><feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="rgba(0,0,0,.6)"/></filter>
          </defs>
          <rect x="55" y="220" width="100" height="85" rx="12" fill="url(#sg)" filter="url(#hs)"/>
          <path d="M60,220 L60,128 Q62,112 73,112 Q84,112 84,128 L84,182" fill="url(#sg)" stroke="#9a6040" strokeWidth="1.5"/>
          <path d="M86,220 L86,108 Q88,92 99,92 Q110,92 110,108 L110,182" fill="url(#sg)" stroke="#9a6040" strokeWidth="1.5"/>
          <path d="M112,220 L112,110 Q114,94 125,94 Q136,94 136,110 L136,182" fill="url(#sg)" stroke="#9a6040" strokeWidth="1.5"/>
          <path d="M138,220 L138,116 Q140,102 149,102 Q159,102 159,116 L159,182" fill="url(#sg)" stroke="#9a6040" strokeWidth="1.5"/>
          <path d="M55,202 Q34,186 31,163 Q29,146 44,143 Q57,140 61,160 L61,202" fill="url(#sg)" stroke="#9a6040" strokeWidth="1.5"/>
          <path d="M63,136 Q73,129 82,136" fill="none" stroke="#9a5030" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M89,116 Q99,109 108,116" fill="none" stroke="#9a5030" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M114,118 Q124,111 134,118" fill="none" stroke="#9a5030" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M140,124 Q148,118 156,124" fill="none" stroke="#9a5030" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="75" y1="230" x2="75" y2="295" stroke="#a06838" strokeWidth="1" opacity="0.4"/>
          <line x1="98" y1="230" x2="98" y2="298" stroke="#a06838" strokeWidth="1" opacity="0.4"/>
          <line x1="121" y1="230" x2="121" y2="295" stroke="#a06838" strokeWidth="1" opacity="0.4"/>
        </svg>
      </div>
      <svg viewBox="0 0 400 400" style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:'100vw',height:'100vw',maxWidth:680,maxHeight:680}}>
        <g className="crack-group">
          {Array.from({length:12}).map((_,i)=>{const ang=(i*Math.PI*2)/12,len=70+Math.random()*120,mx=200+Math.cos(ang)*len*0.5+(Math.random()-.5)*18,my=200+Math.sin(ang)*len*0.5+(Math.random()-.5)*18;return(<polyline key={i} points={`200,200 ${mx},${my} ${200+Math.cos(ang)*len},${200+Math.sin(ang)*len}`} fill="none" stroke="white" strokeWidth={1.5+Math.random()*2} opacity="0.7" strokeLinecap="round"/>);})}
        </g>
      </svg>
      {isAce&&<>
        <div className="ace-flash"/>
        <div className="ace-flash ace-flash-2"/>
        <div style={{position:'absolute',top:'38%',left:'50%',transform:'translate(-50%,-50%)',zIndex:130,pointerEvents:'none',fontFamily:'var(--display-font)',fontWeight:900,fontSize:'clamp(30px,9vw,58px)',color:'#ffd700',textShadow:'0 0 20px #ffd700,0 0 50px #ffd700,0 4px 14px rgba(0,0,0,.9)',letterSpacing:'.08em',animation:'aceLabel .65s cubic-bezier(.34,1.56,.64,1) forwards',whiteSpace:'nowrap'}}>⚡ ACE ⚡</div>
      </>}
    </div>
  );
}

function ChatBubble({message,playerIdx,avatars,side}){
  if(!message)return null;
  const pos={top:{top:74,left:'50%',transform:'translateX(-50%)'},left:{top:'40%',left:6},right:{top:'40%',right:6}}[side]||{top:74,left:'50%',transform:'translateX(-50%)'};
  return(
    <div className="chat-bubble slide-in" style={{position:'fixed',zIndex:90,...pos}}>
      <div className="panel px-3 py-2" style={{display:'inline-flex',alignItems:'center',gap:6,maxWidth:180,borderColor:'var(--accent)',boxShadow:'var(--accent-glow),0 4px 12px rgba(0,0,0,.4)'}}>
        <span style={{fontSize:15}}>{avatars[playerIdx]}</span>
        <span className="text-xs" style={{lineHeight:1.3}}>{message}</span>
      </div>
    </div>
  );
}

// ── MAIN MENU ──
// ── AUTH MODAL ──
function AuthModal({onClose,onSignedIn}){
  const[tab,setTab]=useState('signin');
  const[email,setEmail]=useState('');
  const[pass,setPass]=useState('');
  const[name,setName]=useState('');
  const[loading,setLoading]=useState(false);
  const[err,setErr]=useState('');
  const[msg,setMsg]=useState('');

  const submit=async(e)=>{
    e.preventDefault();setErr('');setMsg('');setLoading(true);
    try{
      if(tab==='signin'){
        const{data,error}=await signInEmail(email,pass);
        if(error)setErr(error.message);
        else{onSignedIn(data.user);onClose();}
      }else{
        const{data,error}=await signUpEmail(email,pass,name||email.split('@')[0]);
        if(error)setErr(error.message);
        else setMsg('Check your email to confirm your account, then sign in.');
      }
    }catch(e){setErr(e.message);}
    setLoading(false);
  };

  if(!supabaseEnabled)return(
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{background:'rgba(0,0,0,.85)',zIndex:80}}>
      <div onClick={e=>e.stopPropagation()} className="panel p-5 max-w-sm w-full text-center">
        <div className="display gold font-bold text-xl mb-3">Sign In</div>
        <div className="muted text-sm mb-4">Supabase isn't connected yet. Add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file.</div>
        <button onClick={onClose} className="btn-primary w-full">OK</button>
      </div>
    </div>
  );

  return(
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{background:'rgba(0,0,0,.85)',zIndex:80}}>
      <div onClick={e=>e.stopPropagation()} className="panel p-5 max-w-sm w-full">
        <div className="flex justify-between items-center mb-4">
          <div className="display gold font-bold text-xl">Account</div>
          <button onClick={onClose} style={{fontSize:26,lineHeight:1,background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}>×</button>
        </div>
        {/* tab toggle */}
        <div className="pillbar mb-4">
          <button className={tab==='signin'?'active':''} onClick={()=>{setTab('signin');setErr('');setMsg('');}}>Sign In</button>
          <button className={tab==='signup'?'active':''} onClick={()=>{setTab('signup');setErr('');setMsg('');}}>Sign Up</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {tab==='signup'&&<input className="w-full px-3 py-2 rounded-lg text-sm" style={{background:'rgba(255,255,255,.08)',border:'1px solid var(--panel-border)',color:'var(--text)'}} type="text" placeholder="Display name (optional)" value={name} onChange={e=>setName(e.target.value)}/>}
          <input className="w-full px-3 py-2 rounded-lg text-sm" style={{background:'rgba(255,255,255,.08)',border:'1px solid var(--panel-border)',color:'var(--text)'}} type="email" placeholder="Email" required value={email} onChange={e=>setEmail(e.target.value)}/>
          <input className="w-full px-3 py-2 rounded-lg text-sm" style={{background:'rgba(255,255,255,.08)',border:'1px solid var(--panel-border)',color:'var(--text)'}} type="password" placeholder="Password" required value={pass} onChange={e=>setPass(e.target.value)}/>
          {err&&<div className="text-xs" style={{color:'var(--danger)'}}>{err}</div>}
          {msg&&<div className="text-xs success">{msg}</div>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>{loading?'…':tab==='signin'?'Sign In':'Create Account'}</button>
        </form>
        <div className="flex items-center gap-2 my-3"><div style={{flex:1,height:1,background:'var(--panel-border)'}}/><span className="muted text-xs">or</span><div style={{flex:1,height:1,background:'var(--panel-border)'}}/></div>
        <div className="flex flex-col gap-2">
          <button onClick={()=>signInGoogle()} className="btn-secondary w-full flex items-center justify-center gap-2"><span>G</span> Continue with Google</button>
          <button onClick={()=>signInFacebook()} className="btn-secondary w-full flex items-center justify-center gap-2"><span>f</span> Continue with Facebook</button>
        </div>
      </div>
    </div>
  );
}

function MainMenu({theme,setTheme,onPlayLocal,onPlayAI,onShowRules,onShowSettings,onCosmetics,onLeaderboard,coins,trophies,playerName,onShowAuth,currentUser,onSignOut}){
  const [soon,setSoon]=useState(false);
  const floatCards=[{suit:'♠',rank:'A',red:false},{suit:'♥',rank:'K',red:true},{suit:'♦',rank:'Q',red:true},{suit:'♣',rank:'J',red:false},{suit:'♠',rank:'10',red:false},{suit:'♥',rank:'7',red:true}];
  return(
    <div className="flex flex-col items-center min-h-screen p-4 fade-in" style={{overflowX:'hidden'}}>
      {/* floating bg cards */}
      {floatCards.map((c,i)=>(
        <div key={i} className="float-card" style={{left:`${8+i*16}%`,animationDelay:`${i*0.7}s`,animationDuration:`${4+i*0.5}s`}}>
          <CardFace card={c} size="sm" playable={false}/>
        </div>
      ))}
      {/* top bar */}
      <div className="w-full max-w-sm flex justify-between items-center mb-6 pt-2" style={{zIndex:10,position:'relative'}}>
        <div className="panel px-3 py-1.5 flex items-center gap-2">
          <span style={{fontSize:16}}>🪙</span>
          <span className="gold font-bold text-sm">{coins}</span>
          <span style={{fontSize:14}}>🏆</span>
          <span className="gold font-bold text-sm">{trophies}</span>
        </div>
        <div className="flex items-center gap-2">
          {currentUser
            ? <button onClick={onSignOut} className="btn-secondary" style={{fontSize:11,padding:'4px 8px'}}>☁️ Sign Out</button>
            : <button onClick={onShowAuth} className="btn-secondary" style={{fontSize:11,padding:'4px 8px'}}>☁️ Sign In</button>
          }
          <button onClick={onShowSettings} className="btn-secondary">⚙</button>
        </div>
      </div>
      {/* logo */}
      <div className="text-center mb-4" style={{zIndex:10,position:'relative'}}>
        <div className="display gold font-bold logo-slam" style={{fontSize:'clamp(52px,16vw,88px)',letterSpacing:'.12em',textShadow:'0 0 30px rgba(240,198,116,.5),0 8px 24px rgba(0,0,0,.6)',lineHeight:1}}>THULLA</div>
        <div className="muted text-xs italic mt-1 tracking-widest">throw down. or get thulla'd.</div>
      </div>
      {/* mode tiles */}
      <div className="flex flex-col gap-3 w-full max-w-xs" style={{zIndex:10,position:'relative'}}>
        <button onClick={onPlayAI} className="mode-tile" style={{background:'linear-gradient(135deg,var(--accent-deep),var(--accent))',color:'var(--accent-text)'}}>
          <span style={{fontSize:28}}>🤖</span>
          <div style={{flex:1,textAlign:'left'}}>
            <div style={{fontWeight:800,fontSize:15}}>Play vs AI</div>
            <div style={{fontSize:11,opacity:.8}}>3 difficulties · solo</div>
          </div>
          <span style={{fontSize:20,opacity:.6}}>›</span>
        </button>
        <button onClick={onPlayLocal} className="mode-tile">
          <span style={{fontSize:28}}>👥</span>
          <div style={{flex:1,textAlign:'left'}}>
            <div style={{fontWeight:800,fontSize:15}}>Local Play</div>
            <div style={{fontSize:11,opacity:.7}}>4 players · pass-and-play</div>
          </div>
          <span style={{fontSize:20,opacity:.4}}>›</span>
        </button>
        <button onClick={()=>setSoon(true)} className="mode-tile">
          <span style={{fontSize:28}}>🌐</span>
          <div style={{flex:1,textAlign:'left'}}>
            <div style={{fontWeight:800,fontSize:15}}>Play Online</div>
            <div style={{fontSize:11,opacity:.7}}>room codes · coming soon</div>
          </div>
          <span className="pill-soon">SOON</span>
        </button>
      </div>
      {/* secondary actions */}
      <div className="grid grid-cols-3 gap-2 mt-4 w-full max-w-xs" style={{zIndex:10,position:'relative'}}>
        <button onClick={onLeaderboard} className="sub-tile">🏆<br/><span style={{fontSize:10}}>Rankings</span></button>
        <button onClick={onCosmetics} className="sub-tile">🔒<br/><span style={{fontSize:10}}>Cosmetics</span></button>
        <button onClick={onShowRules} className="sub-tile">📖<br/><span style={{fontSize:10}}>Rules</span></button>
      </div>
      {/* theme */}
      <div className="mt-5 flex flex-col items-center gap-2" style={{zIndex:10,position:'relative'}}>
        <div className="text-[10px] muted uppercase tracking-widest">Theme</div>
        <div className="pillbar">{Object.entries(THEMES).map(([k,t])=><button key={k} onClick={()=>setTheme(k)} className={theme===k?'active':''}><span style={{display:'inline-block',width:8,height:8,borderRadius:4,background:t.swatch[1],marginRight:5,verticalAlign:'middle'}}/>{t.name}</button>)}</div>
      </div>
      {soon&&<div onClick={()=>setSoon(false)} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{background:'rgba(0,0,0,.78)',zIndex:80}}><div className="panel p-6 max-w-sm w-full text-center" onClick={e=>e.stopPropagation()}><div className="display gold text-2xl font-bold mb-2">Coming Soon</div><div className="muted text-sm mb-4">Online multiplayer with room codes is Phase 4. We're close 🚀</div><button onClick={()=>setSoon(false)} className="btn-primary" style={{width:'100%'}}>Got it</button></div></div>}
    </div>
  );
}

// ── AI SETUP ──
function AISetup({difficulty,setDifficulty,names,avatars,setName,onPickAvatar,onBack,onStart}){
  const diffs=[{key:'easy',label:'Easy',desc:'Random plays, accepts all requests',emoji:'😊'},{key:'medium',label:'Medium',desc:'Holds aces, plays tactically, 40% refuse',emoji:'😤'},{key:'hard',label:'Hard',desc:'Empties suits, ace thullas, never leads aces',emoji:'💀'}];
  return(
    <div className="flex flex-col min-h-screen p-5 max-w-md mx-auto fade-in">
      <button onClick={onBack} className="btn-secondary self-start mb-4">← Menu</button>
      <div className="text-center mb-4"><div className="display gold font-bold" style={{fontSize:30}}>Play vs AI</div><div className="muted text-xs mt-1">you against 3 bots</div></div>
      <div className="panel p-3 mb-4">
        <div className="text-xs gold mb-2 font-bold">Your name</div>
        <div className="flex items-center gap-3">
          <button onClick={()=>onPickAvatar(0)} className="avatar-bubble">{avatars[0]}</button>
          <input className="input-field" placeholder="Your name" value={names[0]} onChange={e=>setName(0,e.target.value)} maxLength={14}/>
        </div>
      </div>
      <div className="text-xs gold mb-2 font-bold">Difficulty</div>
      <div className="flex flex-col gap-2 mb-4">
        {diffs.map(d=><button key={d.key} onClick={()=>setDifficulty(d.key)} className="panel p-3 text-left flex items-center gap-3" style={{borderColor:difficulty===d.key?'var(--accent)':'var(--panel-border)',borderWidth:difficulty===d.key?2:1}}>
          <span style={{fontSize:28}}>{d.emoji}</span>
          <div><div className="font-bold text-sm">{d.label}</div><div className="muted text-xs">{d.desc}</div></div>
        </button>)}
      </div>
      <div className="panel p-3 mb-4">
        <div className="text-xs gold mb-2 font-bold">Your opponents</div>
        <div className="flex gap-4 justify-center">{[1,2,3].map(i=><div key={i} className="text-center"><div style={{fontSize:28}}>{avatars[i]}</div><div className="text-xs muted mt-1">{names[i]}</div></div>)}</div>
      </div>
      <button onClick={onStart} className="btn-primary pulse" style={{width:'100%'}}>Deal cards →</button>
    </div>
  );
}

// ── NAME ENTRY ──
function NameEntry({names,avatars,setName,onPickAvatar,onRandomize,onBack,onStart}){
  return(
    <div className="flex flex-col min-h-screen p-5 max-w-md mx-auto fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-secondary">← Menu</button>
        <button onClick={onRandomize} className="btn-secondary">🎲 Random</button>
      </div>
      <div className="text-center mb-6"><div className="display gold font-bold" style={{fontSize:34}}>Who's playing?</div><div className="muted text-xs mt-1">tap avatar to change</div></div>
      <div className="flex flex-col gap-3 mb-6">{[0,1,2,3].map(i=><div key={i} className="panel p-3 flex items-center gap-3 slide-in" style={{animationDelay:`${i*55}ms`}}><button onClick={()=>onPickAvatar(i)} className="avatar-bubble">{avatars[i]}</button><input className="input-field" placeholder={`Player ${i+1}`} value={names[i]} onChange={e=>setName(i,e.target.value)} maxLength={14}/></div>)}</div>
      <button onClick={onStart} className="btn-primary pulse" style={{width:'100%'}}>Deal cards →</button>
      <div className="text-center muted text-[10px] mt-2">A♠ holder leads first · must play A♠</div>
    </div>
  );
}

function AvatarPicker({current,onPick,onClose}){
  return(
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{background:'rgba(0,0,0,.78)',zIndex:60}}>
      <div onClick={e=>e.stopPropagation()} className="panel p-5 max-w-xs w-full">
        <div className="display gold text-xl font-bold mb-3 text-center">Pick avatar</div>
        <div className="grid grid-cols-4 gap-2">{AVATARS.map(av=><button key={av} onClick={()=>onPick(av)} className="avatar-bubble" style={{width:'100%',aspectRatio:'1',opacity:av===current?1:.65,borderWidth:av===current?3:1}}>{av}</button>)}</div>
      </div>
    </div>
  );
}

// ── GAME VIEW (bot thinking shared layout) ──
function GameLayout({turn,leader,trick,ledSuit,eliminated,hands,avatars,displayName,isBot,setShowSettings,setShowRules,onBackToMenu,children}){
  const opps=[];for(let i=1;i<N;i++)opps.push((turn+i)%N);
  const seniorNow=trick.length>0&&ledSuit?findSenior(trick,ledSuit):null;
  return(
    <div className="flex flex-col min-h-screen max-w-md mx-auto p-2" style={{fontFamily:'var(--body-font)'}}>
      {/* top bar */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={onBackToMenu} className="btn-secondary" style={{fontSize:11}}>← Menu</button>
        <div className="display gold font-bold tracking-widest" style={{fontSize:18}}>THULLA</div>
        <div className="flex gap-1"><button onClick={()=>setShowSettings(true)} className="btn-secondary" style={{fontSize:11}}>⚙</button><button onClick={()=>setShowRules(true)} className="btn-secondary" style={{fontSize:11}}>?</button></div>
      </div>
      {/* opponents row */}
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        {opps.map(p=>(
          <div key={p} className={`panel p-2 text-center${eliminated.includes(p)?' opacity-40':''}${leader===p&&!eliminated.includes(p)?' leader-glow':''}`}>
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span style={{fontSize:14}}>{avatars[p]}</span>
              <span className="text-xs truncate" style={{maxWidth:62}}>{displayName(p)}</span>
              {isBot&&isBot[p]&&!eliminated.includes(p)&&p===turn&&<span className="bot-dot-inline"/>}
            </div>
            <FaceDownFan count={hands[p]?.length??0}/>
            <div className="display gold font-bold" style={{fontSize:20,lineHeight:1.1}}>{hands[p]?.length??0}</div>
            {eliminated.includes(p)&&<div className="text-[9px] success">WON ✓</div>}
            {leader===p&&!eliminated.includes(p)&&<div className="text-[9px] gold">leads</div>}
          </div>
        ))}
      </div>
      {/* status bar */}
      <div className="panel px-3 py-1.5 mb-2 text-center text-xs">
        {trick.length===0&&ledSuit===null
          ?<span className="gold">{displayName(turn)} leads</span>
          :ledSuit&&trick.length>0
            ?<span>Led: <span className="gold font-bold">{ledSuit}</span> · Senior: <span className="gold font-bold">{seniorNow!==null?displayName(seniorNow):'—'}</span></span>
            :<span className="gold">{displayName(turn)} opens</span>}
      </div>
      {/* felt table */}
      <div className="felt-table mb-2 flex items-center justify-center" style={{minHeight:130}}>
        {trick.length===0
          ?<div className="muted text-sm italic">— empty table —</div>
          :<div className="flex flex-wrap gap-2 items-end justify-center p-2">
            {trick.map((t,i)=>(
              <div key={i} className="flex flex-col items-center">
                <div className="text-[10px] muted mb-1">{avatars[t.player]} {displayName(t.player)}</div>
                <CardFace card={t.card} size="sm" playable={false}/>
                {t.isThulla&&<div className="text-[10px] mt-1 font-bold" style={{color:'var(--danger)'}}>THULLA</div>}
                {!t.isThulla&&t.player===seniorNow&&<div className="text-[10px] gold mt-1 font-bold">SENIOR ★</div>}
              </div>
            ))}
          </div>}
      </div>
      {children}
    </div>
  );
}

function BotThinking({turn,displayName,avatars,hands,trick,ledSuit,eliminated,leader,isBot,setShowSettings,setShowRules,onBackToMenu}){
  return(
    <GameLayout turn={turn} leader={leader} trick={trick} ledSuit={ledSuit} eliminated={eliminated} hands={hands} avatars={avatars} displayName={displayName} isBot={isBot} setShowSettings={setShowSettings} setShowRules={setShowRules} onBackToMenu={onBackToMenu}>
      <div className="flex-1 flex flex-col justify-end">
        <div className="panel p-4 text-center slide-in">
          <span style={{fontSize:38}}>{avatars[turn]}</span>
          <div className="display gold text-xl font-bold mt-2">{displayName(turn)}</div>
          <div className="muted text-sm mt-1">thinking<span className="bot-dot">.</span><span className="bot-dot" style={{animationDelay:'.2s'}}>.</span><span className="bot-dot" style={{animationDelay:'.4s'}}>.</span></div>
        </div>
      </div>
    </GameLayout>
  );
}

function GameView({hands,turn,leader,trick,ledSuit,firstRound,eliminated,phase,revealed,reveal,playCard,validPlays,canRequest,pendingThullaBy,initiateRequest,setShowRules,setShowSettings,displayName,avatars,isBot,onBackToMenu}){
  const myHand=hands[turn]||[];
  const overlap=myHand.length>13?-42:-30;
  return(
    <GameLayout turn={turn} leader={leader} trick={trick} ledSuit={ledSuit} eliminated={eliminated} hands={hands} avatars={avatars} displayName={displayName} isBot={isBot} setShowSettings={setShowSettings} setShowRules={setShowRules} onBackToMenu={onBackToMenu}>
      <div className="flex-1 flex flex-col justify-end">
        {phase==='pass'&&(
          <div className="panel p-5 text-center slide-in">
            <div className="text-[10px] muted uppercase tracking-widest mb-2">Privacy Mode</div>
            <div className="flex items-center justify-center gap-3 mb-2">
              <span style={{fontSize:34}}>{avatars[turn]}</span>
              <div className="display gold text-xl font-bold">{displayName(turn)}</div>
            </div>
            <div className="muted text-sm mb-4">{myHand.length} cards in hand</div>
            <button onClick={reveal} className="btn-primary pulse" style={{width:'100%'}}>Reveal hand 👁</button>
          </div>
        )}
        {phase==='play'&&revealed&&(
          <div className="slide-in">
            {canRequest&&(
              <div className="mb-3">
                <button onClick={initiateRequest} className="btn-danger">Request cards from {displayName(pendingThullaBy)}</button>
                <div className="text-[10px] muted text-center mt-1">they choose: hand over (they win) or refuse</div>
              </div>
            )}
            {firstRound&&trick.length===0&&<div className="text-center text-xs gold italic mb-1">You hold A♠ — must play it first</div>}
            {trick.length>0&&!myHand.some(c=>c.suit===ledSuit)&&<div className="text-center text-xs italic mb-1" style={{color:'var(--danger)'}}>No {ledSuit} — pick anything to THULLA ⚡</div>}
            <div className="text-xs gold text-center mb-1">your hand · tap to play</div>
            <div className="overflow-x-auto hand-row">
              <div className="flex justify-center" style={{paddingLeft:14,paddingRight:14,minWidth:'min-content'}}>
                {myHand.map((card,idx)=>(
                  <div key={card.id} style={{marginLeft:idx===0?0:overlap,zIndex:idx,position:'relative'}}>
                    <CardFace card={card} onClick={()=>playCard(idx)} disabled={!validPlays.has(idx)} playable={validPlays.has(idx)} dim={!validPlays.has(idx)&&trick.length>0}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </GameLayout>
  );
}

function RequestPass({target,requester,displayName,avatars,onReveal}){
  return(
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in">
      <div className="panel p-6 max-w-md w-full text-center slide-in">
        <div className="text-[10px] muted uppercase tracking-widest mb-2">Decision required</div>
        <div className="display font-bold mb-3" style={{fontSize:26,color:'var(--danger)'}}>Cards Demanded</div>
        <div className="flex items-center justify-center gap-4 mb-4"><span style={{fontSize:36}}>{avatars[requester]}</span><span className="muted text-xl">→</span><span style={{fontSize:36}}>{avatars[target]}</span></div>
        <div className="text-sm mb-2"><span className="gold font-bold">{displayName(requester)}</span> is demanding cards from <span className="gold font-bold">{displayName(target)}</span>.</div>
        <div className="muted text-xs mb-5">Pass the phone — only {displayName(target)} sees the next screen.</div>
        <button onClick={onReveal} className="btn-primary pulse" style={{width:'100%'}}>I'm {displayName(target)} — see the request</button>
      </div>
    </div>
  );
}

function RequestDecide({target,requester,myCards,displayName,avatars,onAccept,onRefuse}){
  return(
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in">
      <div className="panel p-6 max-w-md w-full text-center slide-in">
        <div className="text-[10px] muted uppercase tracking-widest mb-2">Your call, {displayName(target)}</div>
        <div className="flex items-center justify-center gap-3 mb-4"><span style={{fontSize:38}}>{avatars[requester]}</span><span className="muted">demands</span><span style={{fontSize:38}}>{avatars[target]}</span></div>
        <div className="display gold font-bold mb-1" style={{fontSize:22}}>{displayName(requester)} wants your hand</div>
        <div className="text-sm mb-5">{myCards} cards on the line</div>
        <div className="flex flex-col gap-3">
          <button onClick={onAccept} className="btn-primary" style={{width:'100%',background:'linear-gradient(180deg,var(--success) 0%,#2d7a55 100%)',color:'#04150d',borderColor:'#2d7a55'}}>
            ✓ Accept — I win, take my cards
            <div style={{fontSize:10,fontWeight:500,opacity:.8,marginTop:2}}>{displayName(requester)} absorbs your hand · you exit as winner</div>
          </button>
          <button onClick={onRefuse} className="btn-danger">
            ✗ Refuse — keep playing
            <div style={{fontSize:10,fontWeight:500,opacity:.8,marginTop:2}}>{displayName(requester)} stays stuck</div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultView({data,onContinue,displayName,avatars}){
  const [showSlam,setShowSlam]=useState(data.type==='thulla');
  useEffect(()=>{if(data.type==='thulla'){const t=setTimeout(()=>setShowSlam(false),900);return()=>clearTimeout(t);}},[data.type]);
  return(
    <div className="flex flex-col items-center justify-center min-h-screen p-5 fade-in relative">
      {data.type==='thulla'&&<div style={{position:'fixed',top:'6%',left:0,right:0,textAlign:'center',zIndex:101,pointerEvents:'none'}}><div className="thulla-mega-text">THULLA!</div></div>}
      <div className="panel p-5 max-w-md w-full text-center slide-in" style={{marginTop:data.type==='thulla'?80:0}}>
        {data.type==='thulla'&&<>
          <div className="flex items-center justify-center gap-2 mb-3">
            <span style={{fontSize:24}}>{avatars[data.thullaBy]}</span>
            <span className="muted text-sm">slammed</span>
            <div className={showSlam?'slam-anim':''}><CardFace card={data.thullaCard} size="md" playable={false}/></div>
          </div>
          {data.isAce&&<div className="text-xs font-bold mb-2" style={{color:'#ffd700'}}>⚡ ACE THULLA ⚡</div>}
          <div className="text-sm mb-3"><span className="gold font-bold">{displayName(data.thullaBy)}</span> couldn't follow {data.ledSuit}.<br/><span className="gold font-bold">{displayName(data.senior)}</span> picks up <span className="gold font-bold">{data.cards.length}</span> cards.</div>
          <div className="flex flex-wrap gap-2 justify-center mb-3">{data.cards.map((c,i)=><CardFace key={i} card={c} size="sm" playable={false}/>)}</div>
        </>}
        {data.type==='flush'&&<>
          <div className="display gold font-bold mb-3" style={{fontSize:28}}>Round Won</div>
          <div className="flex items-center justify-center gap-2 mb-3"><span style={{fontSize:22}}>{avatars[data.senior]}</span><span><span className="gold font-bold">{displayName(data.senior)}</span> takes the {data.ledSuit} round</span></div>
          <div className="flex flex-wrap gap-2 justify-center mb-3">{data.cards.map((c,i)=><CardFace key={i} card={c} size="sm" playable={false}/>)}</div>
          {data.actualLeader!==data.senior&&<div className="text-xs muted italic mb-3">{displayName(data.senior)} ran out — {displayName(data.actualLeader)} leads next</div>}
        </>}
        {data.type==='request'&&<><div className="display gold font-bold mb-3" style={{fontSize:26}}>Cards Handed Over</div><div className="text-sm mb-4"><span className="gold font-bold">{displayName(data.target)}</span> agreed and walked away with the win.<br/><span className="gold font-bold">{displayName(data.requester)}</span> absorbed {data.cardsTaken} cards.</div></>}
        {data.type==='refusal'&&<><div className="display font-bold mb-3" style={{fontSize:26,color:'var(--danger)'}}>Refused!</div><div className="text-sm mb-4"><span className="gold font-bold">{displayName(data.target)}</span> refused.<br/><span className="gold font-bold">{displayName(data.requester)}</span> must keep playing.</div></>}
        {data.newWinners?.length>0&&<div className="mb-4 p-2 rounded" style={{background:'rgba(0,80,40,.35)',border:'1px solid var(--success)'}}>{data.newWinners.map(w=><div key={w} className="font-bold text-sm flex items-center justify-center gap-2" style={{color:'var(--success)'}}>🏆 {avatars[w]} {displayName(w)} — WINNER</div>)}</div>}
        <button onClick={onContinue} className="btn-primary" style={{width:'100%'}}>Continue →</button>
      </div>
    </div>
  );
}

// ── GAME OVER ──
function GameOverView({winnersOrder,eliminated,hands,displayName,avatars,onPlayAgain,onMenu,playerIdx,playerName}){
  const [coinCount,setCoinCount]=useState(null);
  const [trophyDelta,setTrophyDelta]=useState(null);
  let loser=null;for(let i=0;i<N;i++)if(!eliminated.includes(i)){loser=i;break;}
  const finalOrder=[...winnersOrder];if(loser!==null)finalOrder.push(loser);
  const medals=['🥇','🥈','🥉','💀'];
  const posColors=['#f0c674','#c0c0c0','#cd7f32','var(--danger)'];

  useEffect(()=>{
    const rank=finalOrder.indexOf(playerIdx);
    if(rank<0||playerName===null)return;
    const coins=COIN_REWARDS[Math.min(rank,3)]+PART_COINS;
    const tDelta=TROPHY_REWARDS[Math.min(rank,3)];
    (async()=>{
      const {newTrophies}=await saveGameResult({
        placement:rank+1,
        coinsEarned:coins,
        trophiesDelta:tDelta,
        gameMode:'ai',
      });
      upsertLB(playerName,avatars[playerIdx],newTrophies);
      setCoinCount(coins);setTrophyDelta(tDelta);
      if(coins>0)setTimeout(playCoinSnd,400);
      if(rank===0)setTimeout(playWinSnd,200);
    })();
  },[]);

  return(
    <div className="flex flex-col items-center justify-center min-h-screen p-5 fade-in relative overflow-hidden">
      {Array.from({length:30}).map((_,i)=><div key={i} className="confetti-piece" style={{left:`${Math.random()*100}%`,top:'-20px',background:['var(--accent)','var(--success)','var(--danger)','#fff','#00e5ff'][i%5],animationDelay:`${Math.random()*1.8}s`,transform:`rotate(${Math.random()*360}deg)`}}/>)}
      <div className="panel p-5 max-w-md w-full text-center slide-in" style={{zIndex:2,position:'relative'}}>
        <div className="display gold font-bold mb-1" style={{fontSize:38}}>Game Over</div>
        <div className="flex items-center justify-center gap-2 mb-4" style={{color:'var(--danger)',fontSize:15}}>
          <span style={{fontSize:26}}>{loser!==null?avatars[loser]:''}</span>
          <span>{loser!==null?`${displayName(loser)} is the THULLA 😭`:''}</span>
        </div>
        {/* podium */}
        <div className="flex items-end justify-center gap-2 mb-5" style={{height:110}}>
          {[1,0,2].map(podiumPos=>{
            const player=finalOrder[podiumPos];if(player===undefined)return<div key={podiumPos}/>;
            const heights=[90,110,70];const ht=heights[podiumPos];
            return(
              <div key={podiumPos} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                <span style={{fontSize:20,marginBottom:2}}>{medals[podiumPos]}</span>
                <span style={{fontSize:22,marginBottom:2}}>{avatars[player]}</span>
                <div className="text-xs font-bold mb-1 truncate" style={{maxWidth:60,color:posColors[podiumPos]}}>{displayName(player)}</div>
                <div style={{width:58,height:ht,borderRadius:'6px 6px 0 0',background:`linear-gradient(180deg,${posColors[podiumPos]}88,${posColors[podiumPos]}44)`,border:`1px solid ${posColors[podiumPos]}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <span className="display font-bold" style={{fontSize:22,color:posColors[podiumPos]}}>{podiumPos+1}</span>
                </div>
              </div>
            );
          })}
          {finalOrder[3]!==undefined&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginLeft:4}}>
              <span style={{fontSize:20,marginBottom:2}}>💀</span>
              <span style={{fontSize:22,marginBottom:2}}>{avatars[finalOrder[3]]}</span>
              <div className="text-xs font-bold mb-1 truncate" style={{maxWidth:60,color:'var(--danger)'}}>{displayName(finalOrder[3])}</div>
              <div style={{width:58,height:50,borderRadius:'6px 6px 0 0',background:'rgba(248,113,113,.15)',border:'1px solid var(--danger)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span className="display font-bold" style={{fontSize:18,color:'var(--danger)'}}>4</span>
              </div>
            </div>
          )}
        </div>
        {/* coin/trophy reward */}
        {coinCount!==null&&(
          <div className="panel p-3 mb-4 flex justify-center gap-6">
            <div className="text-center">
              <div style={{fontSize:22}}>🪙</div>
              <div className="gold font-bold text-lg">+{coinCount}</div>
              <div className="muted text-[10px]">coins earned</div>
            </div>
            <div className="text-center">
              <div style={{fontSize:22}}>🏆</div>
              <div className="font-bold text-lg" style={{color:trophyDelta>=0?'var(--success)':'var(--danger)'}}>{trophyDelta>=0?'+':''}{trophyDelta}</div>
              <div className="muted text-[10px]">trophies</div>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onMenu} className="btn-ghost" style={{flex:1}}>Menu</button>
          <button onClick={onPlayAgain} className="btn-primary" style={{flex:2}}>Play Again</button>
        </div>
      </div>
    </div>
  );
}

// ── COSMETICS ──
function CosmeticsScreen({onBack,coins}){
  const cats=[...new Set(COSMETICS.map(c=>c.cat))];
  const [activeCat,setActiveCat]=useState(cats[0]);
  return(
    <div className="flex flex-col min-h-screen p-4 max-w-md mx-auto fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <div className="display gold font-bold" style={{fontSize:22}}>Cosmetics 🔒</div>
        <div className="panel px-2 py-1 flex items-center gap-1"><span>🪙</span><span className="gold font-bold text-sm">{coins}</span></div>
      </div>
      <div className="panel p-3 mb-4 text-center">
        <div className="text-xs muted">Cosmetics are coming in the next update. Preview what's in store!</div>
      </div>
      <div className="pillbar mb-4" style={{overflowX:'auto',flexWrap:'nowrap'}}>
        {cats.map(c=><button key={c} onClick={()=>setActiveCat(c)} className={activeCat===c?'active':''}>{c}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3 overflow-y-auto">
        {COSMETICS.filter(c=>c.cat===activeCat).map(item=>(
          <div key={item.id} className="panel p-3 text-center relative" style={{opacity:.85}}>
            <div style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,.6)',borderRadius:4,padding:'2px 5px',fontSize:10,color:'#aaa'}}>🔒</div>
            <div style={{fontSize:38,marginBottom:6}}>{item.preview}</div>
            <div className="font-bold text-sm mb-1">{item.name}</div>
            <div className="flex items-center justify-center gap-1">
              <span style={{fontSize:13}}>🪙</span>
              <span className="gold font-bold text-sm">{item.price}</span>
            </div>
            <div className="text-[10px] muted mt-1">Coming Soon</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LEADERBOARD ──
function LeaderboardScreen({onBack,playerName}){
  const [lb,setLb]=useState([]);
  useEffect(()=>{
    fetchLeaderboard(AI_RIVALS).then(rows=>setLb(rows.slice(0,20)));
  },[]);
  const medals=['🥇','🥈','🥉'];
  return(
    <div className="flex flex-col min-h-screen p-4 max-w-md mx-auto fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="btn-secondary">← Back</button>
        <div className="display gold font-bold" style={{fontSize:22}}>Rankings 🏆</div>
        <div style={{width:60}}/>
      </div>
      <div className="panel p-3 mb-3 text-center">
        <div className="text-xs muted">{lb.length===0?'Loading…':'Global rankings'}</div>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto">
        {lb.map((entry,i)=>(
          <div key={i} className="panel px-3 py-2.5 flex items-center gap-3" style={{borderColor:entry.name===playerName?'var(--accent)':'var(--panel-border)',background:entry.name===playerName?'rgba(240,198,116,.08)':'var(--panel-bg)'}}>
            <span style={{fontSize:18,minWidth:24,textAlign:'center'}}>{medals[i]||<span className="display font-bold muted" style={{fontSize:14}}>{i+1}</span>}</span>
            <span style={{fontSize:18}}>{entry.avatar}</span>
            <div style={{flex:1}}>
              <div className="font-bold text-sm">{entry.name}{entry.isAI&&<span className="muted text-[10px] ml-1">AI</span>}</div>
            </div>
            <div className="flex items-center gap-1"><span style={{fontSize:13}}>🏆</span><span className="gold font-bold text-sm">{entry.trophies}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SETTINGS ──
function SettingsModal({sfx,setSfx,music,setMusic,musicOn,setMusicOn,theme,setTheme,onClose}){
  return(
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{background:'rgba(0,0,0,.80)',zIndex:70}}>
      <div onClick={e=>e.stopPropagation()} className="panel p-5 max-w-md w-full">
        <div className="flex justify-between items-center mb-4"><div className="display gold text-xl font-bold">Settings</div><button onClick={onClose} style={{fontSize:28,lineHeight:1,background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}>×</button></div>
        <div className="space-y-4">
          <div><div className="flex justify-between mb-1"><span className="text-sm">SFX volume</span><span className="muted text-xs">{Math.round(sfx*100)}%</span></div><input className="vol" type="range" min={0} max={1} step={0.05} value={sfx} onChange={e=>setSfx(parseFloat(e.target.value))}/></div>
          <div><div className="flex justify-between items-center mb-1"><span className="text-sm">Music</span><button onClick={()=>setMusicOn(!musicOn)} className="btn-secondary" style={{background:musicOn?'var(--accent)':'',color:musicOn?'var(--accent-text)':'var(--accent)'}}>{musicOn?'On':'Off'}</button></div><input className="vol" type="range" min={0} max={1} step={0.05} value={music} onChange={e=>setMusic(parseFloat(e.target.value))} disabled={!musicOn} style={{opacity:musicOn?1:.4}}/></div>
          <div><div className="text-sm mb-2">Theme</div><div className="pillbar" style={{width:'100%',justifyContent:'space-between'}}>{Object.entries(THEMES).map(([k,t])=><button key={k} onClick={()=>setTheme(k)} className={theme===k?'active':''} style={{flex:1,textAlign:'center'}}><span style={{display:'inline-block',width:8,height:8,borderRadius:4,background:t.swatch[1],marginRight:5,verticalAlign:'middle'}}/>{t.name}</button>)}</div></div>
        </div>
        <button onClick={onClose} className="btn-primary mt-5" style={{width:'100%'}}>Done</button>
      </div>
    </div>
  );
}

function RulesModal({onClose}){
  return(
    <div onClick={onClose} className="fixed inset-0 flex items-center justify-center p-4 fade-in" style={{background:'rgba(0,0,0,.80)',zIndex:50}}>
      <div onClick={e=>e.stopPropagation()} className="panel p-5 max-w-md w-full" style={{maxHeight:'88vh',overflowY:'auto'}}>
        <div className="flex justify-between items-center mb-4"><div className="display gold text-xl font-bold">Rules</div><button onClick={onClose} style={{fontSize:28,lineHeight:1,background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer'}}>×</button></div>
        <div className="text-sm space-y-3">
          <div><strong className="gold">Setup —</strong> 4 players, 13 cards each. Ace high, 2 low.</div>
          <div><strong className="gold">Start —</strong> A♠ holder leads first and must play A♠.</div>
          <div><strong className="gold">Follow —</strong> Everyone must follow the led suit. Highest = senior.</div>
          <div><strong className="gold">Thulla ⚡ —</strong> Can't follow? Slam any other card. Round ends — senior picks up all cards and leads next.</div>
          <div><strong className="gold">Flush —</strong> Everyone follows? Cards discarded. Senior leads next.</div>
          <div><strong className="gold">Request —</strong> Stuck in a loop? Demand their hand. They accept (they win, you absorb) or refuse.</div>
          <div><strong className="gold">Win —</strong> Run out of cards = winner. Last one holding = THULLA.</div>
          <div className="pt-1 border-t" style={{borderColor:'var(--panel-border)'}}><strong className="gold">Coins —</strong> 1st: +150, 2nd: +75, 3rd: +25, THULLA: +0. Play = +10.</div>
          <div><strong className="gold">Trophies —</strong> 1st: +30, 2nd: +10, 3rd: -5, THULLA: -20.</div>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// MAIN APP
// ================================================================
export default function ThullaApp(){
  const [theme,setTheme]=useState('classic');
  const [phase,setPhase]=useState('menu');
  const [gameMode,setGameMode]=useState('local');
  const [botDifficulty,setBotDifficulty]=useState('medium');
  const [names,setNames]=useState(['','','','']);
  const [avatars,setAvatars]=useState(['🦁','🐯','🦊','🐉']);
  const [isBot,setIsBot]=useState([false,false,false,false]);
  const [hands,setHands]=useState([]);
  const [eliminated,setEliminated]=useState([]);
  const [winnersOrder,setWinnersOrder]=useState([]);
  const [trick,setTrick]=useState([]);
  const [ledSuit,setLedSuit]=useState(null);
  const [leader,setLeader]=useState(0);
  const [turn,setTurn]=useState(0);
  const [firstRound,setFirstRound]=useState(true);
  const [pendingThullaBy,setPendingThullaBy]=useState(null);
  const [revealed,setRevealed]=useState(false);
  const [resultData,setResultData]=useState(null);
  const [showRules,setShowRules]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [showAvatarPicker,setShowAvatarPicker]=useState(null);
  const [shake,setShake]=useState(false);
  const [requestFrom,setRequestFrom]=useState(null);
  const [chatMsg,setChatMsg]=useState(null);
  const [sfx,setSfxState]=useState(0.7);
  const [music,setMusicState]=useState(0.4);
  const [musicOn,setMusicOn]=useState(false);
  const [showHandSlam,setShowHandSlam]=useState(false);
  const [isAceThulla,setIsAceThulla]=useState(false);
  const [dealHands,setDealHands]=useState(null);
  // player 0 profile
  const [playerCoins,setPlayerCoins]=useState(()=>loadProfile('You').coins);
  const [playerTrophies,setPlayerTrophies]=useState(()=>loadProfile('You').trophies);
  const [showAuth,setShowAuth]=useState(false);
  const [authedUser,setAuthedUser]=useState(null);

  useEffect(() => {
    initSync((updatedProfile) => {
      if (updatedProfile) {
        if (updatedProfile.coins !== undefined) setPlayerCoins(updatedProfile.coins);
        if (updatedProfile.trophies !== undefined) setPlayerTrophies(updatedProfile.trophies);
      }
    });
    // track auth state
    import('./lib/supabase').then(({supabase})=>{
      if(!supabase)return;
      supabase.auth.getUser().then(({data})=>setAuthedUser(data?.user??null));
      supabase.auth.onAuthStateChange((_,session)=>setAuthedUser(session?.user??null));
    });
    return teardownSync;
  }, []);

  useEffect(()=>{setSfxVol(sfx);},[sfx]);
  useEffect(()=>{setMusicVol(music);},[music]);
  useEffect(()=>{if(musicOn)startMusic();else stopMusic();return()=>stopMusic();},[musicOn]);

  // refresh coins when returning to menu
  useEffect(()=>{
    if(phase==='menu'){
      const pn=names[0].trim()||'You';
      const p=loadProfile(pn);
      setPlayerCoins(p.coins);setPlayerTrophies(p.trophies);
    }
  },[phase]);

  const showChat=(msg,playerIdx,dur=2500)=>{
    const sides=['top','left','top','right'];
    setChatMsg({message:msg,playerIdx,side:sides[playerIdx%4]});
    setTimeout(()=>setChatMsg(null),dur);
  };

  const startGame=useCallback(()=>{
    const h=deal(N);const starter=aceSpadesIdx(h);
    setDealHands({hands:h,starter});setPhase('dealing');getCtx();
  },[]);

  const onDealComplete=useCallback(()=>{
    if(!dealHands)return;
    const{hands:h,starter}=dealHands;
    setHands(h);setEliminated([]);setWinnersOrder([]);setTrick([]);
    setLedSuit(null);setLeader(starter);setTurn(starter);setFirstRound(true);
    setPendingThullaBy(null);setRevealed(false);setResultData(null);setRequestFrom(null);
    setDealHands(null);
    if(isBot[starter])setPhase('botThinking');else setPhase('pass');
  },[dealHands,isBot]);

  const startAIGame=()=>{
    const bNames=shuffle(['Sheru','Bablu','Don','Raja','Falcon','Tiger','Ninja','Phantom']);
    const bAv=shuffle(['🤖','🦾','🧠','🎯','🥷','🦊','💀','🐺']);
    setNames(n=>[n[0]||'You',bNames[0],bNames[1],bNames[2]]);
    setAvatars(a=>[a[0],bAv[0],bAv[1],bAv[2]]);
    setIsBot([false,true,true,true]);setGameMode('ai');
  };
  const startLocalGame=()=>{setIsBot([false,false,false,false]);setGameMode('local');};
  const reveal=()=>{setRevealed(true);setPhase('play');};

  useEffect(()=>{
    if(phase!=='botThinking'||!isBot[turn]||eliminated.includes(turn))return;
    const thinkMs=botDifficulty==='easy'?600:botDifficulty==='medium'?900:1200;
    const timer=setTimeout(()=>{
      const canReq=trick.length===0&&pendingThullaBy!=null&&pendingThullaBy!==turn&&!eliminated.includes(pendingThullaBy);
      if(canReq){
        const acc=botDecideRequest(botDifficulty,hands[turn]?.length??0);
        if(acc&&Math.random()<0.25){
          const msg=getBotChat('requestReceived',botDifficulty);if(msg)showChat(msg,turn);
          setTimeout(()=>doExecuteRequest(turn,pendingThullaBy),900);return;
        }
      }
      const res=botPickCard(hands[turn],trick,ledSuit,firstRound,botDifficulty);
      doExecutePlay(res.idx,res.isAceThulla);
    },thinkMs+Math.random()*400);
    return()=>clearTimeout(timer);
  },[phase,turn,isBot,eliminated,hands,trick,ledSuit,firstRound,botDifficulty,pendingThullaBy]);

  const doExecuteRequest=(requester,target)=>{
    const targetHand=hands[target];
    const newHands=hands.map((h,i)=>i===target?[]:i===requester?sortHand([...h,...targetHand]):h);
    const newElim=[...eliminated,target];const newWO=[...winnersOrder,target];
    setTimeout(playWinSnd,100);
    setHands(newHands);setEliminated(newElim);setWinnersOrder(newWO);
    setPendingThullaBy(null);setRevealed(false);setRequestFrom(null);
    setResultData({type:'request',requester,target,cardsTaken:targetHand.length,newWinners:[target]});
    setPhase(N-newElim.length<=1?'gameOver':'result');
  };

  const doExecutePlay=(cardIdx,isAceTh=false)=>{
    const card=hands[turn][cardIdx];
    const newHand=hands[turn].filter((_,i)=>i!==cardIdx);
    const newHands=hands.map((h,i)=>i===turn?newHand:h);
    const isLead=trick.length===0;let newLedSuit=ledSuit;let isThullaPlay=false;
    if(isLead){newLedSuit=card.suit;}
    else{const hadLed=hands[turn].some(c=>c.suit===ledSuit);if(!hadLed&&card.suit!==ledSuit)isThullaPlay=true;}
    const newTrick=[...trick,{player:turn,card,isThulla:isThullaPlay}];
    if(isThullaPlay){
      const isRealAce=card.rank==='A';
      setIsAceThulla(isRealAce);setShowHandSlam(true);
      if(isRealAce)playAceFlash();else playSlam();
      setShake(true);setTimeout(()=>{setShake(false);setShowHandSlam(false);setIsAceThulla(false);},1900);
      const senior=findSenior(newTrick,newLedSuit);
      const cardsToPickup=newTrick.map(t=>t.card);
      const handsAfter=newHands.map((h,i)=>i===senior?sortHand([...h,...cardsToPickup]):h);
      const newElim=[...eliminated];const newWO=[...winnersOrder];
      for(let i=0;i<N;i++)if(!newElim.includes(i)&&handsAfter[i].length===0){newElim.push(i);newWO.push(i);}
      if(newWO.length>winnersOrder.length)setTimeout(playWinSnd,600);
      if(isBot[turn]){const msg=getBotChat(isRealAce?'aceThulla':'thullaGiven',botDifficulty);if(msg)showChat(msg,turn);}
      if(isBot[senior])setTimeout(()=>{const msg=getBotChat('thullaReceived',botDifficulty);if(msg)showChat(msg,senior,2000);},1500);
      setHands(handsAfter);setEliminated(newElim);setWinnersOrder(newWO);
      setTrick([]);setLedSuit(null);setFirstRound(false);
      setPendingThullaBy(turn);setLeader(senior);setTurn(senior);setRevealed(false);
      setResultData({type:'thulla',senior,thullaBy:turn,thullaCard:card,ledSuit:newLedSuit,cards:cardsToPickup,newWinners:newWO.slice(winnersOrder.length),isAce:isRealAce});
      setPhase(N-newElim.length<=1?'gameOver':'result');return;
    }
    playCardSnd();const activeCount=N-eliminated.length;
    if(newTrick.length>=activeCount){
      playFlush();
      const senior=findSenior(newTrick,newLedSuit);
      const newElim=[...eliminated];const newWO=[...winnersOrder];
      for(let i=0;i<N;i++)if(!newElim.includes(i)&&newHands[i].length===0){newElim.push(i);newWO.push(i);}
      if(newWO.length>winnersOrder.length)setTimeout(playWinSnd,300);
      let actualLeader=senior;
      if(newElim.includes(senior)&&N-newElim.length>1)actualLeader=nextActive(senior,newElim,N);
      if(isBot[senior]){const msg=getBotChat('roundWon',botDifficulty);if(msg)showChat(msg,senior);}
      setHands(newHands);setEliminated(newElim);setWinnersOrder(newWO);
      setTrick([]);setLedSuit(null);setFirstRound(false);setPendingThullaBy(null);
      setLeader(actualLeader);setTurn(actualLeader);setRevealed(false);
      setResultData({type:'flush',senior,actualLeader,ledSuit:newLedSuit,cards:newTrick.map(t=>t.card),newWinners:newWO.slice(winnersOrder.length)});
      setPhase(N-newElim.length<=1?'gameOver':'result');return;
    }
    const next=nextActive(turn,eliminated,N);
    setHands(newHands);setLedSuit(newLedSuit);setTrick(newTrick);
    setTurn(next);setRevealed(false);
    if(isBot[next])setPhase('botThinking');else setPhase('pass');
  };

  const playCard=cardIdx=>doExecutePlay(cardIdx);
  const initiateRequest=()=>{
    if(pendingThullaBy==null||eliminated.includes(pendingThullaBy))return;
    if(isBot[pendingThullaBy]){
      const accept=botDecideRequest(botDifficulty,hands[pendingThullaBy]?.length??0);
      const msg=getBotChat('requestReceived',botDifficulty);if(msg)showChat(msg,pendingThullaBy);
      setTimeout(()=>{if(accept)doExecuteRequest(turn,pendingThullaBy);else{setPendingThullaBy(null);setRequestFrom(null);setResultData({type:'refusal',requester:turn,target:pendingThullaBy});setPhase('result');}},1400);return;
    }
    setRequestFrom(turn);setRevealed(false);setPhase('requestPass');
  };
  const acceptRequest=()=>{if(pendingThullaBy!=null&&requestFrom!=null)doExecuteRequest(requestFrom,pendingThullaBy);};
  const refuseRequest=()=>{const target=pendingThullaBy;setPendingThullaBy(null);setRequestFrom(null);setRevealed(false);setResultData({type:'refusal',requester:requestFrom,target});setPhase('result');};
  const continueAfterResult=()=>{setResultData(null);if(isBot[turn]&&!eliminated.includes(turn))setPhase('botThinking');else setPhase('pass');};

  const validPlays=(()=>{
    if(!revealed||phase!=='play')return new Set();
    const hand=hands[turn]||[];const isLead=trick.length===0;const valid=new Set();
    if(isLead){if(firstRound){const idx=hand.findIndex(c=>c.rank==='A'&&c.suit==='♠');if(idx>=0)valid.add(idx);}else for(let i=0;i<hand.length;i++)valid.add(i);}
    else{const hasLed=hand.some(c=>c.suit===ledSuit);for(let i=0;i<hand.length;i++){if(hasLed){if(hand[i].suit===ledSuit)valid.add(i);}else valid.add(i);}}
    return valid;
  })();

  const canRequest=phase==='play'&&trick.length===0&&pendingThullaBy!=null&&pendingThullaBy!==turn&&!eliminated.includes(pendingThullaBy);
  const displayName=i=>names[i]?.trim()||`Player ${i+1}`;
  const themeVars=THEMES[theme].vars;
  const setName=(i,v)=>setNames(n=>n.map((x,j)=>j===i?v.slice(0,14):x));
  const pickAvatar=av=>{if(showAvatarPicker==null)return;setAvatars(a=>{const s=a.indexOf(av);const next=[...a];if(s>=0&&s!==showAvatarPicker)next[s]=next[showAvatarPicker];next[showAvatarPicker]=av;return next;});setShowAvatarPicker(null);};
  const randomizeNames=()=>{const fun=shuffle(['Tiger','Sheru','Bablu','Champ','Boss','Don','Raja','Ninja','Smasher','Falcon','Phantom','Ace']);setNames([fun[0],fun[1],fun[2],fun[3]]);};
  const playerName=names[0].trim()||'You';

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Cormorant+Garamond:wght@500;700&family=Audiowide&family=Manrope:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}
        .thulla-bg{background:var(--bg-overlay),var(--bg-radial);font-family:var(--body-font);color:var(--text);min-height:100vh;transition:background .4s;overflow-x:hidden;}
        .display{font-family:var(--display-font);letter-spacing:.02em;}
        .gold{color:var(--accent);}
        .muted{color:var(--text-muted);}
        .success{color:var(--success);}
        .panel{background:var(--panel-bg);backdrop-filter:blur(10px);border:1px solid var(--panel-border);border-radius:12px;}
        .btn-primary{background:linear-gradient(180deg,var(--accent) 0%,var(--accent-deep) 100%);color:var(--accent-text);font-weight:800;padding:14px 22px;border-radius:10px;border:1px solid var(--accent-deep);box-shadow:0 2px 14px rgba(0,0,0,.4),var(--accent-glow),inset 0 1px 0 rgba(255,255,255,.35);cursor:pointer;transition:transform .12s,box-shadow .12s;font-family:var(--body-font);font-size:15px;touch-action:manipulation;width:100%;}
        .btn-primary:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.5),var(--accent-glow);}
        .btn-primary:active{transform:translateY(0) scale(.97);}
        .btn-primary:disabled{opacity:.5;cursor:not-allowed;}
        .btn-ghost{background:transparent;color:var(--accent);font-weight:600;padding:11px 16px;border-radius:10px;border:1px solid var(--panel-border);cursor:pointer;font-family:var(--body-font);font-size:14px;transition:background .18s;touch-action:manipulation;}
        .btn-ghost:hover{background:var(--panel-bg);}
        .btn-secondary{background:var(--panel-bg);color:var(--accent);font-weight:600;padding:6px 12px;border-radius:8px;border:1px solid var(--panel-border);cursor:pointer;font-size:12px;touch-action:manipulation;}
        .btn-danger{background:linear-gradient(180deg,var(--danger) 0%,#8b1c20 100%);color:#fff;font-weight:700;padding:12px 16px;border-radius:10px;border:1px solid #5e1417;cursor:pointer;width:100%;font-size:14px;touch-action:manipulation;}
        .input-field{background:rgba(0,0,0,.25);color:var(--text);border:1px solid var(--panel-border);border-radius:8px;padding:10px 12px;outline:none;width:100%;font-family:var(--body-font);font-size:14px;}
        .input-field:focus{border-color:var(--accent);}
        .avatar-bubble{width:44px;height:44px;border-radius:50%;background:var(--panel-bg);border:2px solid var(--accent);display:flex;align-items:center;justify-content:center;font-size:24px;cursor:pointer;flex-shrink:0;box-shadow:var(--accent-glow);}
        .pillbar{background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:999px;padding:3px;display:inline-flex;gap:3px;}
        .pillbar button{background:transparent;border:none;padding:6px 12px;border-radius:999px;color:var(--text-muted);font-weight:600;font-size:12px;cursor:pointer;font-family:var(--body-font);}
        .pillbar button.active{background:var(--accent);color:var(--accent-text);}
        input[type="range"].vol{-webkit-appearance:none;width:100%;height:5px;border-radius:3px;background:var(--panel-bg);border:1px solid var(--panel-border);outline:none;}
        input[type="range"].vol::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--accent);cursor:pointer;}
        .tc-btn{transition:transform .12s;cursor:default;position:relative;outline:none;border-radius:8px;}
        .tc-btn.playable{cursor:pointer;}
        .tc-btn.playable:hover{transform:translateY(-14px);z-index:999!important;box-shadow:0 8px 24px rgba(0,0,0,.6),0 0 0 2px var(--accent)!important;}
        .tc-btn.playable:active{transform:translateY(-14px) scale(1.04);}
        .tc-btn.dim{opacity:.35;}
        /* MODE TILES */
        .mode-tile{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;border:1px solid var(--panel-border);background:var(--panel-bg);color:var(--text);cursor:pointer;font-family:var(--body-font);transition:transform .12s,box-shadow .12s;touch-action:manipulation;width:100%;}
        .mode-tile:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.4);}
        .mode-tile:active{transform:scale(.97);}
        .sub-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 8px;border-radius:12px;border:1px solid var(--panel-border);background:var(--panel-bg);color:var(--text);cursor:pointer;font-size:20px;font-family:var(--body-font);transition:transform .12s;touch-action:manipulation;}
        .sub-tile:hover{transform:translateY(-2px);}
        .pill-soon{background:var(--accent);color:var(--accent-text);font-size:9px;font-weight:800;padding:2px 6px;border-radius:999px;letter-spacing:.05em;white-space:nowrap;}
        /* FELT TABLE */
        .felt-table{background:var(--felt);border-radius:16px;border:2px solid rgba(255,255,255,.08);box-shadow:inset 0 2px 12px rgba(0,0,0,.5),0 4px 16px rgba(0,0,0,.4);}
        .leader-glow{box-shadow:0 0 0 2px var(--accent),0 0 12px var(--accent-glow)!important;}
        /* FLOATING CARDS (menu bg) */
        .float-card{position:fixed;bottom:-120px;pointer-events:none;z-index:1;animation:floatUp linear infinite;opacity:.12;}
        @keyframes floatUp{0%{transform:translateY(0) rotate(-10deg);}100%{transform:translateY(-110vh) rotate(20deg);}}
        /* LOGO */
        @keyframes logoSlam{0%{transform:scale(1);}10%{transform:scale(1.06);}20%{transform:scale(.98);}100%{transform:scale(1);}}
        .logo-slam{animation:logoSlam 3s ease-in-out infinite;}
        /* ANIMATIONS */
        @keyframes slideIn{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}
        .slide-in{animation:slideIn .3s ease-out;}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .fade-in{animation:fadeIn .28s ease-out;}
        @keyframes pulseGold{0%,100%{box-shadow:0 0 0 0 var(--accent),0 2px 14px rgba(0,0,0,.4)}50%{box-shadow:0 0 0 12px transparent,0 2px 14px rgba(0,0,0,.4)}}
        .pulse{animation:pulseGold 2s infinite;}
        @keyframes shake{0%,100%{transform:translate(0)}10%{transform:translate(-8px,2px)}20%{transform:translate(8px,-2px)}30%{transform:translate(-6px,2px)}40%{transform:translate(6px,-1px)}50%{transform:translate(-4px)}60%{transform:translate(4px)}70%{transform:translate(-2px)}85%{transform:translate(2px)}}
        .shake{animation:shake .55s;}
        @keyframes redFlash{0%{opacity:0}20%{opacity:.6}100%{opacity:0}}
        .red-flash{position:fixed;inset:0;pointer-events:none;z-index:100;background:radial-gradient(circle at center,var(--danger) 0%,transparent 65%);animation:redFlash .65s ease-out;}
        @keyframes slamCard{0%{transform:translateY(-280px) scale(2.4) rotate(-22deg);opacity:0}40%{transform:translateY(12px) scale(1.6) rotate(6deg);opacity:1}55%{transform:translateY(-6px) scale(1.25) rotate(-3deg)}75%{transform:translateY(2px) scale(1.05) rotate(1deg)}100%{transform:translateY(0) scale(1) rotate(0)}}
        .slam-anim{animation:slamCard .7s cubic-bezier(.34,1.56,.64,1);}
        /* SHOCKWAVES */
        @keyframes shockwave{0%{width:24px;height:24px;opacity:1;border-width:7px}100%{width:900px;height:900px;opacity:0;border-width:1px}}
        .shockwave{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;border:7px solid var(--danger);animation:shockwave 1s cubic-bezier(.12,.96,.22,1) forwards;}
        .shockwave-2{border-color:var(--accent);animation-delay:.22s;}
        @keyframes crackGroup{0%{transform:scale(0);opacity:0}12%{transform:scale(.25);opacity:1}65%{transform:scale(1);opacity:1}100%{transform:scale(1.08);opacity:0}}
        .crack-group{transform-origin:center;animation:crackGroup 1s ease-out forwards;}
        /* HAND SLAM */
        @keyframes handSlamDown{
          0%{transform:translateY(-140vh) rotate(-14deg);opacity:0;}
          28%{transform:translateY(6vh) rotate(5deg);opacity:1;}
          40%{transform:translateY(-2vh) rotate(-2deg);}
          52%{transform:translateY(1.5vh) rotate(1deg);}
          65%{transform:translateY(-.5vh) rotate(0);}
          100%{transform:translateY(0) rotate(0);}
        }
        .hand-slam-wrapper{position:absolute;top:7%;left:50%;transform:translateX(-50%);z-index:125;animation:handSlamDown 1.2s cubic-bezier(.22,1,.36,1) forwards;}
        /* ACE FLASH */
        .ace-flash{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,#ffd700 0%,rgba(255,215,0,.55) 40%,transparent 70%);animation:aceFlashAnim 1s ease-out forwards;pointer-events:none;}
        .ace-flash-2{animation-delay:.22s;background:radial-gradient(circle,#fff 0%,rgba(255,255,255,.7) 30%,transparent 60%);}
        @keyframes aceFlashAnim{0%{transform:translate(-50%,-50%) scale(0);opacity:1}45%{opacity:.95}100%{transform:translate(-50%,-50%) scale(5.5);opacity:0}}
        @keyframes aceLabel{0%{transform:translate(-50%,-50%) scale(0) rotate(-20deg);opacity:0}45%{transform:translate(-50%,-50%) scale(1.35) rotate(5deg);opacity:1}70%{transform:translate(-50%,-50%) scale(1.1) rotate(-2deg)}100%{transform:translate(-50%,-50%) scale(1.15) rotate(0);opacity:1}}
        /* THULLA TEXT */
        @keyframes thullaMega{0%{transform:scale(0) rotate(-25deg);opacity:0}22%{transform:scale(1.75) rotate(8deg);opacity:1}38%{transform:scale(1.3) rotate(-4deg)}55%{transform:scale(1.08) rotate(2deg)}72%{transform:scale(.97) rotate(-1deg)}100%{transform:scale(1.05) rotate(0);opacity:1}}
        @keyframes thullaWobble{0%,100%{transform:scale(1.05) rotate(0)}30%{transform:scale(1.09) rotate(-1.5deg)}70%{transform:scale(1.09) rotate(1.5deg)}}
        .thulla-mega-text{font-family:var(--display-font);font-weight:900;font-size:clamp(54px,15vw,108px);color:var(--danger);text-shadow:0 0 24px var(--danger),0 0 50px var(--danger),-2px -2px 0 rgba(255,255,255,.3),2px 2px 0 rgba(0,0,0,.6),0 8px 20px rgba(0,0,0,.8);letter-spacing:.06em;line-height:1;animation:thullaMega .9s cubic-bezier(.34,1.56,.64,1) forwards,thullaWobble 1.4s ease-in-out .9s infinite;}
        /* DEAL */
        .flying-card{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:206;}
        @keyframes flyTo0{0%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1}100%{transform:translate(-50%,40vh) scale(.65) rotate(180deg);opacity:.7}}
        .fly-to-0{animation:flyTo0 .5s cubic-bezier(.4,0,.2,1) forwards;}
        @keyframes flyTo1{0%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1}100%{transform:translate(calc(-50% - 160px),-12vh) scale(.65) rotate(-180deg);opacity:.7}}
        .fly-to-1{animation:flyTo1 .5s cubic-bezier(.4,0,.2,1) forwards;}
        @keyframes flyTo2{0%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1}100%{transform:translate(-50%,-42vh) scale(.65) rotate(360deg);opacity:.7}}
        .fly-to-2{animation:flyTo2 .5s cubic-bezier(.4,0,.2,1) forwards;}
        @keyframes flyTo3{0%{transform:translate(-50%,-50%) scale(1) rotate(0);opacity:1}100%{transform:translate(calc(-50% + 160px),-12vh) scale(.65) rotate(180deg);opacity:.7}}
        .fly-to-3{animation:flyTo3 .5s cubic-bezier(.4,0,.2,1) forwards;}
        /* CONFETTI */
        @keyframes confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
        .confetti-piece{position:absolute;width:9px;height:13px;border-radius:2px;animation:confetti 2.8s ease-in forwards;}
        /* BOT DOTS */
        @keyframes botDots{0%,80%,100%{opacity:.25}40%{opacity:1}}
        .bot-dot{display:inline-block;animation:botDots 1.2s infinite;}
        .bot-dot-inline{width:6px;height:6px;border-radius:50%;background:var(--accent);display:inline-block;animation:botDots 1.2s infinite;}
        .hand-row{padding-top:14px;padding-bottom:8px;}
        .chat-bubble{z-index:91;}
      `}</style>

      <div className={`thulla-bg${shake?' shake':''}`} style={themeVars}>
        {phase==='menu'&&<MainMenu theme={theme} setTheme={setTheme} onPlayLocal={()=>{startLocalGame();setPhase('nameEntry');}} onPlayAI={()=>{startAIGame();setPhase('aiSetup');}} onShowRules={()=>setShowRules(true)} onShowSettings={()=>setShowSettings(true)} onCosmetics={()=>setPhase('cosmetics')} onLeaderboard={()=>setPhase('leaderboard')} coins={playerCoins} trophies={playerTrophies} playerName={playerName} onShowAuth={()=>setShowAuth(true)} currentUser={authedUser} onSignOut={async()=>{await signOut();setAuthedUser(null);}}/>}
        {phase==='aiSetup'&&<AISetup difficulty={botDifficulty} setDifficulty={setBotDifficulty} names={names} avatars={avatars} setName={setName} onPickAvatar={i=>setShowAvatarPicker(i)} onBack={()=>setPhase('menu')} onStart={startGame}/>}
        {phase==='nameEntry'&&<NameEntry names={names} avatars={avatars} setName={setName} onPickAvatar={i=>setShowAvatarPicker(i)} onRandomize={randomizeNames} onBack={()=>setPhase('menu')} onStart={startGame}/>}
        {phase==='dealing'&&<DealAnimation names={names.map((n,i)=>n.trim()||`Player ${i+1}`)} avatars={avatars} onComplete={onDealComplete}/>}
        {phase==='botThinking'&&<BotThinking turn={turn} displayName={displayName} avatars={avatars} hands={hands} trick={trick} ledSuit={ledSuit} eliminated={eliminated} leader={leader} isBot={isBot} setShowSettings={setShowSettings} setShowRules={setShowRules} onBackToMenu={()=>setPhase('menu')}/>}
        {(phase==='pass'||phase==='play')&&<GameView hands={hands} turn={turn} leader={leader} trick={trick} ledSuit={ledSuit} firstRound={firstRound} eliminated={eliminated} phase={phase} revealed={revealed} reveal={reveal} playCard={playCard} validPlays={validPlays} canRequest={canRequest} pendingThullaBy={pendingThullaBy} initiateRequest={initiateRequest} setShowRules={setShowRules} setShowSettings={setShowSettings} displayName={displayName} avatars={avatars} isBot={isBot} onBackToMenu={()=>setPhase('menu')}/>}
        {phase==='requestPass'&&<RequestPass target={pendingThullaBy} requester={requestFrom} displayName={displayName} avatars={avatars} onReveal={()=>{setRevealed(true);setPhase('requestDecide');}}/>}
        {phase==='requestDecide'&&<RequestDecide target={pendingThullaBy} requester={requestFrom} myCards={hands[pendingThullaBy]?.length??0} displayName={displayName} avatars={avatars} onAccept={acceptRequest} onRefuse={refuseRequest}/>}
        {phase==='result'&&resultData&&<ResultView data={resultData} onContinue={continueAfterResult} displayName={displayName} avatars={avatars}/>}
        {phase==='gameOver'&&<GameOverView winnersOrder={winnersOrder} eliminated={eliminated} hands={hands} displayName={displayName} avatars={avatars} onPlayAgain={startGame} onMenu={()=>setPhase('menu')} playerIdx={gameMode==='ai'?0:null} playerName={gameMode==='ai'?playerName:null}/>}
        {phase==='cosmetics'&&<CosmeticsScreen onBack={()=>setPhase('menu')} coins={playerCoins}/>}
        {phase==='leaderboard'&&<LeaderboardScreen onBack={()=>setPhase('menu')} playerName={playerName}/>}

        {showHandSlam&&<HandSlam isAce={isAceThulla}/>}
        {showHandSlam&&<div className="red-flash"/>}
        {chatMsg&&<ChatBubble {...chatMsg} avatars={avatars}/>}
        {showRules&&<RulesModal onClose={()=>setShowRules(false)}/>}
        {showSettings&&<SettingsModal sfx={sfx} setSfx={v=>{setSfxState(v);setSfxVol(v);}} music={music} setMusic={v=>{setMusicState(v);setMusicVol(v);}} musicOn={musicOn} setMusicOn={setMusicOn} theme={theme} setTheme={setTheme} onClose={()=>setShowSettings(false)}/>}
        {showAvatarPicker!==null&&<AvatarPicker current={avatars[showAvatarPicker]} onPick={pickAvatar} onClose={()=>setShowAvatarPicker(null)}/>}
        {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onSignedIn={user=>{setAuthedUser(user);setShowAuth(false);}}/>}
      </div>
    </>
  );
}
