import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';

import { TRANSITION } from '@/lib/motion';

/**
 * Shared scrim for every overlay surface (Dialog, Drawer) so the dimming,
 * blur and timing stay identical across the product.
 */
export function DialogOverlay() {
  return (
    <DialogPrimitive.Overlay asChild forceMount>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={TRANSITION.base}
        className="fixed inset-0 z-50 bg-[rgb(10_10_12/0.32)] backdrop-blur-[2px]"
      />
    </DialogPrimitive.Overlay>
  );
}
