"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

const HeroBanner = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  // Handle the animation startup after component mounts
  useEffect(() => {
    // Short delay to ensure smooth animation start
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Handle mouse movement for spotlight effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = document.getElementById("hero-container");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <section
      id="hero-container"
      className="bg-black text-white h-screen flex items-center justify-center px-6 relative overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Spotlight effect
      {isLoaded && (
        <div
          className="absolute pointer-events-none opacity-20"
          style={{
            background:
              "radial-gradient(circle 200px at center, white, transparent 60%)",
            width: "400px",
            height: "400px",
            transform: `translate(${mousePosition.x - 200}px, ${
              mousePosition.y - 200
            }px)`,
            transition: "transform 0.1s ease-out",
          }}
        />
      )} */}

      {/* Main content */}
      <div className="text-center relative z-10">
        {/* Logo Image with zoom animation */}
        <div
          className={`mx-auto mb-6 transform transition-all duration-1000 ease-out ${
            isLoaded ? "scale-100 opacity-100" : "scale-50 opacity-0"
          }`}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <div className="relative">
            <Image
              src="/logo.jpg"
              alt="Zeus Logo"
              width={250}
              height={250}
              className={`mx-auto rounded-full transition-transform duration-700 ${
                isHovering ? "scale-110" : "scale-100"
              }`}
              priority
            />

            {/* Pulsing ring animation */}
            <div
              className={`absolute inset-0 rounded-full border-2 border-white opacity-0 ${
                isLoaded ? "animate-ping-slow" : ""
              }`}
            />
          </div>
        </div>

        {/* Title and Subtitle with fade-in animation */}
        <h1
          className={`text-4xl md:text-6xl font-bold tracking-wide uppercase mb-4 transition-all duration-1000 delay-300 ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          Command Your Style
        </h1>

        <p
          className={`text-lg md:text-xl text-gray-300 mb-8 transition-all duration-1000 delay-500 ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          Unleash the power of premium men's fashion
        </p>

        {/* CTA Buttons with fade-in animation */}
        <div
          className={`flex flex-col sm:flex-row gap-4 justify-center transition-all duration-1000 delay-700 ${
            isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <Link
            href="/collectionscc"
            className="bg-white text-black px-6 py-3 font-semibold rounded-full hover:bg-gray-200 transition-all duration-300 hover:scale-105"
          >
            Shop Now
          </Link>
          <Link
            href="/zeusAssistant"
            className="border border-white px-6 py-3 font-semibold rounded-full hover:bg-white hover:text-black transition-all duration-300 hover:scale-105"
          >
            Try Zeus AI Studio
          </Link>
        </div>
      </div>

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {isLoaded && (
          <>
            <div className="absolute w-64 h-64 bg-white/5 rounded-full blur-3xl -top-20 -left-20 animate-float-slow" />
            <div className="absolute w-64 h-64 bg-white/5 rounded-full blur-3xl -bottom-20 -right-20 animate-float-slow-reverse" />
          </>
        )}
      </div>
    </section>
  );
};

export default HeroBanner;
