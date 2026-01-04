import { Edit } from "lucide-react";
import { cn } from "@/lib/utils";
interface FloatingActionButtonProps {
  onClick?: () => void;
  className?: string;
}
const FloatingActionButton = ({
  onClick,
  className
}: FloatingActionButtonProps) => {
  return <button onClick={onClick} className={cn("fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground", "flex items-center justify-center shadow-lg", "hover:scale-110 active:scale-95 transition-all duration-200", "animate-pulse-glow", className)}>
      <Edit className="w-6 h-6" fill="currentColor" />
    </button>;
};
export default FloatingActionButton;