"use client";

import { useEffect } from "react";
import Head from "next/head";

export default function SocialMediaSection() {
  useEffect(() => {
    // Dynamically load the TikTok embed script
    const script = document.createElement("script");
    script.src = "https://www.tiktok.com/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Clean up script when component unmounts
      const embeddedScript = document.querySelector(
        'script[src="https://www.tiktok.com/embed.js"]'
      );
      if (embeddedScript && embeddedScript.parentNode) {
        embeddedScript.parentNode.removeChild(embeddedScript);
      }
    };
  }, []);

  return (
    <>
      <Head>
        <script async src="https://www.tiktok.com/embed.js"></script>
      </Head>
      <section className="bg-black text-white py-16 px-6" id="socialmedia">
        <div className="max-w-6xl mx-auto">
          {/* Header with ZEUS styling */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
                FOLLOW THE JOURNEY
              </span>
            </h2>
            <div className="w-24 h-1 bg-white mx-auto mb-6"></div>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Stay connected with ZEUS Men's Fashion on social media for
              exclusive drops, style inspiration, and behind-the-scenes content.
            </p>
          </div>

          {/* Social Media Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Facebook Page Plugin */}
            <div className="rounded-lg overflow-hidden border border-gray-800 bg-charcoal shadow-xl transition-transform hover:transform hover:scale-105">
              <div className="p-4 bg-charcoal border-b border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-blue-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <h3 className="text-xl font-bold">Facebook</h3>
                </div>
              </div>
              <iframe
                src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2FZeusmenfashion&tabs=timeline&width=340&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId"
                width="100%"
                height="500"
                style={{ border: "none", overflow: "hidden" }}
                scrolling="no"
                frameBorder="0"
                allow="encrypted-media"
                className="bg-white"
              ></iframe>
            </div>

            {/* Instagram Embed */}
            <div className="rounded-lg overflow-hidden border border-gray-800 bg-charcoal shadow-xl transition-transform hover:transform hover:scale-105">
              <div className="p-4 bg-charcoal border-b border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-pink-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                  <h3 className="text-xl font-bold">Instagram</h3>
                </div>
              </div>
              <iframe
                src="https://www.instagram.com/p/CxNvFQhtQbU/embed"
                width="100%"
                height="500"
                style={{ border: "none", overflow: "hidden" }}
                allow="encrypted-media"
                loading="lazy"
                className="bg-white"
              ></iframe>
            </div>

            {/* TikTok Embed */}
            <div className="rounded-lg overflow-hidden border border-gray-800 bg-charcoal shadow-xl transition-transform hover:transform hover:scale-105">
              <div className="p-4 bg-charcoal border-b border-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 015.17-1.75V12.1a8.32 8.32 0 005.37 1.91v-3.39a4.85 4.85 0 01-1.88-.37c.43.29.83.45 1.88.37V6.69z" />
                  </svg>
                  <h3 className="text-xl font-bold">TikTok</h3>
                </div>
              </div>
              <div className="flex justify-center bg-white">
                <blockquote
                  className="tiktok-embed"
                  cite="https://www.tiktok.com/@zeusmonaragala/video/7265281433181211922"
                  data-video-id="7265281433181211922"
                  style={{ maxWidth: "340px", minWidth: "325px" }}
                >
                  <section>Loading TikTok content...</section>
                </blockquote>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <p className="text-xl text-gray-400 mb-6">
              Tag us with{" "}
              <span className="font-bold text-white">#ZEUSSTYLE</span> for a
              chance to be featured
            </p>
            <div className="flex justify-center gap-6">
              <a
                href="https://www.facebook.com/Zeusmenfashion"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/zeus_menfashion/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://www.tiktok.com/@zeusmonaragala"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-300 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 015.17-1.75V12.1a8.32 8.32 0 005.37 1.91v-3.39a4.85 4.85 0 01-1.88-.37c.43.29.83.45 1.88.37V6.69z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
