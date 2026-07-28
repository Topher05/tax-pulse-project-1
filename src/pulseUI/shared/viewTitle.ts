import { pulseNavGroups } from "./navigation.ts";

export const getViewTitle = (pathname: string): string => {
  if (pathname.startsWith("/plan-cycles/") && pathname !== "/plan-cycles") {
    return "Plan Cycle Detail";
  }

  for (const group of pulseNavGroups) {
    const item = group.items.find((navItem) => navItem.path === pathname);

    if (item !== undefined) {
      return item.label;
    }
  }

  return "Dashboard";
};
