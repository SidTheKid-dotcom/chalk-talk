import os, math
import os; ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P=ROOT+"/pages"
NUM={"curry":30,"klay":11,"green":23,"iguodala":9,"barnes":40,"livingston":34,"ezeli":31,
     "james":23,"irving":2,"love":0,"smith":5,"tthompson":13}
NAME={"curry":"Curry","klay":"Thompson","green":"Green","iguodala":"Iguodala","barnes":"Barnes",
      "james":"James","irving":"Irving","love":"Love","smith":"Smith","tthompson":"T. Thompson"}
GSW={"curry","klay","green","iguodala","barnes","livingston","ezeli"}

def mic(live=True):
    c="#0B0B0C" if live else "#B9B4AA"
    return f'''<div class="mic {'live' if live else ''}"><svg viewBox="0 0 24 24" fill="none" stroke="{c}" stroke-width="2.2" stroke-linecap="round"><rect x="8.5" y="3" width="7" height="12" rx="3.5" fill="{c}"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></div>'''

def bars(hs=(6,12,18,10,14,7,16)):
    return '<span class="bars">'+''.join(f'<i style="height:{h}px"></i>' for h in hs)+'</span>'

def head(title):
    return f'''<!doctype html><html><head><meta charset="utf-8"><title>{title}</title>
<link rel="stylesheet" href="../src/tokens.css"></head><body>'''

def scoreboard(n, clock="24"):
    return f'''<header class="sb">
  <div class="brand"><i></i>Chalk Talk</div>
  <div class="team gsw"><span class="chip"></span>GSW <span class="led wins" data-off="8">3</span></div>
  <div class="mid">
    <div class="stack"><span class="lab">Series</span><span class="led" style="font-size:22px" data-off="8-8">3-3</span></div>
    <div class="stack"><span class="lab">Finals</span><span class="g7">Game 7</span></div>
  </div>
  <div class="team cle"><span class="led wins" data-off="8">3</span> CLE<span class="chip"></span></div>
  <div class="sp"></div>
  <div class="slideno">Slide <span class="led" style="font-size:20px;color:var(--ink)" data-off="8">{n}</span> / 6</div>
  <div class="clock"><span class="lab">Shot clock</span><span class="led red" data-off="88">{clock}</span></div>
</header>'''

def rail(n, state="speaking", extra="Film session", meta=None):
    pill = (f'<div class="pill speaking"><span class="dot"></span>Coach AI speaking {bars()}</div>' if state=="speaking"
            else '<div class="pill listening"><span class="dot"></span>Listening</div>')
    meta = meta or "Say \u201cget me the head coach\u201d any time"
    return f'''<footer class="rail">{pill}
  <div class="ticker"><span class="led">GAME!7</span><span class="sq"></span><span class="led">{extra.upper().replace(" ","!")}</span><span class="sq"></span><span class="led">{n}/6</span><span class="meta">{meta}</span></div>
  {mic(True)}</footer>'''

def l3(key, full, team, sub):
    t="gsw" if team=="gsw" else "cle"
    return f'<div class="l3 {t}"><div class="num">{NUM[key]}</div><div class="nm"><b>{full}</b><s>{sub}</s></div></div>'

def cutout(file, x, y, h, key, full, team, sub, plate_dx=0):
    return f'''<div class="cut" style="left:{x}px;top:{y}px;height:{h}px"><img src="../assets/cutouts/{file}.png">
<div style="position:absolute;left:{plate_dx}px;bottom:-8px">{l3(key,full,team,sub)}</div></div>'''

# ---------------- court (feet; basket at top) ----------------
SC=15.2
def court(x,y,content="",zones="", paint=True):
    W,H=50,47
    lane = f'<rect x="17" y="0" width="16" height="19" fill="#1D428A" fill-opacity=".88"/>' if paint else ''
    s=f'''<div class="court" style="left:{x}px;top:{y}px"><svg width="{W*SC:.0f}" height="{H*SC:.0f}" viewBox="0 0 {W} {H}">
<defs><marker id="ah" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#FFC72C"/></marker>
<marker id="aw" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4.2" markerHeight="4.2" orient="auto"><path d="M0 0L10 5L0 10z" fill="#fff"/></marker></defs>
{lane}{zones}
<g fill="none" stroke="#fff" stroke-width=".17" stroke-opacity=".95">
<rect x="0" y="0" width="50" height="47"/>
<rect x="17" y="0" width="16" height="19"/>
<path d="M19 19a6 6 0 0 0 12 0"/><path d="M19 19a6 6 0 0 1 12 0" stroke-dasharray=".9 .7"/>
<path d="M3 0V14M47 0V14"/><path d="M3 14A23.75 23.75 0 0 0 47 14"/>
<path d="M21 5.25a4 4 0 0 0 8 0"/>
<path d="M22 4h6" stroke-width=".25"/>
<path d="M17 7h-.8M17 8h-.8M17 11h-.8M17 14h-.8M33 7h.8M33 8h.8M33 11h.8M33 14h.8"/>
<path d="M19 47a6 6 0 0 1 12 0" stroke="#FFC72C"/><path d="M23 47a2 2 0 0 1 4 0" stroke="#FFC72C"/>
</g><circle cx="25" cy="5.25" r=".75" fill="none" stroke="#FF7A1A" stroke-width=".2"/>
{content}</svg></div>'''
    return s

