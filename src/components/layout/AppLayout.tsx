import { useMemo } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Home, CreditCard, Menu, Key, User } from "lucide-react";

export function AppLayout() {
  const location = useLocation();

  const navItems = useMemo(() => (
    [
      { to: "/", label: "Home", icon: Home },
      { to: "/transactions", label: "Transactions", icon: CreditCard },
      { to: "/apis", label: "APIs", icon: Key },
      { to: "/auth", label: "Account", icon: User },
    ]
  ), []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="mx-auto w-full max-w-screen-xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 max-w-full">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 grid gap-1">
                  {navItems.map(({ to, label }) => (
                    <Link
                      key={to}
                      to={to}
                      className={`px-3 py-2 rounded-md transition-colors ${location.pathname === to ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <Link to="/" className="font-poppins font-semibold tracking-tight">ZETECH MD BOT</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      <nav className="fixed md:hidden bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-screen-xl px-2 py-1 grid grid-cols-4 gap-1">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} className="flex flex-col items-center justify-center py-2">
                <Button variant={active ? 'default' : 'ghost'} size="icon" className="h-9 w-9">
                  <Icon className="h-5 w-5" />
                </Button>
                <span className={`mt-1 text-xs ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default AppLayout;

