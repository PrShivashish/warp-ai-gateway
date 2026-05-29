import type { App } from "app";
import "./index.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Signin } from "./pages/Signin";
import { Signup } from "./pages/Signup";
import { Dashboard } from "./pages/Dashboard";
import { Credits } from "./pages/Credits";
import { ApiKeys } from "./pages/ApiKeys";
import { Landing } from "./pages/Landing";
import { Metrics } from "./pages/Metrics";
import { ProviderHealth } from "./pages/ProviderHealth";
import { Chat } from "./pages/Chat";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ElysiaClientContextProvider } from "./providers/Eden";
import { treaty } from "@elysiajs/eden";
import { PRIMARY_API_URL } from "./lib/env";



const host = PRIMARY_API_URL.replace(/^https?:\/\//, '');
const client = treaty<App>(host, {
  fetch: {
    credentials: 'include'
  }
});


const queryClient = new QueryClient()

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -12, filter: "blur(10px)" }}
        transition={{ duration: 0.45, ease: [0.19, 1, 0.22, 1] }}
        className="min-h-screen"
      >
        <Routes location={location} key={location.pathname}>
          <Route path={"/"} element={<Landing />} />
          <Route path={"/signup"} element={<Signup />} />
          <Route path={"/signin"} element={<Signin />} />
          <Route path={"/dashboard"} element={<Dashboard />} />
          <Route path={"/wallet"} element={<Credits />} />
          <Route path={"/api-keys"} element={<ApiKeys />} />
          <Route path={"/metrics"} element={<Metrics />} />
          <Route path={"/dashboard/provider-health"} element={<ProviderHealth />} />
          <Route path={"/chat"} element={<Chat />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <ElysiaClientContextProvider value={client}>
        <BrowserRouter>
          <AnimatedRoutes />
        </BrowserRouter>
      </ElysiaClientContextProvider>
    </QueryClientProvider>
  );
}

export default App;