def mk(key,x,y,ball=False,ghost=False,label=True,lbl_dy=2.9):
    g=key in GSW; op=' opacity=".35"' if ghost else ''
    if g: circ=f'<circle cx="{x}" cy="{y}" r="1.55" fill="#1D428A" stroke="#fff" stroke-width=".14"/>'
    else: circ=f'<circle cx="{x}" cy="{y}" r="1.45" fill="#0B0B0C" stroke="#C0144F" stroke-width=".38"/>'
    if ghost: circ=circ.replace('stroke-width=','stroke-dasharray=".4 .3" stroke-width=')
    b=f'<circle cx="{x}" cy="{y}" r="2.15" fill="none" stroke="#FF7A1A" stroke-width=".26"/>' if ball else ''
    t=f'<text x="{x}" y="{y+0.48}" text-anchor="middle" font-family="Inter" font-weight="800" font-size="1.35" fill="#fff">{NUM[key]}</text>'
    lb=(f'<text x="{x}" y="{y+lbl_dy}" text-anchor="middle" font-family="Plex Cond" font-weight="700" font-size=".95" letter-spacing=".06" fill="#fff" stroke="#0B0B0C" stroke-opacity=".7" stroke-width=".28" paint-order="stroke">{NAME.get(key,key).upper()}</text>' if label and not ghost else '')
    return f'<g{op}>{b}{circ}{t}</g>{lb}'

def dp(ox,oy,d=3.1):
    bx,by=25,5.25; L=math.hypot(bx-ox,by-oy); return round(ox+(bx-ox)/L*d,2), round(oy+(by-oy)/L*d,2)
def guard(gkey,ckey,ox,oy,d=3.1,**kw):
    x,y=dp(ox,oy,d); return mk(gkey,x,y,label=False)
def cut_path(d, ghost=False, end=True):
    return f'<path d="{d}" fill="none" stroke="#FFC72C" stroke-width=".3" stroke-dasharray=".9 .55" stroke-linecap="round" {"marker-end=\"url(#ah)\"" if end else ""} {"opacity=\".45\"" if ghost else ""}/>'
def pass_path(d):
    return f'<path d="{d}" fill="none" stroke="#fff" stroke-width=".22" stroke-dasharray=".08 .45" stroke-linecap="round" marker-end="url(#aw)"/>'
def screen(x,y,ang):
    a=math.radians(ang); dx,dy=math.cos(a)*1.3,math.sin(a)*1.3
    return f'<line x1="{x-dx:.2f}" y1="{y-dy:.2f}" x2="{x+dx:.2f}" y2="{y+dy:.2f}" stroke="#fff" stroke-width=".42" stroke-linecap="square"/>'
def swipe(x,y,w=8,h=3.4,rot=-4):
    return f'<rect x="{x-w/2}" y="{y-h/2}" width="{w}" height="{h}" rx=".5" fill="#FFC72C" fill-opacity=".78" transform="rotate({rot} {x} {y})"/>'

LEGEND='''<div class="legend" style="{pos}">
<span><svg width="44" height="10"><path d="M2 5H34" stroke="#FFC72C" stroke-width="3" stroke-dasharray="8 5"/><path d="M34 0L44 5L34 10z" fill="#FFC72C"/></svg>Cut</span>
<span><svg width="44" height="10"><path d="M2 5H34" stroke="#fff" stroke-width="2.4" stroke-dasharray="1 5" stroke-linecap="round"/><path d="M34 0L44 5L34 10z" fill="#fff"/></svg>Pass</span>
<span><svg width="10" height="20"><path d="M5 1V19" stroke="#fff" stroke-width="5"/></svg>Screen</span>
<span><svg width="20" height="20"><circle cx="10" cy="10" r="8" fill="#1D428A" stroke="#fff" stroke-width="1.5"/></svg>GSW</span>
<span><svg width="20" height="20"><circle cx="10" cy="10" r="7.5" fill="#0B0B0C" stroke="#C0144F" stroke-width="4"/></svg>CLE</span>
<span><svg width="22" height="22"><circle cx="11" cy="11" r="9.5" fill="none" stroke="#FF7A1A" stroke-width="2.4"/></svg>Ball</span></div>'''

def page(name, body, title):
    open(f"{P}/{name}.html","w").write(head(title)+body+"</body></html>")

