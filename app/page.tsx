"use client";

import React, { useState } from "react";
import HeroBanner from "./sections/HeroBanner";
import Navbar from "./sections/Navbar";
import AboutUs from "./sections/AboutUs";
import CollectionsPreview from "./sections/CollectionsPreview";
import ContactSection from "./sections/ContactSection";
import SocialMediaSection from "./sections/SocialMediaSection";
import Footer from "./sections/Footer";
import Chatbot from "./components/ChatBubble";

const Page = () => {
  // If some child sets analysis later, lift state up here and pass it down
  const [responseText, setResponseText] = useState("");

  return (
    <div>
      <Navbar />
      <HeroBanner />
      <AboutUs />
      <CollectionsPreview />
      <SocialMediaSection />
      <ContactSection />
      <Chatbot responseText={responseText} />
      <Footer />
    </div>
  );
};

export default Page;
