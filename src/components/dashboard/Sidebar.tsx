"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User, BookOpen, Youtube, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/store/useUserStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const navItems = [
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
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, clear } = useUserStore();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      clear();
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
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-lg md:flex">
      <div className="flex h-16 items-center px-6 bg-gradient-to-r from-indigo-600 to-purple-600">
        <h1 className="text-2xl font-bold text-white tracking-tight">StudyHub</h1>
      </div>

      <ScrollArea className="flex-1">
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

      <div className="border-t border-slate-200 bg-slate-50/50 p-4">
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
              {user?.id ? `ID: ${user.id.slice(0, 20)}...` : "Not logged in"}
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
    </aside>
  );
}