CX,CY=1064,128  # court origin
LEG=f"left:{CX}px;top:{CY+int(47*SC)+24}px"

# ---------------- SLIDE 1 ----------------
pips=''.join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><span class="lab">G{i+1}</span><span style="width:48px;height:32px;display:flex;align-items:center;justify-content:center;font:400 24px/1 var(--f-title);background:{"var(--gsw)" if r=="W" else "transparent"};box-shadow:inset 0 0 0 2px {"var(--gsw)" if r=="W" else "#4a4a4e"};color:{"#fff" if r=="W" else "var(--ink-2)"}">{r}</span></div>' for i,r in enumerate("WWLWLL"))
pips+='<div style="display:flex;flex-direction:column;align-items:center;gap:8px"><span class="lab" style="color:var(--gold)">G7</span><span style="width:48px;height:32px;display:flex;align-items:center;justify-content:center;font:400 24px/1 var(--f-title);box-shadow:inset 0 0 0 2px var(--gold);color:var(--gold)">?</span></div>'
s1=f'''<div class="floor vignette"></div>
<svg style="position:absolute;left:0;top:0" width="1920" height="1080"><g fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="3">
<line x1="1440" y1="64" x2="1440" y2="1016"/><circle cx="1440" cy="540" r="182"/></g>
<circle cx="1440" cy="540" r="60" fill="none" stroke="#FFC72C" stroke-width="3"/></svg>
{scoreboard(1)}
<div class="kicker"><b>Film session</b>Night before Game 7 · June 18, 2016</div>
<h1 class="t" style="font-size:168px">One game<br>for it all.</h1>
<div style="position:absolute;left:96px;top:464px;font:400 24px/1.4 var(--f-body);color:var(--ink);max-width:760px">Series tied 3-3. Game 7 is at home, at Oracle Arena. Three keys tonight. Ask about any of them and I\u2019ll take you there.</div>
<div class="card" style="left:96px;top:584px;width:808px;height:384px">
 <div class="hd"><span>Three keys</span><span class="tag">Ask me anything</span></div>
 <div class="rows">
  <div class="row"><span class="n">01</span><div><h3>Make LeBron give it up</h3><p>Blitz his pick-and-roll. Make someone else beat us. <span style="color:var(--ink-3)">· Slide 2</span></p></div></div>
  <div class="row"><span class="n">02</span><div><h3>Stay in front of Kyrie</h3><p>Switch the screen, keep help home on shooters. <span style="color:var(--ink-3)">· Slide 3</span></p></div></div>
  <div class="row"><span class="n">03</span><div><h3>Move it, and let Draymond make plays</h3><p>Steph and Klay off screens, Dray on the short roll. <span style="color:var(--ink-3)">· Slide 4</span></p></div></div>
 </div></div>
<div style="position:absolute;left:1200px;top:112px;display:flex;gap:16px;align-items:flex-end;background:var(--card);border:1px solid var(--card-line);border-radius:4px;padding:16px 24px">
 <div style="display:flex;flex-direction:column;gap:8px;margin-right:8px"><span class="lab">Road to 7</span><span style="font:600 15px/1 var(--f-body);color:var(--ink-2)">GSW result</span></div>{pips}</div>
<div class="cut" style="left:1000px;top:576px;height:440px"><img src="../assets/cutouts/klay-thompson.png"></div>
<div class="cut" style="left:1488px;top:576px;height:440px"><img src="../assets/cutouts/draymond-green.png"></div>
<div class="cut" style="left:1240px;top:456px;height:560px"><img src="../assets/cutouts/stephen-curry.png"></div>
<div style="position:absolute;left:1000px;top:952px">{l3("klay","Klay Thompson","gsw","Guard")}</div>
<div style="position:absolute;left:1296px;top:952px">{l3("curry","Stephen Curry","gsw","Guard")}</div>
<div style="position:absolute;left:1572px;top:952px">{l3("green","Draymond Green","gsw","Forward")}</div>
{rail(1,"speaking","Film session")}'''
page("slide-1",s1,"Slide 1")

# ---------------- SLIDE 2 ----------------
c2=(mk("tthompson",31.6,27.6,lbl_dy=-2.3)+screen(30,29.1,45)
   +mk("james",25,32.2,ball=True,lbl_dy=4.3)
   +mk("iguodala",21.6,31,label=False)
   +mk("green",36.4,21.6,ghost=True)+cut_path("M36.6 23.3 Q36 31.5 30.6 32.6")
   +mk("green",28.4,32.6,label=False)
   +mk("irving",6.5,22.5)+guard("klay","irving",6.5,22.5)
   +mk("smith",46.2,3.6)+guard("curry","smith",46.2,3.6,3.3)
   +mk("love",3.8,6.5)+mk("barnes",9.5,10.2,ghost=True)+cut_path("M11.2 11.1 Q17 14.5 22 15.6")+mk("barnes",23.6,16)
   +'<text x="25" y="38.6" text-anchor="middle" font-family="Plex Cond" font-weight="700" font-size="1" fill="#FFC72C" letter-spacing=".1">TWO ON THE BALL</text>')
