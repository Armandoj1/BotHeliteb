import type { Transition, Variants } from 'framer-motion';

/**
 * Motion vocabulary. Every animation in the product pulls from this file so the
 * whole surface shares one physical feel — short, damped, never bouncy.
 */

export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;

export const TRANSITION: Record<'fast' | 'base' | 'slow' | 'spring', Transition> = {
  fast: { duration: 0.16, ease: EASE_OUT_QUINT },
  base: { duration: 0.26, ease: EASE_OUT_QUINT },
  slow: { duration: 0.42, ease: EASE_OUT_QUINT },
  spring: { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: TRANSITION.base },
  exit: { opacity: 0, y: -4, transition: TRANSITION.fast },
};

/** Modal surfaces: a short rise paired with a barely-there scale. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: TRANSITION.base },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: TRANSITION.fast },
};

export const slideInRight: Variants = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: TRANSITION.slow },
  exit: { x: '100%', transition: TRANSITION.base },
};

export const slideInLeft: Variants = {
  hidden: { x: '-100%' },
  visible: { x: 0, transition: TRANSITION.slow },
  exit: { x: '-100%', transition: TRANSITION.base },
};

/** Parent wrapper that reveals children one after the other. */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.04 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: TRANSITION.base },
};
