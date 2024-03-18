const bcrypt = require("bcryptjs");

const verifyPassword = async (enteredPassword, existingPassword) => {
  return await bcrypt.compare(enteredPassword, existingPassword);
};

module.exports = verifyPassword;
