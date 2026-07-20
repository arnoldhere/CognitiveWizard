/**
 * controllers/authController.js
 * ==============================
 * Native authentication for Express Gateway.
 * Facial authentication has been deprecated and removed.
 */

const bcrypt = require("bcryptjs");
const { pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const User = require("../models/User");
const { generateToken } = require("../utils/jwtHelper");
const { redisClient } = require("../config/redis");

// ─── Native Auth Controllers ───────────────────────────────────────────────

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

    if (!user.is_active) {
      return res.status(403).json({ error: "access blocked contact admin team" });
    }
    const valid = await bcrypt.compare(password, user.hashed_password);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const access_token = generateToken(user);
    const userObj = user.toJSON();
    delete userObj.hashed_password;
    res.json({ access_token, token_type: "bearer", user: userObj, "role": user.role });
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

    // Delete RAG embeddings and uploaded media on py_server
    try {
      await pyAxios.delete(`/auth/profile/data-raw/${user.id}`);
    } catch (pyErr) {
      logger.warn(`[AUTH] Could not delete AI data for user ${user.id}: ${pyErr.message}`);
    }

    await user.destroy();
    res.json({ status: "success", message: "Profile and associated data deleted successfully." });
  } catch (err) {
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

module.exports = {
  signup,
  login,
  getMe,
  updateProfile,
  deleteProfile,
  forgotPassword,
  resetPassword,
};
