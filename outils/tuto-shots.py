"""Captures du Tuto depuis le calculateur réel + zones (champs / réponse) en pourcentages -> outils/tuto-captures.json"""
import json, threading, functools, http.server, socketserver, os
from PIL import Image
from playwright.sync_api import sync_playwright
import sys; ROOT=sys.argv[1] if len(sys.argv)>1 else '.'; OUT=ROOT+'/img/tuto'; os.makedirs(OUT,exist_ok=True)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
srv=socketserver.ThreadingTCPServer(('127.0.0.1',0),functools.partial(Q,directory=ROOT)); port=srv.server_address[1]
threading.Thread(target=srv.serve_forever,daemon=True).start()
TAB=lambda t:"document.querySelector('[data-tab=\"%s\"]').click()"%t
MODE=lambda m:"document.querySelector('.calc-mode-switch [data-mode=\"%s\"]').click()"%m
PICK=lambda i,q:"(()=>{const s=document.getElementById('%s');s.focus();s.value='%s';s.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#%s-list [data-b-suggestion=\"0\"]')?.click();})()"%(i,q,i)
SET=lambda i,v:"(()=>{const el=document.getElementById('%s');if(el){el.value='%s';el.dispatchEvent(new Event('input',{bubbles:true}));}})()"%(i,v)
# clé : (steps, sélecteur capturé, zone champs, zone réponse)
SPEC={
 'goal-simple':([TAB('goal')],'#panel-goal .calc-grid','#panel-goal .calc-card:not(.calc-result)','#goal-results'),
 'goal-expert':([TAB('goal'),MODE('advanced')],'#panel-goal','#panel-goal .calc-card:not(.calc-result)','#goal-results'),
 'activities-simple':([TAB('activities')],'#panel-activities','#panel-activities .calc-card:not(.calc-result)','#inverse-results'),
 'activities-editor':([TAB('activities'),MODE('advanced'),"(()=>{document.querySelectorAll('#panel-activities details').forEach(d=>d.open=true);})()"],'#panel-activities','#panel-activities .calc-activity-editors, #panel-activities .calc-card:not(.calc-result)','#activity-results'),
 'session-simple':([TAB('session')],'#panel-session','#panel-session .calc-card:not(.calc-result)','#session-results'),
 'purchase-simple':([TAB('purchase'),SET('f-purchase-hourly','50000')],'#panel-purchase','#panel-purchase .calc-card:not(.calc-result)','#purchase-results'),
 'comparateur':([TAB('purchase'),"(()=>{const s=document.getElementById('catalogue-type');if(s){s.value='vehicle';s.dispatchEvent(new Event('change',{bubbles:true}));}})()","(()=>{const c=document.querySelectorAll('[data-compare]');c[0].click();c[1].click();})()"],'#panel-purchase .calc-subsection, #panel-purchase','#catalogue-results','#vehicle-comparison'),
 'order-simple':([TAB('order'),SET('order-hourly','50000'),PICK('order-search','fe'),SET('order-price-0','30000'),PICK('order-search','kam'),SET('order-price-1','100000'),PICK('order-search','bati'),SET('order-price-2','150000')],'#panel-order','#panel-order .calc-card:not(.calc-result)','#order-results'),
 'roi-simple':([TAB('roi'),"(()=>{document.querySelector('[data-b-roi-manual]').click();})()",SET('f-roi-purchase','120000'),SET('roi-capital','500000'),"(()=>{const s=document.getElementById('f-roi-mode');if(s){s.value='continuous';s.dispatchEvent(new Event('change',{bubbles:true}));}})()",SET('f-roi-revenueHourly','20000'),SET('f-roi-hours','10')],'#panel-roi','#panel-roi .calc-card:not(.calc-result)','#roi-results'),
 'budget-simple':([TAB('budget'),SET('budget-reserve','30000'),"(()=>{const s=document.getElementById('f-budget-source');s.value='manual';s.dispatchEvent(new Event('change',{bubbles:true}));})()",SET('f-budget-extra','0'),SET('f-budget-allocations-1','0'),SET('f-budget-allocations-2','0'),SET('f-budget-allocations-3','0'),SET('f-budget-allocations-4','0'),SET('f-budget-allocations-0','140000')],'#panel-budget','#panel-budget .calc-card:not(.calc-result)','#budget-results'),
 'compare-simple':([TAB('compare'),PICK('compare-search','kamacho'),PICK('compare-search','bati'),SET('compare-price-0','150000'),SET('compare-price-1','50000'),"document.querySelector('[data-field=\"assets.1.utility\"]')&&(()=>{const el=document.querySelector('[data-field=\"assets.1.utility\"]');el.value='5';el.dispatchEvent(new Event('change',{bubbles:true}));})()","(()=>{const el=document.querySelector('[data-field=\"assets.2.utility\"]');if(el){el.value='3';el.dispatchEvent(new Event('change',{bubbles:true}));}})()"],'#panel-compare','#panel-compare .calc-card:not(.calc-result)','#compare-results'),
 'plan':([TAB('plan'),"(()=>{const s=document.getElementById('f-plan-goal-kind');if(s){s.value='purchase';s.dispatchEvent(new Event('change',{bubbles:true}));}})()",PICK('plan-search','kamacho'),SET('plan-price','1000000'),"(()=>{const s=document.getElementById('f-plan-source');if(s){s.value='missions';s.dispatchEvent(new Event('change',{bubbles:true}));}})()","document.querySelector('[data-b-plan-m-add]').click()",SET('plan-m-0-name','Livraison'),SET('plan-m-0-reward','60000'),SET('plan-m-0-cost','5000'),SET('plan-m-0-duration','20'),"document.querySelector('[data-b-plan-m-add]').click()",SET('plan-m-1-name','Braquage'),SET('plan-m-1-reward','150000'),SET('plan-m-1-cost','20000'),SET('plan-m-1-duration','40'),"(()=>{document.querySelectorAll('.b-plan-mission').forEach(d=>d.open=false);})()","document.querySelector('[data-fold-head=\"plan-program\"]')?.click()"],'#panel-plan','#panel-plan .calc-card:not(.calc-result)','#plan-results'),
 # v7.47 : « Mes calculs enregistrés » est un tiroir ; deux essais (Normal, Prudent) cochés pour la comparaison
 'carnets':([TAB('goal'),SET('calc-name','Normal'),"document.getElementById('calc-save').click()",SET('f-goal-hourly','80000'),SET('calc-name','Prudent'),"document.getElementById('calc-saved-open').click()","document.querySelector('#saved-now [data-b-save-copy]').click()","(()=>{document.querySelectorAll('#saved-list [data-b-pick]').forEach(i=>{i.checked=true;i.dispatchEvent(new Event('change',{bubbles:true}));});document.querySelector('.calc-drawer-in').scrollTop=0;})()"],'#calc-drawer','#saved-now','#saved-list'),
}
manifest={};answers={}
def rect(pg,sel):
    return pg.evaluate("s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return [r.left+scrollX,r.top+scrollY,r.width,r.height];}",sel)
