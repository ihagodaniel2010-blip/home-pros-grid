import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Join = () => (
  <Layout>
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold mb-2 text-center">Join As a Pro</h1>
      <p className="text-muted-foreground text-center mb-6 text-sm">Grow your business with Barrigudo</p>
      <div className="space-y-4">
        <Input placeholder="Business Name" />
        <Input placeholder="Email" type="email" />
        <Input placeholder="Phone" type="tel" />
        <Button className="w-full">Get Started</Button>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">This is a placeholder page.</p>
    </div>
  </Layout>
);

export default Join;
