/* Shared gallery/detail metadata presentation; no per-card file downloads. */
(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const quantity = value => finite(value) ? value.toLocaleString(undefined,{maximumFractionDigits:0}) : 'Not recorded';
  const meters = value => finite(value) ? value.toLocaleString(undefined,{maximumFractionDigits:1}) : null;
  function facts(x) {
    const s = x.buildSummary || {};
    const width = meters(s.footprint?.width), depth = meters(s.footprint?.depth);
    const height = meters(s.height);
    const cells = [
      ['Buildables',quantity(s.structureCount)], ['Belts',quantity(s.beltCount)],
      ['Footprint',width !== null && depth !== null ? `${width} × ${depth} m` : 'Not recorded'],
      ['Height',height !== null ? `${height} m` : 'Not recorded'],
      ['Game build',typeof s.gameBuild === 'string' && s.gameBuild.trim() ? s.gameBuild : 'Not recorded'],
      ['Build price',finite(s.price) ? '$' + s.price.toLocaleString(undefined,{maximumFractionDigits:2}) : 'Not recorded']
    ];
    return `<dl class="blueprint-facts">${cells.map(([label,value]) => `<div${label === 'Build price' ? ' class="price-fact" title="Price recorded by the mod when this file was saved; game prices may change."' : ''}><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  }
  function fileSize(value) {
    if (!finite(value)) return 'Not recorded';
    return value >= 1024*1024 ? `${(value/(1024*1024)).toFixed(1)} MB` : `${(value/1024).toFixed(1)} KB`;
  }
  function exchange(x) {
    return `<dl class="blueprint-exchange"><div class="creator-fact"><dt>Creator</dt><dd>${esc(x.author || 'Unknown')}</dd></div><div><dt>File size</dt><dd>${esc(fileSize(x.fileSize))}</dd></div><div><dt>Downloads</dt><dd>${quantity(x.downloads ?? 0)}</dd></div><div><dt>Likes</dt><dd>${quantity(x.likes ?? 0)}</dd></div></dl>`;
  }
  function card(x, preview) {
    return `<article class="tile" data-id="${esc(x._id)}" tabindex="0" role="button" aria-label="View ${esc(x.title)} blueprint"><div class="art">${preview}<span class="tag">${esc(x.category)}</span></div><div class="tilebody"><h3 class="tiletitle">${esc(x.title)}</h3><p class="desc">${esc(x.description || 'No description provided.')}</p>${facts(x)}${exchange(x)}<button type="button" class="btn like-button" data-like-id="${esc(x._id)}" aria-pressed="false">♡ LIKE · ${quantity(x.likes ?? 0)}</button><div class="card-action">VIEW BLUEPRINT <span aria-hidden="true">→</span></div></div></article>`;
  }
  globalThis.MoonprintCards = {facts,exchange,card,fileSize};
})();
