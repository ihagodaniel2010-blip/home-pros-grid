import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Award, Zap, Clock } from "lucide-react";
import Layout from "@/components/Layout";

const About = () => {
  const values = [
    {
      icon: Award,
      title: "Quality Craftsmanship",
      description: "We connect you with vetted, professional contractors who take pride in their work and deliver exceptional results."
    },
    {
      icon: Zap,
      title: "Transparent Pricing",
      description: "No hidden fees, no surprises. Get accurate quotes from multiple pros and choose the best option for your budget."
    },
    {
      icon: Clock,
      title: "On-Time Delivery",
      description: "Your time matters. Our pre-screened contractors respect deadlines and communicate every step of the way."
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              About Barrigudo
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Connecting homeowners with trusted local home service professionals to build, protect, and improve their homes.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, i) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {value.title}
                  </h3>
                  <p className="text-slate-600">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <img
            className="mx-auto w-28 mb-6"
            src="/aEomQEx4Q2sZ.com/resources/images/networx/v2/UZP1Emv43ZoL.png"
            alt="Barrigudo trust badge"
          />
          <p className="text-slate-700 leading-8 text-lg italic max-w-3xl mx-auto">
            At Barrigudo, our mission is to connect homeowners with qualified local and national home service professionals and products they can trust.
            We help people build, protect, and invest in their homes while growing the businesses that serve them, every single day.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Our Work Speaks for Itself
            </h3>
            <p className="text-base text-slate-700 mb-8 leading-relaxed">
              Explore our portfolio of completed projects to see the quality and craftsmanship we deliver across all service categories.
            </p>
            <Link
              to="/cost-guide"
              className="inline-flex items-center gap-2 px-9 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all duration-250 hover:shadow-lg active:scale-[0.98]"
            >
              View Portfolio <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
