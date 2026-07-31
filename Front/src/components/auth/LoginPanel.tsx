import { motion } from 'framer-motion';

import { BrandMark } from '@/components/common/BrandMark';
import { APP_NAME } from '@/constants/app';
import { fadeInUp } from '@/lib/motion';
import { LoginAside } from './LoginAside';
import { LoginForm } from './LoginForm';

/** Island root for `/login`. */
export function LoginPanel() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <LoginAside />

      <main className="flex items-center justify-center px-5 py-12 sm:px-10">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[26rem]"
        >
          <div className="flex items-center gap-2.5 lg:hidden">
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">
              {APP_NAME}
            </span>
          </div>

          <h1 className="mt-8 text-[26px] font-semibold leading-tight tracking-[-0.03em] text-foreground lg:mt-0">
            Inicia sesión
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-muted">
            Accede con tu cuenta corporativa para administrar conversaciones, catálogo y
            proveedores de IA.
          </p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-8 rounded-lg border border-border bg-surface-muted px-3.5 py-3 text-[12px] leading-relaxed text-muted">
            <span className="font-medium text-foreground">Entorno de demostración.</span> Entra con
            cualquier correo válido y una contraseña de 6 caracteres o más. Usa{' '}
            <code className="font-mono text-[11px]">password</code> para ver el estado de error.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