s2=f'''<div class="floor"></div>{scoreboard(2)}
<div class="kicker"><b>Defense</b>Key 01 · Number 23</div>
<h1 class="t">How do we<br>stop LeBron?</h1>
<div class="card" style="left:96px;top:376px;width:808px;height:360px">
 <div class="hd"><span>Coverage</span><span class="tag">Iguodala primary</span></div>
 <div class="rows">
  <div class="row"><span class="n">01</span><div><h3>Blitz the high pick-and-roll</h3><p>Two bodies on the ball the moment the screen comes.</p></div></div>
  <div class="row"><span class="n">02</span><div><h3>Back line tags the roller</h3><p>Weak side rotates up. Nobody stays at the rim alone.</p></div></div>
  <div class="row"><span class="n">03</span><div><h3>Make someone else beat us</h3><p>Live with a contested jumper. Never give him the lane.</p></div></div>
 </div></div>
{cutout("lebron-james",96,744,232,"james","LeBron James","cle","Forward · CLE",0).replace('<img','<img style="opacity:.98"')}
<div class="stepcap" style="left:520px;top:808px;width:384px"><span class="lab">run_play · Step 2 of 4</span>Green leaves the screener and jumps the ball.</div>
{court(CX,CY,c2)}
<div class="callout" style="left:1112px;top:736px"><small>Coach note</small>Iguodala on LeBron</div>
{LEGEND.format(pos=LEG)}
{rail(2,"speaking","Stop LeBron")}'''
page("slide-2",s2,"Slide 2")

# ---------------- SLIDE 3 ----------------
kx,ky=40.5,24
c3=(swipe(kx+1.6,ky+0.2,7.4,3.6,-5)+mk("irving",kx,ky,ball=True,lbl_dy=4.3)+guard("klay","irving",kx,ky,3.2)
   +mk("tthompson",34.6,30.6)+screen(36.4,29,-45)+guard("green","tthompson",34.6,30.6,3.0)
   +cut_path("M33.9 26.6 Q36 24.5 38.4 22.4", ghost=True)
   +mk("james",7,21.5)+guard("iguodala","james",7,21.5)
   +mk("smith",3.8,3.6)+guard("curry","smith",3.8,3.6,3.3)
   +mk("love",16,30.5)+guard("barnes","love",16,30.5)
   +'<text x="34.6" y="36.4" text-anchor="middle" font-family="Plex Cond" font-weight="700" font-size="1" fill="#FFC72C" letter-spacing=".1">SWITCH THE SCREEN</text>')
s3=f'''<div class="floor"></div>{scoreboard(3)}
<div class="kicker"><b>Defense</b>Key 02 · Their point guard</div>
<h1 class="t">Kyrie in<br>isolation</h1>
<div class="card" style="left:96px;top:376px;width:808px;height:360px">
 <div class="hd"><span>Matchup</span><span class="tag">Klay takes him</span></div>
 <div class="rows">
  <div class="row"><span class="n">01</span><div><h3>Klay takes him on the wing</h3><p>Shade him to his left hand. Chest up, no reaching.</p></div></div>
  <div class="row"><span class="n">02</span><div><h3>Switch everything on the screen</h3><p>The new defender stays in front. No hedge, no chase.</p></div></div>
  <div class="row"><span class="n">03</span><div><h3>Help stays home on the shooters</h3><p>Show a body at the nail, then recover to your man.</p></div></div>
 </div></div>
{cutout("kyrie-irving",96,744,232,"irving","Kyrie Irving","cle","Guard · CLE",0)}
<div class="stepcap" style="left:520px;top:808px;width:384px"><span class="lab">highlight · cle_irving</span>His spot: right wing, ball in his hands.</div>
{court(CX,CY,c3)}
{LEGEND.format(pos=LEG)}
{rail(3,"speaking","Kyrie iso")}'''
page("slide-3",s3,"Slide 3")

