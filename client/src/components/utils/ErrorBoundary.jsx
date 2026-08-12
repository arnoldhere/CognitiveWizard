import React from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Optionally log error to an external service
    // console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto py-12 px-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl flex flex-col items-center text-center gap-4">
            <AlertTriangle size={32} className="text-rose-500" />
            <div>
              <h3 className="text-lg font-bold mb-2">Something went wrong.</h3>
              <p className="text-sm font-medium opacity-80">
                {this.state.error?.message || "An unexpected error occurred. Please try again later."}
              </p>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