def pct(box,inner):
    if not inner: return None
    x=(inner[0]-box[0])/box[2]*100; y=(inner[1]-box[1])/box[3]*100; w=inner[2]/box[2]*100; h=inner[3]/box[3]*100
    c=lambda v:max(0,min(100,v)); return {'x':c(x),'y':c(y),'width':c(w),'height':c(h)}
with sync_playwright() as p:
    b=p.chromium.launch()
    for key,(steps,sel,zi,zr) in SPEC.items():
        for mobile in (False,True):
            w,h=(390,844) if mobile else (1440,900)
            ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=(2 if key=='carnets' and not mobile else 1),is_mobile=mobile,has_touch=mobile,reduced_motion='reduce')
            pg=ctx.new_page(); pg.route('**/*',lambda r: r.abort() if 'fonts.g' in r.request.url else r.continue_())
            pg.goto(f'http://127.0.0.1:{port}/calculateurs.html',wait_until='load'); pg.wait_for_timeout(500)
            for s in steps: pg.evaluate(s); pg.wait_for_timeout(350)
            pg.evaluate("document.querySelectorAll('.lk-sticky').forEach(e=>e.hidden=true);const st=document.createElement('style');st.textContent='header,.lk-rails,.calc-wizard{visibility:hidden!important}#lk-status,.lk-status,#leo-launch,.leo-launch,.b-drawer-status,.calc-reminder{display:none!important}';document.head.appendChild(st)")
            pg.wait_for_selector(sel.split(',')[0].strip(),state='visible',timeout=8000)
            box=rect(pg,sel.split(',')[0].strip()); ri=rect(pg,zi.split(',')[0].strip()); rr=rect(pg,zr)
            name=key+('-mobile' if mobile else ''); path=f'{OUT}/{name}.webp'; png=f'/tmp/{name}.png'
            pg.locator(sel.split(',')[0].strip()).first.screenshot(path=png,timeout=15000); im=Image.open(png).convert('RGB')
            if not mobile and im.size[0]>1208: im=im.resize((1208,int(im.size[1]*1208/im.size[0])))
            if mobile and im.size[0]>356: im=im.resize((356,int(im.size[1]*356/im.size[0])))
            im.save(path,'WEBP',quality=82)
            manifest[name]={'src':'/img/tuto/'+name+'.webp','width':im.size[0],'height':im.size[1],'regions':{'inputs':pct(box,ri),'results':pct(box,rr)}}
            answers[name]=pg.evaluate("s=>{const e=document.querySelector(s);return e?e.innerText.replace(/\\s+/g,' ').trim().slice(0,1500):null}",zr)
            print(name,im.size); ctx.close()
    b.close()
srv.shutdown()
json.dump(manifest,open(ROOT+'/outils/tuto-captures.json','w'),ensure_ascii=False,indent=1)
print('manifeste',len(manifest))
# v7.53 : le texte de chaque réponse capturée, pour vérifier que le Tuto dit ce que montre la capture (hors dépôt si demandé)
if os.environ.get('TUTO_TEXTES'): json.dump(answers,open(os.environ['TUTO_TEXTES'],'w'),ensure_ascii=False,indent=1)