# ---------------- SLIDE 4 ----------------
c4=(mk("curry",19.6,5.2,ghost=True)
   +cut_path("M18.4 6.1 C 13 10.5, 9 14.5, 6.6 22.2")
   +mk("green",16,9.6,label=False)+screen(14.6,10.8,40)
   +mk("barnes",11.2,17.2,label=False)+screen(9.7,16.6,15)
   +'<text x="17.6" y="8.9" font-family="Plex Cond" font-weight="700" font-size=".95" fill="#fff" stroke="#0B0B0C" stroke-opacity=".7" stroke-width=".28" paint-order="stroke">GREEN</text>'
   +'<text x="7.6" y="15.2" font-family="Plex Cond" font-weight="700" font-size=".95" fill="#fff" stroke="#0B0B0C" stroke-opacity=".7" stroke-width=".28" paint-order="stroke">BARNES</text>'
   +mk("irving",10.4,13.4,ghost=True)
   +mk("curry",6,24.6)
   +mk("iguodala",25,31.5,ball=True,lbl_dy=4.3)
   +pass_path("M22.6 30.6 Q15 30.5 8.4 25.8")
   +mk("klay",46,4.6)+mk("smith",43.4,6.4,label=False)
   +mk("love",19,11.6,label=False)+mk("james",15.4,20.6,label=False)+mk("tthompson",25,27.8,label=False))
NAME["livingston"]="Livingston"
s4=f'''<div class="floor"></div>{scoreboard(4)}
<div class="kicker"><b>Offense</b>Key 03 · Getting shooters open</div>
<h1 class="t">Our offense</h1>
<div class="card" style="left:96px;top:288px;width:808px;height:352px">
 <div class="hd"><span>Two sets tonight</span><span class="tag">p_steph_stagger · on board</span></div>
 <div class="rows">
  <div class="row"><span class="n">A</span><div><h3>Steph off a staggered screen</h3><p>Starts low, comes off Draymond then Harrison. Catch on the wing: shoot it, or hit the screener slipping.</p></div></div>
  <div class="row"><span class="n">B</span><div><h3>Draymond short roll, four on three</h3><p>They trap Steph, he hits Dray at the high post. Dray reads it: lob, corner, or drive.</p></div></div>
 </div></div>
{cutout("stephen-curry",96,712,264,"curry","Stephen Curry","gsw","Guard",0)}
{cutout("klay-thompson",392,724,252,"klay","Klay Thompson","gsw","Guard",24)}
{cutout("draymond-green",696,724,252,"green","Draymond Green","gsw","Forward",-40)}
{court(CX,CY,c4)}
<div class="stepcap" style="left:1544px;top:704px;width:280px"><span class="lab">run_play · Step 3 of 3</span>Catch on the wing. Shoot it.</div>
{LEGEND.format(pos=LEG)}
{rail(4,"listening","Our offense", "Listening · interrupt any time")}'''
page("slide-4",s4,"Slide 4")

# ---------------- SLIDE 5 ----------------
def xcard(x,n,head_,body,who,file,num_key,full,sub,team="gsw"):
    return f'''<div class="card" style="left:{x}px;top:376px;width:400px;height:592px;padding:0;overflow:hidden">
<div style="height:288px;position:relative;background:linear-gradient(#17171a,#0f0f11);border-bottom:1px solid var(--card-line)">
 <span style="position:absolute;left:24px;top:24px;font:400 64px/1 var(--f-title);color:var(--gold)">{n}</span>
 <img src="../assets/cutouts/{file}.png" style="position:absolute;right:16px;bottom:0;height:264px">
 <div style="position:absolute;left:0;bottom:16px">{l3(num_key,full,team,sub)}</div></div>
<div style="padding:24px 28px"><span class="lab" style="color:var(--gold)">{who}</span><h3 style="font:400 44px/1 var(--f-title);margin:12px 0 12px;letter-spacing:.01em">{head_}</h3><p style="font:400 19px/1.45 var(--f-body);color:var(--ink-2)">{body}</p></div></div>'''
s5=f'''<div class="floor"></div>{scoreboard(5)}
<div class="kicker"><b>Swing factors</b>Depth · Fouls · Pace</div>
<h1 class="t">X-factors</h1>
<div style="position:absolute;left:96px;top:256px;font:400 24px/1.4 var(--f-body);color:var(--ink);max-width:1100px">Four things decide a Game 7 when the stars cancel out. Each one asks something of us.</div>
{xcard(96,"01","Kevin Love","Make him guard. Put him in every pick-and-roll and punish the switch.","Matchup","kevin-love","love","Kevin Love","Forward · CLE","cle")}
{xcard(528,"02","Bench minutes","Shaun runs the second unit. Post-ups on smaller guards, no turnovers.","Depth","shaun-livingston","livingston","Shaun Livingston","Guard")}
{xcard(960,"03","Fouls","Play hands up, chest first. Nobody picks up cheap ones early.","Discipline","festus-ezeli","ezeli","Festus Ezeli","Center")}
<div class="card" style="left:1392px;top:376px;width:432px;height:592px">
 <div class="hd"><span>04 · Pace</span><span class="tag">Push it</span></div>
 <h3 style="font:400 44px/1 var(--f-title);letter-spacing:.01em">Run after every miss</h3>
 <p style="font:400 19px/1.45 var(--f-body);color:var(--ink-2);margin-top:12px">Our game is up and down. Theirs is half court and LeBron walking it up. Make it our game.</p>
 <div style="margin-top:48px"><div style="display:flex;justify-content:space-between" class="lab"><span>Half court</span><span style="color:var(--gold)">Up tempo</span></div>
  <div style="position:relative;height:40px;margin-top:16px;display:grid;grid-template-columns:repeat(10,1fr);gap:4px">{''.join(f'<i style="display:block;background:{"var(--amber)" if i>=6 else "rgba(255,176,0,.12)"}"></i>' for i in range(10))}</div>
  <div style="display:flex;justify-content:space-between;margin-top:12px;font:600 15px/1 var(--f-body);color:var(--ink-3)"><span>Their game</span><span>Our game</span></div></div>
 <div style="position:absolute;left:32px;right:32px;bottom:32px;border-top:1px solid var(--card-line);padding-top:16px;font:400 16px/1.4 var(--f-body);color:var(--ink-3)">No court on this slide. Callouts only.</div>
</div>
{rail(5,"speaking","Swing factors")}'''
page("slide-5",s5,"Slide 5")

