/** Every navigable path in one place — no string literals scattered in views. */
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  CHAT: '/chat',
  CONVERSATIONS: '/conversations',
  CATALOG: '/catalog',
  QUOTATIONS: '/quotations',
  ADVISORS: '/advisors',
  NOTES: '/notes',
  PROMPTS: '/prompts',
  SYNC: '/sync',
  SETTINGS: '/settings',
  RESOURCES: '/resources',
  AI_USAGE: '/ai-usage',
  COMPARE: '/compare',
} as const;

export type RouteType = (typeof ROUTES)[keyof typeof ROUTES];
