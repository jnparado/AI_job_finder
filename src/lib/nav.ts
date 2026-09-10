/** Desk/tab switches replace history. Job, packet, and thread URLs still push. */
export function isDrillPath(to: string) {
  return /\/(jobs|applications|messages|inbox)\/[^/?#]+/.test(to)
}