# ---------------- SLIDE 6 ----------------
zst='fill="#fff" fill-opacity=".05" stroke="#fff" stroke-opacity=".55" stroke-width=".12" stroke-dasharray=".6 .5"'
zones=(f'<rect x="0.4" y="0.4" width="2.4" height="13.4" {zst}/><rect x="47.2" y="0.4" width="2.4" height="13.4" {zst}/>'
       f'<rect x="19" y="27" width="12" height="7" rx=".4" {zst}/>'
       f'<rect x="0.4" y="0.4" width="2.4" height="13.4" fill="#FFC72C" fill-opacity=".0"/>')
zl=lambda x,y,t,a="middle": f'<text x="{x}" y="{y}" text-anchor="{a}" font-family="Plex Cond" font-weight="700" font-size=".9" letter-spacing=".1" fill="#fff" fill-opacity=".85" stroke="#0B0B0C" stroke-opacity=".6" stroke-width=".25" paint-order="stroke">{t}</text>'
c6=zones+zl(4,16.4,"LEFT CORNER","start")+zl(46,16.4,"RIGHT CORNER","end")+zl(25,36,"TOP OF THE KEY")+zl(25,10,"PAINT")+zl(12,30,"LEFT WING")+zl(38,30,"RIGHT WING")
jr_img=os.path.join(ROOT,"..","..","local-assets","lebron-jr-cutout.png")
jr_ok=os.path.exists(jr_img)
jr_visual=(f'<img src="file://{jr_img}" style="display:block;width:100%;height:332px;object-fit:contain;object-position:center bottom;background:#1a1a1d">' if jr_ok
           else '<div style="height:332px;display:flex;align-items:center;justify-content:center;background:#1a1a1d;font:400 64px/1 var(--f-title);color:var(--ink-3)">2018</div>')
s6=f'''<div class="floor"></div>{scoreboard(6, "24")}
<div class="kicker"><b>Late game</b>Head coach\u2019s call</div>
<h1 class="t">The last<br>two minutes</h1>
<div class="card" style="left:96px;top:376px;width:520px;height:296px">
 <div class="hd"><span>Not my call</span><span class="tag">Head coach</span></div>
 <h3 style="font:600 26px/1.25 var(--f-body)">Late-game plays belong to the head coach.</h3>
 <p style="font:400 19px/1.45 var(--f-body);color:var(--ink-2);margin-top:12px">The board is blank on purpose. Want me to get Coach on the call? He can mark it up live.</p>
 <div style="margin-top:24px;display:inline-flex;align-items:center;gap:12px;height:48px;padding:0 20px;background:var(--gold);color:var(--panel);border-radius:4px;font:700 16px/1 var(--f-label);letter-spacing:.14em;text-transform:uppercase">Call head coach</div>
</div>
<div class="card" style="left:648px;top:376px;width:368px;height:592px;padding:16px;border-color:rgba(255,199,44,.55);transform:rotate(1.5deg)">
 <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 4px 12px" class="lab"><span style="color:var(--gold)">highlight · k_jr_card</span><span>Revealed</span></div>
 {jr_visual}
 <div style="padding:20px 8px 0"><div style="font:700 30px/1.1 var(--f-marker);color:var(--gold);transform:rotate(-2deg)">Know the score and the clock. Don\u2019t be JR.</div>
 <div style="margin-top:20px;font:500 14px/1 var(--f-label);letter-spacing:.14em;color:var(--ink-3);text-transform:uppercase">See: 2018 Finals, Game 1</div></div>
</div>
<div class="stepcap" style="left:96px;top:704px;width:520px"><span class="lab">Agent · one line, once per session</span>\u201cKnow the score and the clock. Don\u2019t be JR.\u201d</div>
{court(CX,CY,c6)}
<div style="position:absolute;left:{CX}px;top:{CY+int(47*SC)+24}px" class="legend"><span>Zones only · no markers · the coach can say \u201cAssistant, highlight the left corner\u201d</span></div>
{rail(6,"speaking","Last two minutes")}'''
page("slide-6",s6,"Slide 6")
print("jr image:",jr_ok)

