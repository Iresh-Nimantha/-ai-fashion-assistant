"use client";

import React, { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import AIFashionAssistant from "./zeusAssistant/page";
import HeroBanner from "./sections/HeroBanner";
import Navbar from "./sections/Navbar";
import AboutUs from "./sections/AboutUs";
import CollectionsPreview from "./sections/CollectionsPreview";
import ContactSection from "./sections/ContactSection";
import SocialMediaSection from "./sections/SocialMediaSection";
import Footer from "./sections/Footer";
import ChatBubble from "./components/ChatBubble";

const Page = () => {
  const [model, setModel] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<string>("");

  useEffect(() => {
    const initializeModel = async () => {
      try {
        const API_KEY = "AIzaSyCwfP90K1RoQow4YW5U2j8V-0ECF3d-5as";
        const genAI = new GoogleGenerativeAI(API_KEY);
        const generativeModel = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
        });
        setModel(generativeModel);
      } catch (err) {
        console.error("Error initializing AI model:", err);
      }
    };

    initializeModel();
  }, []);

  return (
    <div>
      <Navbar />
      <HeroBanner />
      <h1>AI Fashion Assistant Demo</h1>
      <AIFashionAssistant onResult={setAnalysisResult} />
      <AboutUs />
      <CollectionsPreview />
      <SocialMediaSection />
    <ChatBubble
        model={model}
        title="Zeus Fashion Assistant"
        welcomeMessage="Welcome to Zeus Fashion! How can I help you with your shopping experience today?"
        placeholder="Ask anything...."
        suggestions={[
          "What are your store hours?",
          "How can I track my order?",
          "What's your return policy?",
          "Do you ship internationally?",
          "What are your latest collections?",
          "How do I find my size?",
          "What are your store locations?",
        ]}
        analysis={analysisResult}
      /> 
      <ContactSection />
      <Footer />
      {/* <AIFashionAssistant /> */}
    </div>
  );
};

export default Page;
