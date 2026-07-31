import type { IApiAsesorResumen } from '@/api/contracts';
import type { IUser } from '@/types';

/** First letters of the first two words — matches how the avatar renders. */
export function buildInitials(nombre: string): string {
  const words = nombre.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  const first = words[0]![0] ?? '';
  const second = words.length > 1 ? (words[1]![0] ?? '') : (words[0]![1] ?? '');
  return `${first}${second}`.toUpperCase();
}

export function toUser(asesor: IApiAsesorResumen): IUser {
  return {
    id: String(asesor.id),
    name: asesor.nombre,
    email: asesor.email,
    role: asesor.rol === 'admin' ? 'admin' : 'asesor',
    initials: buildInitials(asesor.nombre),
    organization: 'HELITEB',
  };
}
