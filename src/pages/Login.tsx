import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Login = () => (
  <Layout>
    <div className="max-w-md mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold mb-6 text-center">Log In</h1>
      <div className="space-y-4">
        <Input placeholder="Email" type="email" />
        <Input placeholder="Password" type="password" />
        <Button className="w-full">Log In</Button>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-4">This is a placeholder page.</p>
    </div>
  </Layout>
);

export default Login;
