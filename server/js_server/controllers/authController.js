/**
 * controllers/authController.js
 * ==============================
 * Native authentication for Express Gateway, replacing python dependency.
 */

const multer = require("multer");
const bcrypt = require("bcryptjs");
const { proxyToPyServer, pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const User = require("../models/User");
const { generateToken } = require("../utils/jwtHelper");
const { redisClient } = require("../config/redis");
// If you have a nodemailer integration, you'd require it here.
// For now, we mimic the python behavior of trying to send email or falling back to log.

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5242880, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPEG and PNG images are supported for face endpoints."), false);
    }
    cb(null, true);
  },
});

function buildFormData(file, fields = {}) {
  const FormData = require("form-data");
  const form = new FormData();
  Object.entries(fields).forEach(([key, val]) => form.append(key, val));
  form.append("image", file.buffer, {
    filename: file.originalname || "face.jpg",
    contentType: file.mimetype,
  });
  return form;
}

// ─── Native Native Controllers ──────────────────────────────────────────────

async function signup(req, res, next) {
  try {
    const { email, password, full_name, phone, dob } = req.body;
    logger.info(`[AUTH] Signup attempt: ${email}`);

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashed_password = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      hashed_password,
      full_name,
      phone,
      dob,
      role: "user"
    });

    const userObj = user.toJSON();
    delete userObj.hashed_password;
    res.json(userObj);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    logger.info(`[AUTH] Login attempt: ${email}`);

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.hashed_password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const access_token = generateToken(user);
    const userObj = user.toJSON();
    delete userObj.hashed_password;

    res.json({ access_token, token_type: "bearer", user: userObj });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const email = req.user.email;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const userObj = user.toJSON();
    delete userObj.hashed_password;
    res.json(userObj);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const email = req.user.email;
    const { full_name, phone, dob } = req.body;
    logger.info(`[AUTH] Profile update: ${email}`);

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (full_name !== undefined) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;
    if (dob !== undefined) user.dob = dob;

    await user.save();
    
    const userObj = user.toJSON();
    delete userObj.hashed_password;
    res.json(userObj);
  } catch (err) {
    next(err);
  }
}

async function deleteProfile(req, res, next) {
  try {
    const email = req.user.email;
    const { password } = req.body;
    logger.warn(`[AUTH] Account deletion requested: ${email}`);

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.hashed_password);
    if (!valid) {
      return res.status(403).json({ error: "Invalid password" });
    }

    // Call py_server to delete face data and chromadb data
    await pyAxios.delete("/auth/profile/data", {
      headers: { Authorization: req.headers.authorization }
    });
    
    await user.destroy();
    res.json({ status: "success", message: "Profile and associated data deleted successfully." });
  } catch (err) {
    if (err.response) {
       return res.status(err.response.status).json({ error: err.response.data?.detail || "Failed to delete profile AI data" });
    }
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email address." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redisClient.set(`reset_password_otp:${email}`, otp, { EX: 600 });
    logger.debug(`Generated OTP for ${email}: ${otp}`);

    // In a real scenario, implement sendEmail. For now, just logging:
    logger.info(`Password reset OTP for ${email} is ${otp}`);

    res.json({ message: "A password reset code has been generated.", email_sent: false });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Please provide a valid email address." });
    if (!otp) return res.status(400).json({ error: "Please enter the OTP sent to your email." });
    if (!new_password || new_password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters long." });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "No account found with this email address." });

    const storedOtp = await redisClient.get(`reset_password_otp:${email}`);
    if (!storedOtp) return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    if (storedOtp !== otp) return res.status(400).json({ error: "Invalid OTP. Please check and try again." });

    user.hashed_password = await bcrypt.hash(new_password, 10);
    await user.save();
    await redisClient.del(`reset_password_otp:${email}`);

    res.json({ message: "Password reset successfully. You can now login with your new password." });
  } catch (err) {
    next(err);
  }
}

// ─── Face Auth Controllers ─────────────────────────────────────────────────
// These must proxy to py_server because facial embeddings logic sits there.
// However, the python server expects these endpoints. We will pass them through.

async function faceRegister(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "Face image file is required." });
    const userId = req.body?.userid;
    if (!userId) return res.status(400).json({ error: "userid field is required for face registration." });

    logger.info(`[AUTH/FACE] Register face for user: ${userId}`);
    const formData = buildFormData(req.file, { userid: userId });

    await proxyToPyServer({ method: "POST", path: "/auth/face/register", req, res, formData });
  } catch (err) { next(err); }
}

async function faceLogin(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: "Face image file is required for facial login." });

    logger.info(`[AUTH/FACE] Face login attempt from ${req.ip}`);
    const formData = buildFormData(req.file);

    // Call py_server to perform facial recognition
    const pyRes = await pyAxios.post("/auth/face/login", formData, {
      headers: formData.getHeaders()
    });

    const result = pyRes.data; // Expected: { user_id: number, confidence: number, message: string }
    if (!result || !result.user_id) {
       return res.status(401).json({ error: "User not found for recognized face" });
    }

    const user = await User.findByPk(result.user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const access_token = generateToken(user);
    const userObj = user.toJSON();
    delete userObj.hashed_password;

    res.json({
      status: "success",
      message: result.message || "Facial login successful",
      confidence: result.confidence,
      access_token,
      token_type: "bearer",
      user: userObj
    });
  } catch (err) {
    if (err.response) {
       return res.status(err.response.status).json({ error: err.response.data?.detail || "Face login failed in AI server" });
    }
    next(err);
  }
}

async function faceStatus(req, res, next) {
  try {
    await proxyToPyServer({ method: "GET", path: "/auth/face/status", req, res });
  } catch (err) { next(err); }
}

async function deleteFace(req, res, next) {
  try {
    await proxyToPyServer({ method: "DELETE", path: "/auth/face", req, res });
  } catch (err) { next(err); }
}

module.exports = {
  signup,
  login,
  getMe,
  updateProfile,
  deleteProfile,
  forgotPassword,
  resetPassword,
  faceRegister,
  faceLogin,
  faceStatus,
  deleteFace,
  upload,
};
