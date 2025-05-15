"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");

  // Toggle mobile menu
  const toggleMenu = () => setMenuOpen(!menuOpen);

  // Close mobile menu when clicking on a link
  const closeMenu = () => setMenuOpen(false);

  // Handle scroll events for navbar transparency and active section
  useEffect(() => {
    const handleScroll = () => {
      // Check if page is scrolled to add background color
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      // Determine active section based on scroll position
      const sections = [
        "home",
        "about",
        "collection",
        "socialmedia",
        "contact",
      ];

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // If the top of the section is near the top of the viewport
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Initial check
    handleScroll();

    // Cleanup
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle window resize to auto-close mobile menu
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && menuOpen) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [menuOpen]);

  // Define navigation links
  const navLinks = [
    { href: "#home", label: "Home" },
    { href: "#about", label: "About" },
    { href: "#collection", label: "Collections" },
    { href: "#socialmedia", label: "Social Media" },
    { href: "/zeusAssistant", label: "AI Fashion Studio", highlight: true },
    { href: "#contact", label: "Contact" },
  ];

  return (
    <nav
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black shadow-lg py-2" : "bg-black/80 py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 group"
            onClick={closeMenu}
          >
            <div className="relative overflow-hidden rounded-full transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.jpg"
                alt="Zeus Logo"
                width={50}
                height={50}
                className="object-cover"
              />
            </div>
            <span className=" text-white text-xl font-bold tracking-widest transition-colors duration-300 ">
              ZEUS
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-sm font-semibold uppercase tracking-wider transition-all duration-300 hover:text-yellow-400 relative ${
                  activeSection === link.href.replace("#", "")
                    ? "text-yellow-400"
                    : link.highlight
                    ? "text-yellow-400"
                    : "text-white"
                }`}
              >
                {link.label}
                {activeSection === link.href.replace("#", "") &&
                  !link.highlight && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-400 transform origin-left transition-transform duration-300"></span>
                  )}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-md text-white hover:text-yellow-400 transition-colors duration-300"
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <X
                  size={24}
                  className="transition-transform duration-300 transform rotate-90"
                />
              ) : (
                <Menu size={24} className="transition-transform duration-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pt-2 pb-4 space-y-1 bg-black/95 backdrop-blur-sm border-t border-white/10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className={`block px-4 py-3 text-base font-medium transition-all duration-300 hover:bg-white/10 rounded ${
                link.highlight ? "text-yellow-400" : "text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
