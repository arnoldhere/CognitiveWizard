import { Alert } from "@mui/material";

export default function ErrorMessage({ message }) {
  return (
    <Alert severity="error" sx={{ borderRadius: 3 }}>
      {message}
    </Alert>
  );
}
