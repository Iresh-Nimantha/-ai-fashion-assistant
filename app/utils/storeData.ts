interface StoreAnswer {
  answer: string;
  additionalInfo?: string[];
}

interface StoreData {
  [key: string]: StoreAnswer;
}

const storeData: StoreData = {
  "store hours": {
    answer: "Our store hours are:",
    additionalInfo: [
      "Monday - Friday: 10:00 AM - 8:00 PM",
      "Saturday: 10:00 AM - 7:00 PM",
      "Sunday: 11:00 AM - 6:00 PM",
      "Holiday hours may vary. Please check our website for updates.",
    ],
  },
  "track order": {
    answer: "To track your order, you can:",
    additionalInfo: [
      "1. Visit our website and log into your account",
      "2. Go to 'My Orders' section",
      "3. Click on the order number you want to track",
      "4. You'll see the current status and tracking number",
      "If you need assistance, please contact our customer service at support@zeusfashion.com",
    ],
  },
  "return policy": {
    answer: "Our return policy is as follows:",
    additionalInfo: [
      "• Items can be returned within 30 days of purchase",
      "• Items must be unworn, unwashed, and with original tags attached",
      "• Original receipt or order confirmation is required",
      "• Sale items are final sale and cannot be returned",
      "• Returns can be made in-store or by mail",
      "For more details, visit our Returns & Exchanges page",
    ],
  },
  "international shipping": {
    answer:
      "Yes, we offer international shipping to most countries. Here are the details:",
    additionalInfo: [
      "• Shipping times: 5-10 business days",
      "• Shipping costs vary by destination",
      "• Duties and taxes may apply based on your country",
      "• Free shipping on orders over $200",
      "• Track your international shipment through our website",
      "For specific country information, please check our International Shipping page",
    ],
  },
  "latest collections": {
    answer: "Our latest collections include:",
    additionalInfo: [
      "• Spring/Summer 2024 Collection",
      "• Premium Essentials Line",
      "• Sustainable Fashion Series",
      "• Limited Edition Collaborations",
      "Visit our New Arrivals section to explore the latest styles",
      "Sign up for our newsletter to be the first to know about new collections",
    ],
  },
  "find size": {
    answer: "To find your perfect size, you can:",
    additionalInfo: [
      "1. Use our Size Guide on each product page",
      "2. Measure yourself using our online measurement tool",
      "3. Visit our store for a professional fitting",
      "4. Check the specific product's size chart",
      "5. Contact our customer service for personalized assistance",
      "Note: Sizes may vary between different styles and collections",
    ],
  },
  "store locations": {
    answer: "We have several Zeus Fashion Store locations:",
    additionalInfo: [
      "• New York City - Flagship Store",
      "  123 Fashion Avenue, Manhattan, NY 10001",
      "  Phone: (212) 555-0123",
      "  👉 [View on Google Maps](https://www.google.com/maps?ll=6.87168,81.350398&z=14&t=m&hl=en&gl=LK&mapclient=embed&cid=6099089870828501393) 👈",
      "",
      "All stores are open during our regular business hours. For specific store information or directions, please visit our Store Locator page.",
    ],
  },
};

export const getStoreAnswer = (question: string): string => {
  // Convert question to lowercase and remove punctuation
  const normalizedQuestion = question
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");

  // Find the matching key in storeData
  const matchingKey = Object.keys(storeData).find((key) =>
    normalizedQuestion.includes(key.toLowerCase())
  );

  if (matchingKey && storeData[matchingKey]) {
    const { answer, additionalInfo } = storeData[matchingKey];
    if (additionalInfo) {
      return `${answer}\n\n${additionalInfo.join("\n")}`;
    }
    return answer;
  }

  // If no direct match is found, return a default response
  return "I'm not sure about that specific information. Please contact our customer service at support@zeusfashion.com for assistance.";
};

// Export the store data for reference
export const getStoreSuggestions = (): string[] => {
  return Object.keys(storeData).map((key) => `What are your ${key}?`);
};

export default storeData;
