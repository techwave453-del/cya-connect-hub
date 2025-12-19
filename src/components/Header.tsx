import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-8 h-8">
            <span className="text-primary text-3xl font-bold leading-none">✚</span>
          </div>
          <span className="font-heading text-xl font-bold text-foreground">CYA</span>
        </div>
        
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Decorative star background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-2 left-1/4 w-0.5 h-0.5 bg-foreground/30 rounded-full" />
        <div className="absolute top-4 left-1/2 w-0.5 h-0.5 bg-foreground/20 rounded-full" />
        <div className="absolute top-3 right-1/4 w-0.5 h-0.5 bg-foreground/25 rounded-full" />
        <div className="absolute top-1 right-1/3 w-0.5 h-0.5 bg-foreground/15 rounded-full" />
      </div>
    </header>
  );
};

export default Header;
