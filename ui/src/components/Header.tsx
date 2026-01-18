import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import lettuceLogo from "@/assets/lettuce-logo.png";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  rightElement?: React.ReactNode;
}

export const Header = ({ title, showBack = false, showLogo = false, rightElement }: HeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 bg-background z-40 py-4 px-4">
      <div className="flex items-center justify-between">
        <div className="w-10">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
          )}
        </div>
        <div className="flex-1 text-center">
          {title && <h1 className="font-bold text-lg">{title}</h1>}
        </div>
        <div className="w-10 flex justify-end">
          {showLogo && <img src={lettuceLogo} alt="LettuceEat" className="w-10 h-10" />}
          {rightElement}
        </div>
      </div>
    </header>
  );
};
