import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import TopProjects from "@/components/TopProjects";
import ProjectsList from "@/components/ProjectsList";

const Success = () => (
  <div className="min-h-screen flex flex-col">
    <Header />
    {/* Hero */}
    <section
      className="py-20 px-4 text-center"
      style={{
        background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--navy-light)) 100%)",
      }}
    >
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
          Your project request has been sent!
        </h1>
        <p className="text-primary-foreground/80 mb-8 leading-relaxed">
          We're on it! We're connecting you to the best pros in your area.
          You'll receive quotes shortly via email and phone.
        </p>
        <Button asChild variant="secondary" size="lg">
          <Link to="/login" className="gap-2">
            Log in to see all your projects <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>

    {/* More projects */}
    <section className="py-10 px-4 text-center">
      <h2 className="text-2xl font-bold mb-2">Need another project?</h2>
      <p className="text-muted-foreground mb-0">We're here to help with your entire to-do list.</p>
    </section>
    <TopProjects />
    <ProjectsList />
  </div>
);

export default Success;
