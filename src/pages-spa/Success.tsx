import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import TopProjects from "@/components/TopProjects";
import ProjectsList from "@/components/ProjectsList";
import { motion } from "framer-motion";

const Success = () => {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="relative py-24 px-6 text-center overflow-hidden navy-gradient-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(209,60%,25%)_0%,_transparent_60%)] opacity-40" />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative max-w-2xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 tracking-tight">
            Your project request has been sent!
          </h1>
          <p className="text-white/60 mb-10 leading-relaxed max-w-lg mx-auto">
            We're on it! We're connecting you to the best pros in your area.
            You'll receive quotes shortly via email and phone.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary font-semibold text-sm rounded-full hover:bg-white/90 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
          >
            Log in to see your projects <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>

      {/* More projects */}
      <section className="pt-16 pb-4 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold mb-2 tracking-tight">Need another project?</h2>
          <p className="text-muted-foreground">We're here to help with your entire to-do list.</p>
        </motion.div>
      </section>
      <TopProjects />
      <ProjectsList />
    </div>
  );
};

export default Success;
