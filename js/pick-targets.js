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

