import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import ChatbotPage from "./pages/ChatbotPage";
import QuizPage from "./pages/QuizPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import "./App.css";
import ErrorBoundary from "./components/utils/ErrorBoundary";
import SummarizerPage from "./pages/Summarize";
import WizardModule from "./pages/WizardModule";
import WizardContentView from "./pages/WizardContentView";
import ForgotPassword from "./pages/ForgotPassword";
import Marketplace from "./pages/Marketplace";

// Admin Imports
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminLLMConfigs from "./pages/admin/AdminLLMConfigs";
import AdminWizardQuestions from "./pages/admin/AdminWizardQuestions";
import BlockedPage from "./pages/BlockedPage";

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="app-shell">
      {!isAdminRoute && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Marketplace />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* Chatbot Route - Accessible to all */}
          <Route path="/chatbot" element={
            <ProtectedRoute>
              <ChatbotPage />
            </ProtectedRoute>
          } />
          {/* Protected Routes - Require Authentication */}
          <Route
            path="/quiz"
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quick-study"
            element={
              <ProtectedRoute>
                <SummarizerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wizard"
            element={
              <ProtectedRoute>
                <WizardModule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wizard/view/:id"
            element={
              <ProtectedRoute>
                <WizardContentView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route path="/blocked" element={<BlockedPage />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="wizard-questions" element={<AdminWizardQuestions />} />
            <Route path="llm-configs" element={<AdminLLMConfigs />} />
          </Route>

          {/* Public Routes - Redirect if Authenticated */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
