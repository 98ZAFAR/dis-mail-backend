const jwt = require("jsonwebtoken");
const secretKey = process.env.JWT_SECRET || "default_secret_key";

function createToken(user) {
  const payload = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    role: user.role,
  };
  try {
    const token = jwt.sign(payload, secretKey, { expiresIn: "7d" });
    return token;
  } catch (error) {
    console.error("Error creating token:", error);
    throw error;
  }
}

function verifyToken(token){
    try{
        const decoded = jwt.verify(token, secretKey);
        return decoded;
    } catch (error) {
        console.error("Error verifying token:", error);
        throw error;
    }
}

module.exports = {
  createToken,
  verifyToken,
};