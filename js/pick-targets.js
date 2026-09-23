/** Deduplicate surface/edge hits, retaining distinct recursion levels. */
export function uniqueHits(intersections, owners) {
  const seen = new Set(), results = [];
  for (const hit of intersections) {
    const owner = owners.get(hit.object);
    if (!owner || seen.has(owner.key)) continue;
    seen.add(owner.key); results.push(owner);
  }
  return results;
}

export function metatronNodeOwner(meta,index,level) {
  return {id:'metatron',object:meta,level:0,key:'metatron:nodes',
    topic:'metatron_nodes',title:'13 точек Метатрона',
    node:meta.nodes[index],edges:meta.lines};
}
