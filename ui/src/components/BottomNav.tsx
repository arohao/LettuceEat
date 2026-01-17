import { useLocation, useNavigate } from "react-router-dom";
import { Utensils, Users, Calendar } from "lucide-react";

const navItems = [
  { path: "/", label: "Restaurants", icon: Utensils },
  { path: "/friends", label: "Friends", icon: Users },
  { path: "/availability", label: "Availability", icon: Calendar },
];

export const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/" || location.pathname.startsWith("/restaurant");
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-bottom z-50">
      <div className="max-w-md mx-auto flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${active ? "nav-item-active" : "nav-item-inactive"}`}
            >
              <Icon size={24} strokeWidth={active ? 2.5 : 2} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
