"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/profile": "Profile",
  "/dashboard/find-routes": "Find Routes",
  "/dashboard/create-pool": "Create Pool",
  "/dashboard/my-pools": "My Pools",
  "/dashboard/join-requests": "Join Requests",
  "/dashboard/calculator": "Cost Calculator",
  "/dashboard/schedule": "Schedule",
  "/dashboard/settings": "Settings",
  "/dashboard/notes": "University Notes",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Dashboard";

  return (
    <header className="flex h-16 items-center border-b border-slate-200 bg-white shadow-sm px-4 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h1>
      </div>
    </header>
  );
}

