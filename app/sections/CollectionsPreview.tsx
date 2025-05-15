"use client";

import Image from "next/image";
import Link from "next/link";

const collections = [
  {
    title: "Street Kings",
    image: "/cloths/a.jpg", // replace with actual images
    link: "/shop/streetwear",
  },
  {
    title: "Modern Gentlemen",
    image: "/cloths/b.jpg",
    link: "/shop/formal",
  },
  {
    title: "Everyday Essentials",
    image: "/cloths/c.jpg",
    link: "/shop/casual",
  },
];

const CollectionsPreview = () => {
  return (
    <section
      className="bg-black text-white py-16 px-6 text-center"
      id="collection"
    >
      <h2 className="text-4xl font-bold mb-4">
        🔥 New Arrivals & Signature Styles
      </h2>
      <p className="text-gray-400 mb-10">
        Discover what's trending now — handpicked for the modern man.
      </p>

      <div className="grid gap-8 md:grid-cols-3">
        {collections.map((collection, index) => (
          <div
            key={index}
            className="bg-gray-900 rounded-lg overflow-hidden shadow-lg hover:shadow-white/10 transition"
          >
            <div className="relative h-64">
              <Image
                src={collection.image}
                alt={collection.title}
                layout="fill"
                objectFit="cover"
                className="hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-5">
              <h3 className="text-2xl font-semibold mb-2">
                {collection.title}
              </h3>
              <Link
                href={collection.link}
                className="text-blue-400 hover:underline"
              >
                Shop Now →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <Link
          href="/shop"
          className="inline-block bg-white text-black font-semibold py-3 px-8 rounded-full hover:bg-gray-200 transition"
        >
          View All Collections
        </Link>
      </div>
    </section>
  );
};
export default CollectionsPreview;
