import { motion } from 'framer-motion';
import { BrainCircuit, Layers, ShieldCheck } from 'lucide-react';

import { APP_NAME } from '@/constants/app';
import { staggerContainer, staggerItem } from '@/lib/motion';

const HIGHLIGHTS = [
  {
    icon: BrainCircuit,
    title: 'Once proveedores de IA',
    description: 'Credenciales, pruebas de conexión y consumo en un solo lugar.',
  },
  {
    icon: Layers,
    title: 'Bandeja unificada',
    description: 'WhatsApp, webchat, email e Instagram sin cambiar de pestaña.',
  },
  {
    icon: ShieldCheck,
    title: 'Control del asistente',
    description: 'Notas, escalamientos y políticas comerciales siempre aplicadas.',
  },
] as const;

/**
 * Brand panel. Locked to the dark treatment in both themes — the sign-in screen
 * is the one surface where a fixed identity beats adapting to the user.
 */
export function LoginAside() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#0a0a0a] p-10 text-white lg:flex lg:flex-col lg:justify-between">
      {/* Faint grid: texture without imagery, so nothing to load. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-white/[0.05] blur-3xl"
      />

      <div className="relative flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-[10px] bg-white text-[#0a0a0a]">
          <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" aria-hidden>
            <path
              d="M6 18V6l12 12V6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <span className="text-[15px] font-semibold tracking-[-0.02em]">{APP_NAME}</span>
      </div>

      <div className="relative">
        <h2 className="max-w-sm text-[28px] font-semibold leading-[1.15] tracking-[-0.03em]">
          La consola donde tu equipo y tu IA trabajan sobre los mismos datos.
        </h2>

        <motion.ul
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mt-9 space-y-5"
        >
          {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
            <motion.li key={title} variants={staggerItem} className="flex gap-3.5">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/[0.06]">
                <Icon className="size-4" aria-hidden />
              </span>
              <span>
                <span className="block text-[14px] font-medium">{title}</span>
                <span className="mt-0.5 block max-w-xs text-[13px] leading-relaxed text-white/55">
                  {description}
                </span>
              </span>
            </motion.li>
          ))}
        </motion.ul>
      </div>

      <p className="relative text-[12px] text-white/40">
        © {new Date().getFullYear()} {APP_NAME} · Todos los derechos reservados
      </p>
    </aside>
  );
}
