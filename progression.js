(function(){
  'use strict';
  const ids=window.LK_PROGRESS_IDS;
  function render(){
    for(const [type,key] of [['vehicules','lk_own_vehicules'],['armes','lk_own_armes'],['lieux','lk_map_found']]){
      const saved=window.LK.read(key,{},window.LK.own),total=ids[type].length,done=ids[type].filter(id=>Object.hasOwn(saved,id)&&saved[id]).length;
      const row=document.getElementById('progress-'+type);row.querySelector('strong').textContent=done+' / '+total;const bar=row.querySelector('progress');bar.max=total;bar.value=done;
    }
  }
  render();window.addEventListener('storage',render);window.addEventListener('pageshow',render);
})();