# ---------------- COACH VIEW ----------------
def tline(t,who,txt,cls=""):
    col={"PLAYER":"var(--ink)","COACH AI":"var(--gold)","COACH":"#8FB3FF"}[who]
    return f'<div style="display:grid;grid-template-columns:56px 88px 1fr;gap:8px;padding:8px 0;border-bottom:1px solid var(--card-line);{cls}"><span style="font:500 14px/1.5 var(--f-label);color:var(--ink-3)">{t}</span><span style="font:700 13px/1.6 var(--f-label);letter-spacing:.12em;color:{col}">{who}</span><span style="font:400 17px/1.45 var(--f-body);color:var(--ink-2)">{txt}</span></div>'
thumbs=''.join(f'<div style="position:relative;width:176px"><img src="../slide-{i}.png" style="display:block;width:176px;height:99px;border-radius:2px;{"outline:3px solid var(--gold);outline-offset:2px" if i==3 else "opacity:.7"}"><span style="display:block;margin-top:10px;font:700 12px/1 var(--f-label);letter-spacing:.14em;color:{"var(--gold)" if i==3 else "var(--ink-3)"}">{i} · {t}</span></div>' for i,t in enumerate(["TIP-OFF","STOP LEBRON","KYRIE ISO","OUR OFFENSE","X-FACTORS","LAST TWO MIN"],1))
fld=lambda l,v,hl=False: f'<div style="padding:12px 0;border-bottom:1px solid var(--card-line)"><span class="lab" style="{"background:var(--gold);color:var(--panel);padding:3px 6px" if hl else ""}">{l}</span><div style="font:600 20px/1.3 var(--f-body);color:var(--ink);margin-top:8px">{v}</div></div>'
cv=f'''<div class="floor" style="--floor-dim:.55"></div>
<header class="sb" style="background:var(--gsw);border-bottom:2px solid var(--gold)">
 <div class="brand"><i></i>Chalk Talk</div>
 <div style="display:flex;align-items:center;gap:16px;font:400 32px/1 var(--f-title);letter-spacing:.04em">Head coach <span style="font:700 14px/1 var(--f-label);letter-spacing:.16em;background:var(--panel);color:var(--gold);padding:8px 10px">PRIVATE · ONLY YOU SEE THIS</span></div>
 <div class="sp"></div>
 <div class="mid" style="border-color:rgba(255,255,255,.18)"><div class="stack"><span class="lab" style="color:rgba(255,255,255,.6)">Series</span><span class="led" style="font-size:22px" data-off="8-8">3-3</span></div><div class="stack"><span class="lab" style="color:rgba(255,255,255,.6)">Finals</span><span class="g7">Game 7</span></div></div>
 <div class="clock" style="border-color:rgba(255,255,255,.18);background:var(--panel)"><span class="lab">Shot clock</span><span class="led red" data-off="88">24</span></div>
</header>
<div style="position:absolute;left:96px;top:96px;display:flex;align-items:center;gap:12px;font:700 15px/1 var(--f-label);letter-spacing:.16em;color:var(--ink-2);text-transform:uppercase"><span style="width:10px;height:10px;border-radius:50%;background:var(--red)"></span>Live · Slide 3 / 6 · Kyrie in isolation <span style="color:var(--ink-3)">· Same board as the player</span></div>
<img src="../slide-3.png" style="position:absolute;left:96px;top:128px;width:1152px;height:648px;border:1px solid #2a2a2e;box-shadow:0 16px 40px rgba(0,0,0,.5)">
<div style="position:absolute;left:96px;top:808px;display:flex;gap:19px">{thumbs}</div>
<div class="card" style="left:1288px;top:96px;width:536px;height:464px;padding:24px 32px">
 <div class="hd" style="margin-bottom:4px"><span>Briefing · from Coach AI</span><span style="color:var(--panel);background:var(--gold);padding:5px 8px;letter-spacing:.16em">Briefing</span></div>
 {fld("They asked","\u201cWhat about Kyrie? Where does he attack from?\u201d")}
 {fld("Main worry","Kyrie breaking us down one on one.",True)}
 {fld("On screen now","Slide 3, Kyrie in isolation. His spot is highlighted.")}
 <div style="padding-top:14px;font:400 16px/1.4 var(--f-body);color:var(--ink-3)">Handoff line said out loud: \u201cCoach, they\u2019re worried about Kyrie. We\u2019re on slide 3.\u201d</div>
</div>
<div class="card" style="left:1288px;top:584px;width:536px;height:312px;padding:20px 32px">
 <div class="hd" style="margin-bottom:4px"><span>Live transcript</span><span class="tag">Auto-scroll</span></div>
 {tline("02:41","PLAYER","Wait, what about Kyrie?")}
 {tline("02:43","COACH AI","Slide three. Klay takes him on the wing, and we switch the screen.")}
 {tline("02:58","PLAYER","Get me the head coach.")}
 {tline("03:12","COACH AI","Coach, they\u2019re worried about Kyrie. We\u2019re on slide 3.","border-bottom:0")}
</div>
<div style="position:absolute;left:1288px;top:920px;width:536px;height:64px;background:var(--gold);color:var(--panel);border-radius:4px;display:flex;align-items:center;justify-content:space-between;padding:0 24px">
 <span style="font:400 34px/1 var(--f-title);letter-spacing:.04em">Take over the room</span><span style="font:700 13px/1.3 var(--f-label);letter-spacing:.12em;text-align:right">AI GOES QUIET<br>CLICKER MODE</span></div>
<footer class="rail"><div class="pill listening"><span class="dot"></span>Coach AI waiting</div>
 <div class="ticker"><span class="led">COACH!JOINED</span><span class="sq"></span><span class="led">BRIEFING!SENT</span><span class="sq"></span><span class="led">3/6</span><span class="meta">Address the AI as \u201cAssistant, \u2026\u201d</span></div>{mic(True)}</footer>'''
