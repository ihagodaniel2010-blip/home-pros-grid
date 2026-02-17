import Header from "./Header";

const Layout = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className="min-h-screen flex flex-col">
    <Header />
    <main className={`flex-1 ${className}`}>{children}</main>
  </div>
);

export default Layout;
