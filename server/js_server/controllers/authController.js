/**
 * controllers/authController.js
 * ==============================
 * Native authentication for Express Gateway.
 * Facial authentication has been deprecated and removed.
 */

const bcrypt = require("bcryptjs");
const axios = require("axios");
const { pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const User = require("../models/User");
const { generateToken } = require("../utils/jwtHelper");
const { redisClient } = require("../config/redis");

// ─── Native Auth Controllers ───────────────────────────────────────────────

async function signup(req, res, next) {
  try {
    const { email, password, full_name, phone, dob, is_tutor, role } = req.body;
    logger.info(`[AUTH] Signup attempt: ${email} (is_tutor: ${Boolean(is_tutor)})`);

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      if (existing.auth_provider && existing.auth_provider !== "local") {
        const providerName = existing.auth_provider.charAt(0).toUpperCase() + existing.auth_provider.slice(1);
        return res.status(400).json({
          error: `An account with this email was registered using ${providerName}. Please continue with ${providerName} to log in.`,
          provider: existing.auth_provider,
        });
      }
      return res.status(400).json({ error: "Email already registered" });
    }

    const assignedRole = (is_tutor === true || is_tutor === "true" || role === "tutor") ? "tutor" : (role || "user");

    const hashed_password = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      hashed_password,
      full_name,
      phone,
      dob,
      role: assignedRole,
      auth_provider: "local",
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

    // Provider conflict check: Prompt user to log in with their registered OAuth provider
    if (user.auth_provider && user.auth_provider !== "local") {
      const providerName = user.auth_provider.charAt(0).toUpperCase() + user.auth_provider.slice(1);
      return res.status(400).json({
        error: `This account was registered using ${providerName}. Please continue with ${providerName} to log in.`,
        provider: user.auth_provider,
      });
    }

    const hashed_pwd = user.hashed_password;
    if (!hashed_pwd) {
      return res.status(400).json({
        error: "This account was registered without a password. Please sign in with your third-party provider.",
      });
    }

    const valid = await bcrypt.compare(password, hashed_pwd);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    const access_token = generateToken(user);
    const userObj = user.toJSON();
    delete userObj.hashed_password;

    let pendingCount = 0;
    try {
      const { resumePendingGenerations, getFailedGenerationsCount } = require("./wizardController");
      
      // Get count before background resume kicks in
      pendingCount = await getFailedGenerationsCount(user.id);

      // Trigger auto-resume in background
      resumePendingGenerations(user.id).catch(err => 
        logger.error(`[AUTH] Background resume failed for user ${user.id}: ${err.message}`)
      );
    } catch (resumeErr) {
      logger.error(`[AUTH] Could not invoke resume functionality: ${resumeErr.message}`);
    }

    res.json({ 
      access_token, 
      token_type: "bearer", 
      user: userObj, 
      role: user.role,
      pending_generations: pendingCount 
    });
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
    const { password, confirmation, confirm } = req.body;
    logger.warn(`[AUTH] Account deletion requested: ${email}`);

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isOAuthUser = (user.auth_provider && user.auth_provider !== "local") || !user.hashed_password;

    if (isOAuthUser) {
      // For third-party OAuth users without a password, verify confirmation
      const confirmVal = (confirmation || password || "").toString().trim().toUpperCase();
      if (confirmVal !== "DELETE" && confirmVal !== email.toUpperCase() && confirm !== true) {
        return res.status(400).json({
          error: "Please confirm deletion by typing DELETE.",
        });
      }
    } else {
      // For local email/password users, verify the password
      if (!password) {
        return res.status(400).json({ error: "Please enter your password to confirm deletion." });
      }
      const valid = await bcrypt.compare(password, user.hashed_password);
      if (!valid) {
        return res.status(403).json({ error: "Invalid password" });
      }
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

// ─── OAuth 2.0 Controllers ───────────────────────────────────────────────

/**
 * GET /auth/oauth/:provider/url
 * Returns authorization redirect URL for Google or GitHub.
 */
async function getOAuthUrl(req, res, next) {
  try {
    const { provider } = req.params;
    const { role, return_to, redirect_uri } = req.query;
    const statePayload = { role: role || "user", return_to: return_to || "/quiz", timestamp: Date.now() };
    const state = Buffer.from(JSON.stringify(statePayload)).toString("base64");

    if (provider === "google") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = redirect_uri || process.env.GOOGLE_CALLBACK_URL || "http://localhost:5173/auth/callback/google";

      if (!clientId || clientId.includes("your_google_client_id")) {
        return res.status(503).json({
          error: "Google OAuth is not configured yet. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to server/.env.",
          configured: false,
        });
      }

      const scope = encodeURIComponent("openid email profile");
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=${scope}&access_type=offline&prompt=select_account&state=${state}`;

      return res.json({ url, provider: "google", configured: true });
    }

    if (provider === "github") {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const redirectUri = redirect_uri || process.env.GITHUB_CALLBACK_URL || "http://localhost:5173/auth/callback/github";

      if (!clientId || clientId.includes("your_github_client_id")) {
        return res.status(503).json({
          error: "GitHub OAuth is not configured yet. Please add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to server/.env.",
          configured: false,
        });
      }

      const scope = encodeURIComponent("user:email read:user");
      const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=${scope}&state=${state}`;

      return res.json({ url, provider: "github", configured: true });
    }

    return res.status(400).json({ error: `Unsupported OAuth provider: ${provider}. Supported providers: google, github.` });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/oauth/:provider/callback
 * Exchanges OAuth authorization code for verified profile and user session.
 */
async function oauthCallback(req, res, next) {
  try {
    const { provider } = req.params;
    const { code, redirect_uri, role } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    let email = null;
    let fullName = null;
    let avatarUrl = null;
    let oauthId = null;

    if (provider === "google") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const callbackUrl = redirect_uri || process.env.GOOGLE_CALLBACK_URL || "http://localhost:5173/auth/callback/google";

      if (!clientId || !clientSecret || clientId.includes("your_google_client_id")) {
        return res.status(503).json({ error: "Google OAuth credentials are not configured in server environment." });
      }

      // 1. Exchange code for access token
      const tokenResponse = await axios.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
        }).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 10000,
        }
      );

      const { access_token } = tokenResponse.data;

      // 2. Fetch user profile
      const userinfoResponse = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
        timeout: 10000,
      });

      const profile = userinfoResponse.data;
      email = (profile.email || "").toLowerCase().trim();
      fullName = profile.name || profile.given_name || email.split("@")[0];
      avatarUrl = profile.picture || null;
      oauthId = profile.sub;

      if (!email) {
        return res.status(400).json({ error: "Could not retrieve email from Google account." });
      }
    } else if (provider === "github") {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      const callbackUrl = redirect_uri || process.env.GITHUB_CALLBACK_URL || "http://localhost:5173/auth/callback/github";

      if (!clientId || !clientSecret || clientId.includes("your_github_client_id")) {
        return res.status(503).json({ error: "GitHub OAuth credentials are not configured in server environment." });
      }

      // 1. Exchange code for access token
      const tokenResponse = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: callbackUrl,
        },
        {
          headers: { Accept: "application/json" },
          timeout: 10000,
        }
      );

      const { access_token, error: ghError, error_description } = tokenResponse.data;
      if (ghError || !access_token) {
        logger.error(`[AUTH] GitHub token exchange error: ${ghError} - ${error_description}`);
        return res.status(400).json({ error: error_description || "Failed to exchange GitHub authorization code." });
      }

      // 2. Fetch user profile
      const userResponse = await axios.get("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "CognitiveWizard-App",
        },
        timeout: 10000,
      });

      const profile = userResponse.data;
      oauthId = String(profile.id);
      fullName = profile.name || profile.login || "GitHub User";
      avatarUrl = profile.avatar_url || null;
      email = profile.email;

      // If email is private on GitHub, fetch from /user/emails
      if (!email) {
        const emailsResponse = await axios.get("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${access_token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "CognitiveWizard-App",
          },
          timeout: 10000,
        });

        const emails = emailsResponse.data || [];
        const primaryEmail = emails.find((e) => e.primary && e.verified) || emails.find((e) => e.verified) || emails[0];
        if (primaryEmail && primaryEmail.email) {
          email = primaryEmail.email;
        }
      }

      if (!email) {
        return res.status(400).json({
          error: "Could not retrieve verified email from GitHub account. Please ensure your GitHub account has a verified email.",
        });
      }
      email = email.toLowerCase().trim();
    } else {
      return res.status(400).json({ error: `Unsupported OAuth provider: ${provider}` });
    }

    // 3. Look up existing user
    let user = await User.findOne({ where: { email } });

    if (user) {
      if (!user.is_active) {
        return res.status(403).json({ error: "access blocked contact admin team" });
      }

      // Provider conflict check:
      if (user.auth_provider && user.auth_provider !== provider) {
        const existingProviderName = user.auth_provider.charAt(0).toUpperCase() + user.auth_provider.slice(1);
        return res.status(400).json({
          error: `This account was registered using ${existingProviderName}. Please continue with ${existingProviderName} to log in.`,
          provider: user.auth_provider,
          attempted_provider: provider,
        });
      }

      // Update oauth_id or avatar_url if newly available
      const updates = {};
      if (!user.oauth_id && oauthId) updates.oauth_id = oauthId;
      if (!user.avatar_url && avatarUrl) updates.avatar_url = avatarUrl;
      if (user.auth_provider !== provider) updates.auth_provider = provider;
      if (Object.keys(updates).length > 0) {
        await user.update(updates);
      }
    } else {
      // 4. Register new user via OAuth
      const assignedRole = role === "tutor" ? "tutor" : "user";
      user = await User.create({
        email,
        full_name: fullName,
        auth_provider: provider,
        oauth_id: oauthId,
        avatar_url: avatarUrl,
        role: assignedRole,
        is_active: true,
        hashed_password: null,
      });
      logger.info(`[AUTH] New user created via ${provider} OAuth: ${email} (role: ${assignedRole})`);
    }

    const access_token = generateToken(user);
    const userObj = user.toJSON();
    delete userObj.hashed_password;

    let pendingCount = 0;
    try {
      const { resumePendingGenerations, getFailedGenerationsCount } = require("./wizardController");
      pendingCount = await getFailedGenerationsCount(user.id);
      resumePendingGenerations(user.id).catch((err) =>
        logger.error(`[AUTH] Background resume failed for user ${user.id}: ${err.message}`)
      );
    } catch (resumeErr) {
      logger.error(`[AUTH] Could not invoke resume functionality: ${resumeErr.message}`);
    }

    res.json({
      access_token,
      token_type: "bearer",
      user: userObj,
      role: user.role,
      pending_generations: pendingCount,
    });
  } catch (err) {
    logger.error(`[AUTH] OAuth callback error: ${err.message}`, err.response?.data || err);
    if (err.response?.data) {
      const detail = err.response.data.error_description || err.response.data.error || "OAuth provider error";
      return res.status(400).json({ error: detail });
    }
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
  getOAuthUrl,
  oauthCallback,
};
