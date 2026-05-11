/** Stable fragment id for jump links (person group key may contain spaces). */
export function personSectionDomId(personKey: string): string {
  return `mem-${encodeURIComponent(personKey)}`;
}
