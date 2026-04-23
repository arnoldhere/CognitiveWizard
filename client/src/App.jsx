import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import FaceRegister from "./pages/FaceRegister";
import FaceLogin from "./pages/FaceLogin";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <div className="app-shell">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
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
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Profile />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/face-register"
                  element={
                    <ProtectedRoute>
                      <FaceRegister />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/face-login"
                  element={
                    <PublicRoute>
                      <FaceLogin />
                    </PublicRoute>
                  }
                />

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

                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
