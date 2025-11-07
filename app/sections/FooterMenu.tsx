import { useState } from "react";
import { Home, Image, MessageSquare } from "lucide-react";
import Imagegen from "../components/Imagegen";
import ChatBubble from "../components/ChatBubble";
import Link from "next/link";

interface FooterMenuProps {
  assistantContent: React.ReactNode;
  responseText: string;
  darkMode: boolean;
}

const FooterMenu: React.FC<FooterMenuProps> = ({
  assistantContent,
  responseText,
  darkMode,
}) => {
  const [active, setActive] = useState<"home" | "imagegen" | "chat">("home");

  return (
    <>
      {/* Content area */}
      <div className="pb-16">
        {active === "home" && assistantContent}
        {active === "imagegen" && responseText && (
          <Imagegen responseText={responseText} darkMode={darkMode} />
        )}
        {active === "chat" && <ChatBubble responseText={responseText} />}
      </div>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around p-2 shadow-md md:hidden">
        <button
          onClick={() => setActive("home")}
          className="flex flex-col items-center text-gray-700"
        >
          {" "}
          <Link href="/">
            <Home size={24} />
            <span className="text-xs mt-1">Home</span>
          </Link>
        </button>

        <button
          onClick={() => setActive("imagegen")}
          className="flex flex-col items-center text-gray-700"
        >
          <Link href="/Imagegen">
            <Image size={24} />
            <span className="text-xs mt-1">ImageGen</span>
          </Link>
        </button>

        <button
          onClick={() => setActive("chat")}
          className="flex flex-col items-center text-gray-700"
        >
          <MessageSquare size={24} />
          <span className="text-xs mt-1">Chat</span>
        </button>
      </footer>
    </>
  );
};

export default FooterMenu;
