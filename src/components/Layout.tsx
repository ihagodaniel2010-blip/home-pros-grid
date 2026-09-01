import Header from "./Header";
import Footer from "./Footer";

const Layout = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className={`flex-1 ${className}`}>{children}</main>
    <Footer />
  </div>
);

export default Layout;
