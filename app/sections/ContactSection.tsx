import Link from "next/link";

export default function ContactSection() {
  return (
    <section className="bg-black text-white py-16 px-6" id="contact">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-4">Contact Us</h2>
        <p className="text-gray-400 mb-8">
          Have questions or need help? We're just a message away.
        </p>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Contact Info */}
          <div className="text-left">
            <p className="mb-4">
              📍 <strong>Address:</strong> No 5B, New Bus Stand Rd, Monaragala
            </p>
            <p className="mb-4">
              📞 <strong>Phone:</strong>{" "}
              <Link
                href="tel:+94767206222"
                className="text-blue-400 hover:underline"
              >
                +94 76 720 6222
              </Link>
            </p>
            <p className="mb-4">
              📧 <strong>Email:</strong>{" "}
              <Link
                href="mailto:zeusfashion@gmail.com"
                className="text-blue-400 hover:underline"
              >
                zeusfashion@gmail.com
              </Link>
            </p>
            <p>
              💬 <strong>Facebook:</strong>{" "}
              <Link
                href="https://www.facebook.com/Zeusmenfashion"
                target="_blank"
                className="text-blue-400 hover:underline"
              >
                Zeus Men's Fashion
              </Link>
            </p>
          </div>

          {/* Embedded Map with updated coordinates */}
          <div className="w-full h-72">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d12688.912122783485!2d81.3504308!3d6.8717043!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae451c0eb15e361%3A0x54a451ec53ea7991!2sZeus%20Fashion!5e0!3m2!1sen!2slk!4v1686573196245!5m2!1sen!2slk"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
