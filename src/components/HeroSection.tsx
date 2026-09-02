import React from "react";
import { Phone, ArrowRight, ShieldCheck, MapPin } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { siteConfig, getPrimaryPhoneLink } from "@/config/site";

const HeroSection = () => {
  return (
    <section
      className="relative flex items-center justify-center overflow-hidden -mt-[72px] pt-[72px]"
      style={{
        minHeight: '520px',
        paddingTop: '100px',
        paddingBottom: '60px'
      }}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundPosition: 'center 26%',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* High-Contrast Overlay for WCAG AA/AAA Accessibility */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, rgba(11,42,74,0.78) 0%, rgba(15,23,42,0.85) 100%)'
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 text-center px-6 mx-auto w-full max-w-4xl flex flex-col items-center justify-center">
        
        {/* Location Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold mb-6 shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-primary-foreground shrink-0" />
          <span>Saco • Old Orchard Beach • Biddeford • Scarborough • Southern Maine</span>
        </div>

        {/* Main H1 - Immediate Paint (No JS Animation Delay for Lighthouse LCP Optimization) */}
        <h1
          className="text-white font-extrabold tracking-tight text-center leading-tight mb-4"
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            textShadow: '0 4px 20px rgba(0,0,0,0.4)'
          }}
        >
          Residential Construction & Remodeling in Southern Maine
        </h1>

        {/* Supporting Text */}
        <p
          className="text-slate-100 text-center leading-relaxed max-w-2xl mb-8 text-base md:text-lg font-normal"
          style={{
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            opacity: 0.95
          }}
        >
          H & A Construction LLC provides professional residential construction, remodeling, carpentry, flooring, painting, roofing, and finish work in Saco, Old Orchard Beach, Biddeford, Scarborough, and surrounding areas.
        </p>

        {/* Primary & Secondary Call To Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
          <a
            href="#estimate-form"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl active:scale-[0.98] cursor-pointer"
          >
            <span>Request a Free Estimate</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <a
            href={getPrimaryPhoneLink()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/30 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>Call H & A Construction</span>
          </a>
        </div>

        {/* Direct Trust Bar */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-200">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Direct Contractor Communication</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Free Project Estimates</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Southern Maine Local</span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;
