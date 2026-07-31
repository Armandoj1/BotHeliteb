import { supportsCategory } from '@/features/ai/config';
import type { ComparisonCategoryType, IProviderConnection, ProviderIdType } from '@/types';

/**
 * Providers eligible for a given comparison axis.
 *
 * Only capability decides eligibility — not credential status. The full agent
 * (`comparar-chat`) works whether or not the catalogue is indexed yet, and a
 * configured-but-broken credential should still be selectable so its failure
 * shows up on the card instead of the provider silently disappearing.
 */
export function listEligibleProviders(
  connections: readonly IProviderConnection[],
  category: ComparisonCategoryType,
): IProviderConnection[] {
  return connections.filter((connection) => supportsCategory(connection.providerId, category));
}

export function firstEligible(
  connections: readonly IProviderConnection[],
  category: ComparisonCategoryType,
  skip?: ProviderIdType,
): ProviderIdType | null {
  const eligible = listEligibleProviders(connections, category);
  const withoutSkip = skip ? eligible.filter((item) => item.providerId !== skip) : eligible;
  return (withoutSkip[0] ?? eligible[0])?.providerId ?? null;
}
