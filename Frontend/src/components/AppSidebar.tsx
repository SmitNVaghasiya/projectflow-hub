import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard, Columns3, List, Settings,
  LogOut, Sun, Moon, PanelLeft, X, ChevronUp, Users,
  Download
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Kanban Board", url: "/kanban", icon: Columns3 },
  { title: "List View", url: "/list", icon: List },
  { title: "Collaborations", url: "/collaborations", icon: Users },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/* ── Nav tooltip (hover label when collapsed) ── */
function Tooltip({ label }: { label: string }) {
  return (
    <span className={cn(
      "absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[200]",
      "px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap",
      "bg-[#1a1a1e] text-[#f0f0f0] border border-white/10 shadow-xl",
      "opacity-0 pointer-events-none translate-x-1",
      "group-hover:opacity-100 group-hover:translate-x-0",
      "transition-all duration-150 ease-out",
    )}>
      {label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1a1a1e]" />
    </span>
  );
}

/* ── Avatar initials ── */
function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

/* ── User popup ── */
interface UserMenuProps {
  user: { email?: string | null; display_name?: string | null } | null;
  collapsed: boolean;
  theme: string;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onNavigate: (url: string) => void;
}

function UserMenu({ user, collapsed, theme, onToggleTheme, onSignOut, onNavigate }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const initials = getInitials(user?.display_name, user?.email);
  const displayName = user?.display_name || user?.email || "Account";

  // Single, clean position calculator — no duplicate keys
  function computePosition() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    if (collapsed) {
      // Flyout to the RIGHT of the sidebar icon
      setMenuStyle({
        position: "fixed",
        top: rect.top,
        left: rect.right + 10,   // 10px gap to the right
        minWidth: 220,
        zIndex: 9999,
      });
    } else {
      // Popup floats ABOVE the trigger, centred within the 220px sidebar
      const SIDEBAR_W = 220;
      const POPUP_W = Math.round(SIDEBAR_W * 0.90); // 198px
      const sidebarLeft = rect.left - 8;               // subtract px-2 (8px) padding
      const margin = Math.round((SIDEBAR_W - POPUP_W) / 2);

      setMenuStyle({
        position: "fixed",
        bottom: window.innerHeight - rect.top + 8,   // 8px gap above trigger
        left: sidebarLeft + margin,
        width: POPUP_W,
        zIndex: 9999,
      });
    }
  }

  function openMenu() {
    computePosition();
    setOpen(true);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const fn = () => computePosition();
    window.addEventListener("resize", fn);
    window.addEventListener("scroll", fn, true);
    return () => {
      window.removeEventListener("resize", fn);
      window.removeEventListener("scroll", fn, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collapsed]);

  const popup = open ? createPortal(
    <div
      ref={menuRef}
      style={menuStyle}
      className={cn(
        "rounded-xl border shadow-2xl py-1 overflow-hidden",
        "bg-[hsl(var(--popover))] border-[hsl(var(--border))] text-[hsl(var(--popover-foreground))]",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        collapsed ? "slide-in-from-left-2" : "slide-in-from-bottom-2",
      )}
    >
      {/* Email */}
      <div className="px-3 py-2.5 border-b border-[hsl(var(--border))]">
        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{user?.email}</p>
      </div>

      <div className="py-1">
        {/* Theme toggle — stays open intentionally */}
        <button
          onClick={onToggleTheme}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors",
            "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
          )}
        >
          {theme === "dark"
            ? <Sun className="h-4 w-4 shrink-0" />
            : <Moon className="h-4 w-4 shrink-0" />}
          <span>Toggle theme</span>
          <span className="ml-auto text-[10px] text-[hsl(var(--muted-foreground))] capitalize">{theme}</span>
        </button>

        <button
          onClick={() => { setOpen(false); onNavigate("/settings"); }}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors",
            "text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]",
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </button>
      </div>

      <div className="border-t border-[hsl(var(--border))] py-1">
        <button
          onClick={() => { setOpen(false); onSignOut(); }}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors",
            "text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    // group so the "Account" tooltip fires on the whole wrapper when collapsed
    <div className="group relative w-full">
      {popup}

      <button
        ref={triggerRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-lg px-2 py-2 transition-all",
          "sidebar-footer-btn",
          open && "sidebar-nav-active",
          collapsed && "justify-center px-0",
        )}
      >
        {/* Avatar circle */}
        <span className="flex items-center justify-center rounded-full shrink-0 text-[11px] font-semibold w-7 h-7 bg-primary/20 text-primary">
          {initials}
        </span>

        {!collapsed && (
          <>
            <span className="flex-1 text-left text-sm font-medium truncate sidebar-brand">
              {displayName}
            </span>
            <ChevronUp className={cn(
              "h-3.5 w-3.5 shrink-0 sidebar-email transition-transform duration-200",
              open ? "rotate-0" : "rotate-180",
            )} />
          </>
        )}
      </button>

      {/* Tooltip shown on avatar hover when collapsed (same style as nav tooltips) */}
      {collapsed && (
        <span className={cn(
          "absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[200]",
          "px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap",
          "bg-[#1a1a1e] text-[#f0f0f0] border border-white/10 shadow-xl",
          "opacity-0 pointer-events-none translate-x-1",
          "group-hover:opacity-100 group-hover:translate-x-0",
          "transition-all duration-150 ease-out",
        )}>
          {displayName}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[#1a1a1e]" />
        </span>
      )}
    </div>
  );
}

