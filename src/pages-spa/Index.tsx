import Layout from "@/components/Layout";
import HeroSection from "@/components/HeroSection";
import ContractorFeaturesSection from "@/components/ContractorFeaturesSection";
import TopProjects from "@/components/TopProjects";
import ProjectsList from "@/components/ProjectsList";
import ArticlesSection from "@/components/ArticlesSection";

const Index = () => (
  <Layout>
    <HeroSection />
    <ContractorFeaturesSection />
    <TopProjects />
    <ProjectsList />
    <ArticlesSection />
  </Layout>
);

export default Index;
