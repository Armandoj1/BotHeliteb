import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef, type ComponentPropsWithoutRef, type ComponentRef } from 'react';

import { cn } from '@/lib/cn';

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  ComponentRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-surface-muted p-1',
        className,
      )}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<
  ComponentRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] font-medium',
        'text-muted transition-all duration-200 ease-out',
        'hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
        'data-[state=active]:bg-surface data-[state=active]:text-foreground data-[state=active]:shadow-xs',
        'disabled:pointer-events-none disabled:opacity-45',
        '[&_svg]:size-4',
        className,
      )}
      {...props}
    />
  );
});

export const TabsContent = forwardRef<
  ComponentRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn('focus-visible:outline-none', className)}
      {...props}
    />
  );
});
