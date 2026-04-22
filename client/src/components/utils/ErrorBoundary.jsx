import React from "react";
import { Alert, Container, Typography } from "@mui/material";

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
        <Container maxWidth="sm" sx={{ py: 8 }}>
          <Alert severity="error" sx={{ borderRadius: 3, mb: 2 }}>
            <Typography variant="h6">Something went wrong.</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {this.state.error?.message || "An unexpected error occurred. Please try again later."}
            </Typography>
          </Alert>
        </Container>
      );
    }
    return this.props.children;
  }
}
