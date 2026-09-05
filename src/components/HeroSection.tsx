import React from "react";
import { Phone, ArrowRight, ShieldCheck, MapPin, Sparkles, Star, Award } from "lucide-react";
import heroBg from "@/assets/hero-bg.webp";
import { siteConfig, getPrimaryPhoneLink } from "@/config/site";

const HeroSection = () => {
  return (
    <section
      className="relative flex items-center justify-center overflow-hidden -mt-[72px] pt-[72px] min-h-[580px] sm:min-h-[640px]"
      style={{
        paddingTop: '90px',
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
      
      {/* Premium High-Contrast Radial Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(11,42,74,0.85) 0%, rgba(15,23,42,0.95) 100%)'
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 mx-auto w-full max-w-5xl flex flex-col items-center justify-center">
        
        {/* Quality Rating Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-200 text-xs font-bold mb-5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Southern Maine's Premier Contractor</span>
          <div className="flex items-center text-amber-400 ml-1">
            <Star className="w-3 h-3 fill-amber-400" />
            <Star className="w-3 h-3 fill-amber-400" />
            <Star className="w-3 h-3 fill-amber-400" />
            <Star className="w-3 h-3 fill-amber-400" />
            <Star className="w-3 h-3 fill-amber-400" />
          </div>
        </div>

        {/* Main H1 Title */}
        <h1
          className="text-white font-black tracking-tight text-center leading-[1.1] mb-5 max-w-4xl"
          style={{
            fontSize: 'clamp(2.1rem, 5.5vw, 3.6rem)',
            textShadow: '0 4px 24px rgba(0,0,0,0.5)'
          }}
        >
          Residential Construction &amp; Remodeling in Southern Maine
        </h1>

        {/* Location Badge */}
        <div className="inline-flex items-center gap-1.5 text-slate-300 text-xs sm:text-sm font-semibold mb-6">
          <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Saco • Old Orchard Beach • Biddeford • Scarborough • Coastal Maine</span>
        </div>

        {/* Supporting Text */}
        <p
          className="text-slate-200 text-center leading-relaxed max-w-3xl mb-8 text-sm sm:text-base md:text-lg font-normal"
          style={{
            textShadow: '0 2px 12px rgba(0,0,0,0.4)',
            opacity: 0.95
          }}
        >
          H &amp; A Construction LLC delivers high-end residential remodeling, custom carpentry, flooring, drywall, painting, roofing, and full-home renovations on time and within budget.
        </p>

        {/* Primary & Secondary Call To Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md">
          <a
            href="#estimate-form"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base rounded-xl transition-all shadow-xl shadow-blue-900/50 hover:shadow-2xl active:scale-[0.98] cursor-pointer"
          >
            <span>Request Free Estimate</span>
            <ArrowRight className="w-5 h-5" />
          </a>

          <a
            href={getPrimaryPhoneLink()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-bold text-base rounded-xl border border-white/30 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            <Phone className="w-5 h-5 text-emerald-400" />
            <span>Call H &amp; A Construction</span>
          </a>
        </div>

        {/* Direct Trust Bar */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm font-semibold text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Direct Contractor Communication</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Free On-Site Estimates</span>
          </div>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Licensed &amp; Insured LLC</span>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HeroSection;

