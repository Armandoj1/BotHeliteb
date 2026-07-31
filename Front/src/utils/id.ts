/** Collision-resistant enough for client-side keys (toasts, optimistic rows). */
export function createId(prefix = 'id'): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${random}`;
}
