const User = require("../../models/auth/model");
const { Mailbox, DisposableEmail } = require("../../models");
const { createToken } = require("../../libs/utils/auth");
const { setCookies, clearCookies } = require("../../configs/cookieConfigs");
const {
  cacheOTP,
  getOTP,
  incrementOTPAttempt,
  deleteOTP,
} = require("../../libs/utils/cacheService");
const { sendPasswordChangeOTP } = require("../../libs/utils/emailService");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        isEmailVerified: newUser.isEmailVerified,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password, migrateSession } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if user has an anonymous session to migrate
    const sessionToken = req.cookies.sessionToken;
    let migratedMailbox = null;

    if (sessionToken && migrateSession) {
      // Find the anonymous mailbox
      const anonymousMailbox = await Mailbox.findOne({
        where: { sessionToken, isActive: true },
      });

      if (anonymousMailbox) {
        // Extend expiry to 1 week for authenticated user
        const newExpiresAt = new Date();
        newExpiresAt.setDate(newExpiresAt.getDate() + 7);

        // Transfer ownership to authenticated user
        await anonymousMailbox.update({
          userId: user.id,
          sessionToken: null,
          expiresAt: newExpiresAt,
        });

        // Update DisposableEmail record
        await DisposableEmail.update(
          {
            userId: user.id,
            guestSessionId: null,
            expiresAt: newExpiresAt,
          },
          { where: { mailboxId: anonymousMailbox.id } }
        );

        migratedMailbox = {
          emailAddress: anonymousMailbox.emailAddress,
          expiresAt: newExpiresAt,
        };

        console.log(
          `[Mailbox Migrated] ${anonymousMailbox.emailAddress} to user ${user.id}`
        );
      }
    }

    const token = createToken(user);
    setCookies(res, "token", token);

    // Clear the session token cookie since user is now authenticated
    if (sessionToken) {
      clearCookies(res, "sessionToken");
    }

    const response = {
      message: "Login successful",
      token,
    };

    if (migratedMailbox) {
      response.migratedMailbox = migratedMailbox;
      response.message = "Login successful. Your anonymous mailbox has been transferred to your account with extended expiry!";
    }

    return res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const logout = async (req, res) => {
  try {
    clearCookies(res, "token");
    // Also clear session token if it exists
    const sessionToken = req.cookies.sessionToken;
    if (sessionToken) {
      clearCookies(res, "sessionToken");
    }
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName } = req.body;

    if (!fullName) {
      return res.status(400).json({ message: "Full name is required" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.update({ fullName });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const requestPasswordChangeOTP = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Cache OTP with 10-minute expiry
    const cached = await cacheOTP(userId, otp, "password_change");
    if (!cached) {
      return res.status(500).json({
        message: "Failed to generate OTP. Please try again.",
      });
    }

    // Send OTP via email
    const emailResult = await sendPasswordChangeOTP(
      user.email,
      otp,
      user.fullName
    );

    if (!emailResult.success) {
      // Clean up cached OTP if email failed
      await deleteOTP(userId, "password_change");
      return res.status(500).json({
        message: "Failed to send OTP email. Please try again later.",
        error: emailResult.error,
      });
    }

    console.log(
      `[OTP Requested] User: ${userId} (${user.email}) - OTP sent successfully`
    );

    return res.status(200).json({
      message: "OTP sent to your email address. Valid for 10 minutes.",
      email: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3"), // Mask email
      expiresIn: 600, // seconds
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newPassword, otp } = req.body;

    if (!newPassword || !otp) {
      return res.status(400).json({
        message: "New password and OTP are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters long",
      });
    }

    // Verify OTP
    const otpData = await getOTP(userId, "password_change");
    
    if (!otpData) {
      return res.status(400).json({
        message: "OTP has expired or not found. Please request a new OTP.",
      });
    }

    // Check max attempts (prevent brute force)
    if (otpData.attempts >= 5) {
      await deleteOTP(userId, "password_change");
      return res.status(429).json({
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP matches
    if (otpData.otp !== otp) {
      await incrementOTPAttempt(userId, "password_change");
      const remainingAttempts = 5 - (otpData.attempts + 1);
      return res.status(401).json({
        message: "Invalid OTP",
        remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0,
      });
    }

    // Verify current password
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    // Update password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await user.update({ password: hashedPassword });

    // Delete OTP after successful password change
    await deleteOTP(userId, "password_change");

    console.log(`[Password Changed] User: ${userId} (${user.email})`);

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  logout,
  getProfile,
  updateProfile,
  requestPasswordChangeOTP,
  changePassword,
};
