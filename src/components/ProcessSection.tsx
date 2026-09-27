import { MessageSquare, FileText, Hammer, CheckCircle2 } from "lucide-react";

const STEPS = [
  {
    number: "1",
    icon: MessageSquare,
    title: "Consultation",
    description: "We discuss your goals, ideas, and budget."
  },
  {
    number: "2",
    icon: FileText,
    title: "Estimate",
    description: "You receive a detailed, transparent estimate."
  },
  {
    number: "3",
    icon: Hammer,
    title: "Build",
    description: "Our team gets to work with clear communication throughout."
  },
  {
    number: "4",
    icon: CheckCircle2,
    title: "Final Walkthrough",
    description: "We make sure every detail is completed to your satisfaction."
  }
];

const ProcessSection = () => {
  return (
    <section className="bg-[#0b2a4a] text-white py-16 px-6 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
            OUR PROCESS
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
            A Simple, Stress-Free Experience
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {STEPS.map((step) => (
            <div key={step.number} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-[#ea580c] text-white font-black text-base flex items-center justify-center shadow-md">
                  {step.number}
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                  <step.icon className="w-5 h-5" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
