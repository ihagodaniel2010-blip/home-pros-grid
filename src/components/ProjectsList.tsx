import { Link } from "@/lib/navigation-compat";
import { coreServices } from "@/data/services";
import { motion } from "framer-motion";

const SERVICE_ICON_GLYPHS: Record<string, string> = {
  "air-conditioning": "\uf100",
  cleaning: "\uf101",
  carpentry: "\uf103",
  plumbing: "\uf104",
  fencing: "\uf105",
  roofing: "\uf106",
  remodeling: "\uf107",
  flooring: "\uf109",
  painting: "\uf10c",
  electrician: "\uf10d",
  tile: "\uf10f",
  "garage-door-installation": "\uf110",
  "garage-door-repair": "\uf111",
  drywall: "\uf112",
  handyman: "\uf113",
};

const ProjectsList = () => (
  <section className="pt-4 pb-10 px-4 bg-white relative">
    <div className="max-w-5xl mx-auto">
      <motion.h2
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="font-semibold text-slate-900 mb-5 tracking-tight" style={{
          fontSize: '34px',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: 1.15
        }}
      >
        Our Projects
      </motion.h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
        gap: '8px 18px'
      }}>
        {coreServices.map((service, i) => {
          const glyph = SERVICE_ICON_GLYPHS[service.slug] ?? "\uf113";
          return (
            <motion.div
              key={service.slug}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.02 }}
            >
              <Link
                to={`/quote/${service.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 4px',
                  borderRadius: '8px',
                  transition: 'background-color 0.15s, color 0.15s',
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.backgroundColor = 'rgba(219, 234, 254)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.backgroundColor = 'transparent';
                }}
              >
                <span className="service-icon-glyph" style={{
                  fontSize: '29px',
                  lineHeight: 1,
                  color: 'rgb(15, 46, 77)',
                  width: '32px',
                  textAlign: 'center',
                  flexShrink: 0
                }}>{glyph}</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'rgb(51, 65, 85)',
                  lineHeight: 1.25,
                  transition: 'color 0.15s'
                }} className="hover:text-blue-600">{service.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default ProjectsList;