page("coach",cv,"Coach view")

# ---------------- LOBBY ----------------
lb=f'''<div class="floor"></div>
<svg style="position:absolute;left:0;top:0" width="1920" height="1080"><g fill="none" stroke="#fff" stroke-width="3" stroke-opacity=".9">
<line x1="960" y1="64" x2="960" y2="1016"/><circle cx="960" cy="540" r="182"/></g><circle cx="960" cy="540" r="60" fill="#1D428A" stroke="#FFC72C" stroke-width="3"/>
<rect x="-2" y="380" width="290" height="320" fill="#1D428A" fill-opacity=".88" stroke="#fff" stroke-width="3"/><rect x="1632" y="380" width="290" height="320" fill="#1D428A" fill-opacity=".88" stroke="#fff" stroke-width="3"/></svg>
{scoreboard("0")}
<div class="card" style="left:640px;top:200px;width:640px;height:680px;padding:48px">
 <div style="display:flex;align-items:center;justify-content:space-between"><span class="lab" style="color:var(--gold)">Film session · Night before Game 7</span><span class="lab">June 18, 2016</span></div>
 <h1 style="font:400 112px/.9 var(--f-title);margin-top:24px;letter-spacing:-.005em">Chalk Talk</h1>
 <p style="font:400 21px/1.45 var(--f-body);color:var(--ink-2);margin-top:16px;max-width:520px">The assistant coach walks you through the Game 7 plan by voice. Six slides. Cut in any time.</p>
 <label class="lab" style="display:block;margin-top:40px">Your name</label>
 <div style="margin-top:12px;height:64px;border:2px solid var(--gold);border-radius:4px;background:#070708;display:flex;align-items:center;padding:0 20px;font:600 24px/1 var(--f-body)">Siddhant<span style="width:2px;height:28px;background:var(--gold);margin-left:3px"></span></div>
 <div style="margin-top:24px;display:flex;align-items:center;gap:16px;height:56px;border:1px solid var(--card-line);border-radius:4px;padding:0 20px">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B9B4AA" stroke-width="2.2" stroke-linecap="round"><rect x="8.5" y="3" width="7" height="12" rx="3.5" fill="#B9B4AA"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
  <span style="font:600 17px/1 var(--f-body);color:var(--ink-2)">MacBook Pro Microphone</span>
  <span style="margin-left:auto;display:flex;gap:4px">{''.join(f'<i style="display:block;width:8px;height:20px;background:{"var(--amber)" if i<5 else "rgba(255,176,0,.14)"}"></i>' for i in range(12))}</span></div>
 <div style="margin-top:40px;height:72px;background:var(--gold);color:var(--panel);border-radius:4px;display:flex;align-items:center;justify-content:center;font:400 40px/1 var(--f-title);letter-spacing:.04em">Join film session</div>
 <p style="margin-top:20px;font:400 15px/1.4 var(--f-body);color:var(--ink-3);text-align:center">Mic only. No camera. The head coach can join from a phone later.</p>
</div>
<footer class="rail"><div class="pill listening"><span class="dot" style="background:var(--ink-3)"></span>Mic ready</div>
 <div class="ticker"><span class="led">GAME!7</span><span class="sq"></span><span class="led">DOORS!OPEN</span><span class="sq"></span><span class="led">0/6</span><span class="meta">Film starts when you join</span></div>{mic(False)}</footer>'''
page("lobby",lb,"Lobby")