/* ── Main sidebar ── */
export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { isInstallable, isIOS, installPWA } = usePWAInstall();

  function NavItems({ onClickItem, showTooltips }: { onClickItem?: () => void; showTooltips?: boolean }) {
    return (
      <ul className="space-y-0.5">
        {navItems.map((item) => (
          <li key={item.title} className="group relative">
            <NavLink
              to={item.url}
              end={item.url === "/"}
              onClick={onClickItem}
              className={({ isActive }) => cn(
                "sidebar-nav-item flex items-center gap-3 rounded-lg py-2 text-sm font-medium",
                "transition-all duration-150 select-none",
                isActive ? "sidebar-nav-active" : "sidebar-nav-idle",
                collapsed && showTooltips ? "justify-center w-10 mx-auto px-0" : "px-2.5",
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn(
                    "h-[17px] w-[17px] shrink-0 transition-colors",
                    isActive ? "sidebar-icon-active" : "sidebar-icon-idle",
                  )} />
                  {!(collapsed && showTooltips) && (
                    <>
                      <span className="truncate">{item.title}</span>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full sidebar-active-dot shrink-0" />
                      )}
                    </>
                  )}
                </>
              )}
            </NavLink>
            {collapsed && showTooltips && <Tooltip label={item.title} />}
          </li>
        ))}

        {/* PWA Install Button (Always visible to let users know it exists) */}
        <li className="group relative mt-4">
          <button
            onClick={() => {
              if (isInstallable) {
                installPWA();
                if (onClickItem) onClickItem();
              } else if (isIOS) {
                alert("To install ProjectHub on your iPhone/iPad:\n1. Tap the Share icon ⬆️\n2. Scroll down and tap 'Add to Home Screen' ➕");
              } else {
                alert("Native installation prompt isn't supported or the app is already installed.\n\nTip: You can usually install it by looking for the ⬇️ Install icon on the right side of your URL bar (in Chrome/Edge/Brave).");
              }
            }}
            className={cn(
              "sidebar-nav-item flex items-center gap-3 w-full rounded-lg py-2 text-sm font-medium",
              "transition-all duration-150 select-none text-[#ffeb3b] bg-[#ffeb3b]/10 hover:bg-[#ffeb3b]/20",
              collapsed && showTooltips ? "justify-center w-10 mx-auto px-0" : "px-2.5",
            )}
          >
            <Download className="h-[17px] w-[17px] shrink-0" />
            {!(collapsed && showTooltips) && (
              <span className="truncate">Install App</span>
            )}
          </button>
          {collapsed && showTooltips && <Tooltip label="Install App" />}
        </li>
      </ul>
    );
  }

  return (
    <>
      {/* ══ DESKTOP SIDEBAR ══ */}
      <aside className={cn(
        "sidebar-root hidden md:flex flex-col h-screen sticky top-0 shrink-0 overflow-hidden",
        "shadow-[1px_0_0_0_hsl(var(--sidebar-border))]",
        "transition-[width] duration-300 ease-in-out z-40",
        collapsed ? "w-[60px]" : "w-[220px]",
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center h-14 shrink-0 px-3 border-b sidebar-border",
          collapsed ? "justify-center" : "justify-between",
        )}>
          {!collapsed && (
            <span className="pl-1 text-[15px] font-semibold sidebar-brand whitespace-nowrap tracking-tight">
              ProjectHub
            </span>
          )}
          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "sidebar-trigger flex items-center justify-center rounded-md transition-colors shrink-0",
              collapsed ? "w-9 h-9" : "w-7 h-7",
            )}
          >
            <PanelLeft className={cn(
              "transition-transform duration-300",
              collapsed ? "h-[17px] w-[17px] rotate-180" : "h-[15px] w-[15px]",
            )} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pt-2 pb-1 overflow-hidden">
          <NavItems showTooltips={true} />
        </nav>

        {/* User menu */}
        <div className={cn(
          "shrink-0 border-t sidebar-border px-2 py-2",
          collapsed && "flex justify-center",
        )}>
          <UserMenu
            user={user}
            collapsed={collapsed}
            theme={theme}
            onToggleTheme={toggleTheme}
            onSignOut={signOut}
            onNavigate={(url) => navigate(url)}
          />
        </div>
      </aside>

      {/* ══ MOBILE BACKDROP ══ */}
      <div
        aria-hidden
        onClick={onMobileClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      {/* ══ MOBILE DRAWER ══ */}
      <div className={cn(
        "sidebar-root fixed inset-y-0 left-0 z-50 flex flex-col md:hidden overflow-hidden",
        "w-[240px] transition-transform duration-300 ease-in-out",
        "shadow-[1px_0_0_0_hsl(var(--sidebar-border))]",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex items-center justify-between h-14 px-4 border-b sidebar-border shrink-0">
          <span className="text-[15px] font-semibold sidebar-brand tracking-tight">ProjectHub</span>
          <button
            onClick={onMobileClose}
            className="sidebar-trigger w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 px-2 pt-3 pb-1 overflow-y-auto">
          <NavItems onClickItem={onMobileClose} />
        </nav>

        <div className="shrink-0 border-t sidebar-border px-2 py-2">
          <UserMenu
            user={user}
            collapsed={false}
            theme={theme}
            onToggleTheme={toggleTheme}
            onSignOut={() => { onMobileClose(); signOut(); }}
            onNavigate={(url) => { onMobileClose(); navigate(url); }}
          />
        </div>
      </div>
    </>
  );
}