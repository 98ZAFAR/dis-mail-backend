const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-32-char-secret-key-here!!";
const ENCRYPTION_ALGORITHM = "aes-256-cbc";

// Decryption function
const decrypt = (iv, encryptedData) => {
  try {
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      key,
      Buffer.from(iv, "hex")
    );
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Decryption error details:", {
      ivLength: iv.length,
      encryptedDataLength: encryptedData.length,
      error: error.message
    });
    throw error;
  }
};

module.exports = {
  decrypt,
};