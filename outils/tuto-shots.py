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
 'purchase-simple':([TAB('purchase')],'#panel-purchase','#panel-purchase .calc-card:not(.calc-result)','#purchase-results'),
 'comparateur':([TAB('purchase'),"(()=>{const c=document.querySelectorAll('[data-compare]');c[0].click();c[1].click();})()"],'#panel-purchase .calc-subsection, #panel-purchase','#catalogue-results','#vehicle-comparison'),
 'order-simple':([TAB('order'),"(()=>{const i=document.getElementById('order-search');i.focus();i.value='fe';i.dispatchEvent(new Event('input',{bubbles:true}));})()"],'#panel-order','#panel-order .calc-card:not(.calc-result)','#order-results'),
 'roi-simple':([TAB('roi'),"(()=>{document.querySelector('[data-b-roi-manual]').click();})()",SET('f-roi-purchase','120000'),SET('roi-capital','500000'),"(()=>{const s=document.getElementById('f-roi-mode');if(s){s.value='continuous';s.dispatchEvent(new Event('change',{bubbles:true}));}})()",SET('f-roi-revenueHourly','20000'),SET('f-roi-hours','10')],'#panel-roi','#panel-roi .calc-card:not(.calc-result)','#roi-results'),
 'budget-simple':([TAB('budget')],'#panel-budget','#panel-budget .calc-card:not(.calc-result)','#budget-results'),
 'compare-simple':([TAB('compare'),PICK('compare-search','kamacho'),PICK('compare-search','bati'),SET('compare-price-0','150000'),SET('compare-price-1','50000'),"document.querySelector('[data-field=\"assets.1.utility\"]')&&(()=>{const el=document.querySelector('[data-field=\"assets.1.utility\"]');el.value='5';el.dispatchEvent(new Event('change',{bubbles:true}));})()"],'#panel-compare','#panel-compare .calc-card:not(.calc-result)','#compare-results'),
 'plan':([TAB('plan'),PICK('plan-search','kamacho'),SET('plan-price','1000000')],'#panel-plan','#panel-plan .calc-card:not(.calc-result)','#plan-results'),
 'carnets':([TAB('goal'),"document.getElementById('calc-save').click()","(()=>{const d=document.querySelector('.calc-saved');d.open=true;})()"],'.calc-saved','.calc-saved-body','#saved-list'),
}
manifest={}
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
            ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,is_mobile=mobile,has_touch=mobile,reduced_motion='reduce')
            pg=ctx.new_page(); pg.route('**/*',lambda r: r.abort() if 'fonts.g' in r.request.url else r.continue_())
            pg.goto(f'http://127.0.0.1:{port}/calculateurs.html',wait_until='load'); pg.wait_for_timeout(500)
            for s in steps: pg.evaluate(s); pg.wait_for_timeout(350)
            pg.evaluate("document.querySelectorAll('.lk-sticky').forEach(e=>e.hidden=true);const st=document.createElement('style');st.textContent='header,.lk-rails,.calc-wizard{visibility:hidden!important}#lk-status,.lk-status,#leo-launch,.leo-launch{display:none!important}';document.head.appendChild(st)")
            pg.wait_for_selector(sel.split(',')[0].strip(),state='visible',timeout=8000)
            box=rect(pg,sel.split(',')[0].strip()); ri=rect(pg,zi.split(',')[0].strip()); rr=rect(pg,zr)
            name=key+('-mobile' if mobile else ''); path=f'{OUT}/{name}.webp'; png=f'/tmp/{name}.png'
            pg.locator(sel.split(',')[0].strip()).first.screenshot(path=png,timeout=15000); im=Image.open(png).convert('RGB')
            if not mobile and im.size[0]>1208: im=im.resize((1208,int(im.size[1]*1208/im.size[0])))
            if mobile and im.size[0]>356: im=im.resize((356,int(im.size[1]*356/im.size[0])))
            im.save(path,'WEBP',quality=82)
            manifest[name]={'src':'/img/tuto/'+name+'.webp','width':im.size[0],'height':im.size[1],'regions':{'inputs':pct(box,ri),'results':pct(box,rr)}}
            print(name,im.size); ctx.close()
    b.close()
srv.shutdown()
json.dump(manifest,open(ROOT+'/outils/tuto-captures.json','w'),ensure_ascii=False,indent=1)
print('manifeste',len(manifest))
