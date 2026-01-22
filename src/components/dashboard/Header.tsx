"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User, BookOpen, Youtube, Brain, Sparkles, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserStore } from "@/store/useUserStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
  "/dashboard/youtube": "YouTube Summaries",
  "/dashboard/quiz": "Quiz Generator",
  "/dashboard/ai-lab": "AI Lab",
};

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/notes",
    label: "University Notes",
    icon: BookOpen,
  },
  {
    href: "/dashboard/youtube",
    label: "YouTube Summaries",
    icon: Youtube,
  },
  {
    href: "/dashboard/quiz",
    label: "Quiz Generator",
    icon: Brain,
  },
  {
    href: "/dashboard/ai-lab",
    label: "AI Lab",
    icon: Sparkles,
  },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const title = pageTitles[pathname] || "Dashboard";
  const [open, setOpen] = useState(false);
  const { user, clear } = useUserStore();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      clear();
      setOpen(false);
      router.push("/auth/signin");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to log out. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white shadow-sm px-4 sm:px-6">
      {/* Mobile Menu Button */}
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-slate-100"
            >
              <Menu className="h-6 w-6 text-slate-700" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="h-16 flex items-center justify-center bg-gradient-to-r from-indigo-600 to-purple-600 px-6">
              <SheetTitle className="text-2xl font-bold text-white tracking-tight">
                StudyHub
              </SheetTitle>
            </SheetHeader>
            
            <ScrollArea className="flex-1 h-[calc(100vh-8rem)]">
              <nav className="space-y-2 p-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Button
                      key={item.href}
                      asChild
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start transition-all duration-200",
                        isActive
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md hover:shadow-lg"
                          : "hover:bg-slate-100 hover:text-indigo-600"
                      )}
                      onClick={() => setOpen(false)}
                    >
                      <Link href={item.href}>
                        <Icon className="mr-2 h-4 w-4" />
                        {item.label}
                      </Link>
                    </Button>
                  );
                })}
              </nav>
            </ScrollArea>

            {/* User Section in Mobile Sheet */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-slate-50/50 p-4">
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
                <Avatar className="ring-2 ring-indigo-200">
                  <AvatarImage src="" alt={user?.email || "User"} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user?.email || "User"}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {user?.id ? `ID: ${user.id.slice(0, 12)}...` : "Not logged in"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Page Title */}
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h1>
      </div>

      {/* Mobile Logo (visible only on mobile when sidebar is hidden) */}
      <div className="md:hidden">
        <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          StudyHub
        </span>
      </div>
    </header>
  );
}

