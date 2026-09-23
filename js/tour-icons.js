/** Explicit vector paths keep these symbols out of platform emoji fonts. */
const paths={
  tours:'M8 7H40V41H8ZM17 7V41M31 7V41M8 15H17M8 25H17M8 34H17M31 15H40M31 25H40M31 34H40M21 18L28 24L21 30Z',
  metatron:'M24 4V44M4 24H44M9.86 9.86L38.14 38.14M9.86 38.14L38.14 9.86',
  merkaba:'M24 4L41.32 34H6.68ZM24 44L6.68 14H41.32Z',
};
export function tourIcon(id,fallback) {
  if(!paths[id])return document.createTextNode(fallback);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 48 48');
  svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  const path=document.createElementNS(svg.namespaceURI,'path');
  path.setAttribute('d',paths[id]);svg.append(path);return svg;
}
