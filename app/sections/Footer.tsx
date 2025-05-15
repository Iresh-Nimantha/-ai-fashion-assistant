import { Facebook, Instagram, Youtube } from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Navigation Links */}
        <nav className="flex gap-8 text-sm font-medium">
          <Link href="/shop" className="hover:text-gray-400 transition">
            Shop
          </Link>
          <Link href="/ai-studio" className="hover:text-gray-400 transition">
            AI Studio
          </Link>
          <Link href="/contact" className="hover:text-gray-400 transition">
            Contact
          </Link>
        </nav>

        {/* Social Icons */}
        <div className="flex gap-6">
          <Link
            href="https://www.facebook.com/Zeusmenfashion"
            target="_blank"
            aria-label="Facebook"
          >
            <Facebook className="w-5 h-5 hover:text-blue-500 transition" />
          </Link>
          <Link
            href="https://www.instagram.com/zeusmenfashion"
            target="_blank"
            aria-label="Instagram"
          >
            <Instagram className="w-5 h-5 hover:text-pink-500 transition" />
          </Link>
          <Link
            href="https://www.youtube.com/@zeusmenfashion"
            target="_blank"
            aria-label="YouTube"
          >
            <Youtube className="w-5 h-5 hover:text-red-500 transition" />
          </Link>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700 my-6" />

      {/* Copyright */}
      <div className="text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Zeus Men’s Fashion. All rights
        reserved.
      </div>
    </footer>
  );
}
