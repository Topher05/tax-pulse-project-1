import { pulseNavGroups } from "./navigation.ts";

export const getViewTitle = (pathname: string): string => {
  if (pathname === "/cycles/queue") {
    return "Tax Plan Cycle Queue";
  }

  if (pathname.startsWith("/cycles/") && pathname !== "/cycles/queue") {
    return "Cycle Details";
  }

  for (const group of pulseNavGroups) {
    const item = group.items.find((navItem) => navItem.path === pathname);

    if (item !== undefined) {
      return item.label;
    }
  }

  return "Dashboard";
};
