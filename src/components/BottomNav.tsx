import { NavLink as RouterNavLink } from "react-router-dom";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface NavItemProps {
  to: string;
  icon: ReactNode;
  label: string;
}

const BottomNav = ({ items }: { items: NavItemProps[] }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto max-w-2xl flex items-center justify-around py-2 px-4">
        {items.map((item) => (
          <RouterNavLink
            key={item.to}
            to={item.to}
            className="relative flex flex-col items-center gap-0.5 px-4 py-1"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] font-medium transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {item.label}
                </span>
              </>
            )}
          </RouterNavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
