import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Mail, ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "@/lib/navigation-compat";
import {
  defaultSiteSettings,
  fetchSiteSettingsPublic,
  type SiteSettings,
} from "@/lib/site-settings";

const ServiceAreas = () => {
  const prefersReducedMotion = typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSiteSettingsPublic()
      .then((data) => {
        if (!active) return;
        setSettings(data);
      })
      .catch(() => {
        if (!active) return;
        setSettings(defaultSiteSettings);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const mapsQuery = useMemo(() => {
    return settings.mapsQuery || settings.businessAddress;
  }, [settings.mapsQuery, settings.businessAddress]);

  const mapsEmbedUrl = useMemo(() => {
    const encoded = encodeURIComponent(mapsQuery);
    return `https://www.google.com/maps?q=${encoded}&output=embed`;
  }, [mapsQuery]);

  const directionsUrl = useMemo(() => {
    if (settings.directionsUrl && settings.directionsUrl.trim().length > 0) {
      return settings.directionsUrl.trim();
    }
    const encoded = encodeURIComponent(mapsQuery);
    return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  }, [settings.directionsUrl, mapsQuery]);

  const displayAreas = useMemo(() => {
    return settings.serviceAreas.filter((area) => area.trim().length > 0);
  }, [settings.serviceAreas]);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.6 },
    },
  } as const;

  const listItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.4, delay: i * 0.05 },
    }),
  } as const;

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 right-[10%] w-96 h-96 rounded-full opacity-5 blur-3xl"
          style={{ background: "var(--primary, #0b6dbf)" }}
        />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight"
            style={{ letterSpacing: "-0.02em" }}
          >
            Our Service Areas
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            We proudly serve these Massachusetts communities.
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
          {/* Left: Map */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col"
          >
            <div className="relative rounded-2xl overflow-hidden h-96 md:h-full min-h-[400px] lg:min-h-[500px] shadow-xl border border-slate-200/60 bg-white">
              {!mapError && (
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapsEmbedUrl}
                  title="Service area map showing Greater Boston Massachusetts"
                  aria-label="Interactive map of service areas in Greater Boston, Massachusetts"
                  onLoad={() => setMapLoaded(true)}
                  onError={() => setMapError(true)}
                />
              )}

              {!mapLoaded && !mapError && (
                <div className="absolute inset-0 animate-pulse bg-slate-100" aria-hidden="true" />
              )}

              {mapError && (
                <div className="absolute inset-0 flex items-center justify-center text-center p-8 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('/map-placeholder.svg')" }}
                    aria-hidden="true"
                  />
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" aria-hidden="true" />
                  <div className="relative z-10 flex flex-col items-center">
                    <MapPin className="h-8 w-8 text-primary mb-3" />
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">Map unavailable</h4>
                    <p className="text-sm text-slate-600 mb-4">Open the service area in Google Maps.</p>
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-full hover:bg-primary/90 transition-all duration-200"
                    >
                      Open in Google Maps
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              <div className="absolute top-4 left-4 backdrop-blur-md bg-white/80 px-4 py-2 rounded-full border border-white/30 shadow-lg">
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Greater Boston Area
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: Service Areas & Contact */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-col justify-between"
          >
            {/* Service Areas List */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">
                Primary Service Areas
              </h3>

              {/* Cities Grid */}
              <div className="grid grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
                {isLoading ? (
                  [...Array(6)].map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="h-10 rounded-lg bg-slate-100 animate-pulse"
                      aria-hidden="true"
                    />
                  ))
                ) : displayAreas.length > 0 ? (
                  displayAreas.map((area, i) => (
                    <motion.div
                      key={`${area}-${i}`}
                      custom={i}
                      variants={listItemVariants}
                      initial="hidden"
                      whileInView="visible"
                      viewport={{ once: true }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-slate-50 to-transparent hover:from-primary/5 transition-colors duration-300"
                    >
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                      <span className="text-slate-700 font-medium">{area}</span>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Service areas available soon.</p>
                )}
              </div>

              <p className="text-slate-600 italic text-sm">
                And surrounding communities throughout Greater Boston
              </p>
            </div>

            {/* Contact Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.2 }}
              className="relative p-8 rounded-2xl border border-slate-200/50 bg-gradient-to-br from-white/80 via-white/60 to-slate-50/40 backdrop-blur-md shadow-lg overflow-hidden group hover:shadow-xl transition-shadow duration-300"
            >
              {/* Decorative gradient background */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, var(--primary, #0b6dbf) 0%, transparent 100%)" }}
              />

              <div className="relative z-10">
                <h4 className="text-xl font-bold text-slate-900 mb-6">Get in Touch</h4>

                {/* Email */}
                <div className="mb-6">
                  <p className="text-sm text-slate-600 mb-2">Email</p>
                  <a
                    href={`mailto:${settings.contactEmail}`}
                    className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-200"
                    aria-label={`Send email to ${settings.contactEmail}`}
                  >
                    <Mail className="h-5 w-5" />
                    <span className="underline">{settings.contactEmail}</span>
                  </a>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200/50">
                  <Link
                    to="/services"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-full hover:bg-primary/90 transition-all duration-250 hover:shadow-lg active:scale-[0.98] group/btn"
                  >
                    Get a Free Quote
                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>

                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-full hover:bg-slate-200 transition-all duration-250 hover:shadow-md active:scale-[0.98] group/dir"
                    aria-label="Get directions to our service area on Google Maps"
                  >
                    Directions
                    <ExternalLink className="h-4 w-4 group-hover/dir:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Accent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center pt-8 border-t border-slate-200/50"
        >
          <p className="text-slate-600 max-w-2xl mx-auto">
            Ready to transform your home? Our network of certified professionals is ready to serve you across Greater Boston.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default ServiceAreas;
