import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import type { ComparisonCategoryType } from '@/types';

export interface ICategoryTabsProps {
  category: ComparisonCategoryType;
  onChange: (category: ComparisonCategoryType) => void;
  disabled: boolean;
}

const CATEGORIES: Array<{ value: ComparisonCategoryType; label: string }> = [
  { value: 'llm', label: 'Modelo normal' },
  { value: 'embedding', label: 'Embeddings' },
  { value: 'full', label: 'Completa' },
];

/**
 * Selects *what* is being measured, not just who is running. Each category is
 * a different backend capability (see `features/ai/config` capability matrix),
 * so switching tabs changes which providers are even selectable below.
 */
export function CategoryTabs({ category, onChange, disabled }: ICategoryTabsProps) {
  return (
    <Tabs value={category} onValueChange={(value) => onChange(value as ComparisonCategoryType)}>
      <TabsList>
        {CATEGORIES.map((item) => (
          <TabsTrigger key={item.value} value={item.value} disabled={disabled}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
