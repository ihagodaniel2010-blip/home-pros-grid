import { Link } from "react-router-dom";
import { topServices } from "@/data/services";
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

const TopProjects = () => (
  <section className="pt-10 pb-6 px-4 bg-white relative">
    <div className="max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-7"
      >
        <h2 className="font-semibold text-slate-900 mb-2" style={{
          fontSize: '38px',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          lineHeight: 1.15
        }}>
          Our Top Projects
        </h2>
      </motion.div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '0'
      }}>
        {topServices.map((service, i) => {
          const glyph = SERVICE_ICON_GLYPHS[service.slug] ?? "\uf113";
          return (
            <motion.div
              key={service.slug}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <Link
                to={`/quote/${service.slug}`}
                className="group flex flex-col items-center justify-center"
                style={{
                  width: '114px',
                  height: '114px',
                  padding: '0',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid rgba(163,184,205,0.45)',
                  boxShadow: '0 0 10px rgba(190,190,190,0.9)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 8px 16px rgba(15,46,77,0.08)';
                  el.style.borderColor = 'rgba(15,46,77,0.12)';
                  el.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 0 10px rgba(190,190,190,0.9)';
                  el.style.borderColor = 'rgba(163,184,205,0.45)';
                  el.style.transform = 'translateY(0)';
                }}
              >
                <span className="service-icon-glyph" style={{
                  fontSize: '40px',
                  lineHeight: 1,
                  color: 'rgb(15, 46, 77)',
                  marginTop: '4px'
                }}>{glyph}</span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  textAlign: 'center',
                  color: 'rgb(51, 65, 85)',
                  lineHeight: 1.2,
                  transition: 'color 0.2s',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  paddingInline: '4px'
                }} className="group-hover:text-blue-600">{service.name}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  </section>
);

export default TopProjects;
