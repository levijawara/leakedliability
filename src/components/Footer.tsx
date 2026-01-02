import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="w-full py-6 text-center">
      <div className="flex justify-center gap-4 mb-2">
        <Link 
          to="/disclaimer" 
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          DISCLAIMER
        </Link>
        <Link 
          to="/privacy-policy" 
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          PRIVACY
        </Link>
      </div>
      <p className="text-xs text-muted-foreground opacity-70">
        © 2026 Leaked Liability™
      </p>
    </footer>
  );
};
