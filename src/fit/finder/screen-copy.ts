// How the site names each screening question's reason, kept apart from the screener so the
// browser can load it without the server side.
import type { ScreenId } from './screen.ts';

export const SCREEN_SHORT: Record<ScreenId, string> = {
  backend_or_data: 'mainly backend or data',
  customer_delivery: 'customer delivery',
  people_management: 'people management',
  off_discipline: 'another discipline',
  explicitly_junior: 'junior',
};
