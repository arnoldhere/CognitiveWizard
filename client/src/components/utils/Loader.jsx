import { Box, CircularProgress, LinearProgress, Paper, Stack, Typography } from "@mui/material";

export default function Loader({
  title = "Preparing your experience",
  subtitle = "Please wait while we load the next step.",
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: 420,
        p: { xs: 3, md: 4 },
        borderRadius: 4,
        background:
          "linear-gradient(160deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.94) 100%)",
        color: "white",
        border: "1px solid rgba(148, 163, 184, 0.24)",
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.24)",
      }}
    >
      <Stack spacing={2.5}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <CircularProgress
            size={64}
            thickness={4.2}
            sx={{ color: "#38bdf8" }}
          />
        </Box>
        <Box sx={{ textAlign: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(226, 232, 240, 0.84)" }}>
            {subtitle}
          </Typography>
        </Box>
        <LinearProgress
          sx={{
            height: 8,
            borderRadius: 999,
            backgroundColor: "rgba(148, 163, 184, 0.18)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 999,
              background: "linear-gradient(90deg, #38bdf8, #818cf8)",
            },
          }}
        />
      </Stack>
    </Paper>
  );
}
