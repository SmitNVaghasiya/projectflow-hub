import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">

      {/* Sidebar */}
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Main content — no header, content starts at top */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile-only floating hamburger — only visible on small screens */}
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className={cn(
            "md:hidden fixed top-3 left-3 z-30",
            "flex items-center justify-center w-8 h-8 rounded-md",
            "bg-background border border-border shadow-sm",
            "text-muted-foreground hover:text-foreground transition-colors"
          )}
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Page content — flush to top, no header gap */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}