import { Link } from "@/lib/navigation-compat";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ServicesShowcase from "./ServicesShowcase";
import ServiceAreas from "./ServiceAreas";

const testimonials = [
  {
    name: "Sarem S.",
    photo: "/aEomQEx4Q2sZ.com/media/250x165/image0.jpg",
    text: "That Barrigudo website was very handy. I'm glad that I came across the site and got the link to my pro because their work was really, really good.",
  },
  {
    name: "Cindy T.",
    photo: "/aEomQEx4Q2sZ.com/resources/images/networx/v2/J6GlJ7ytlpit.jpg",
    text: "What I liked about Barrigudo is somebody called for a follow-up to see if a roofer had gotten in touch with me yet. That was really nice and helpful.",
  },
  {
    name: "Jackie D.",
    photo: "/aEomQEx4Q2sZ.com/resources/images/networx/v2/UqEBesZNaAi1.jpg",
    text: "Barrigudo gave me great service. I spoke with a rep who was so nice and courteous and within less than an hour, I heard from the pro.",
  },
];

const ArticlesSection = () => (
  <>
    <section className="py-16 px-6 bg-slate-50 relative">
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="bg-white rounded-xl p-6"
              style={{ boxShadow: "0 2px 10px rgba(15,46,77,0.12)" }}
            >
              <div className="flex items-center gap-4 mb-4">
                <img src={t.photo} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                <span className="font-semibold text-slate-800">{t.name}</span>
              </div>
              <p className="text-sm text-slate-700 leading-6">{t.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <ServicesShowcase />

    <section className="py-16 px-6 bg-white relative">
      <div className="max-w-6xl mx-auto text-center">
        <img
          className="mx-auto w-28 mb-6"
          src="/aEomQEx4Q2sZ.com/resources/images/networx/v2/UZP1Emv43ZoL.png"
          alt="Barrigudo trust badge"
        />
        <p className="text-slate-700 leading-8 max-w-4xl mx-auto" style={{ fontSize: "24px", fontStyle: "italic" }}>
          At Barrigudo, our mission is to connect homeowners with qualified local and national home service professionals and products they can trust.
          We help people build, protect, and invest in their homes while growing the businesses that serve them, every single day.
        </p>
      </div>
    </section>

    <section className="py-20 px-6" style={{ background: "#f6f7f8" }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto text-center"
      >
        <h3
          className="text-3xl font-semibold mb-3 text-slate-900"
          style={{ fontSize: "36px", fontWeight: 700, letterSpacing: "-0.01em" }}
        >
          Are you a Pro?
        </h3>
        <p className="text-base text-slate-700 mb-8 leading-relaxed" style={{ fontSize: "16px", lineHeight: 1.6 }}>
          Get real-time updates about local jobs for home improvement professionals.
          Discover how Barrigudo can help your business grow, as it has for many successful local contractors.
        </p>
        <Link
          to="/join"
          className="inline-flex items-center gap-2 px-9 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all duration-250 hover:shadow-lg active:scale-[0.98]"
          style={{ fontSize: "16px", fontWeight: 600, padding: "14px 36px" }}
        >
          Join us <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    </section>

    <ServiceAreas />
  </>
);

export default ArticlesSection;
