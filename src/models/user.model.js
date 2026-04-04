const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30
    },

    password: {
      type: String,
      required: true,
      minlength: 6
    },

    // 🔁 Refresh token (for session)
    refreshToken: {
      type: String,
      default: null
    },

    // 👤 Optional fields
    profileImage: {
      type: String,
      default: ""
    },

    bio: {
      type: String,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);



// 🔐 HASH PASSWORD BEFORE SAVE
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});



// 🔍 COMPARE PASSWORD METHOD
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};



// 🔒 REMOVE SENSITIVE DATA WHEN RETURNING USER
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};



// ✅ EXPORT
module.exports = mongoose.model("User", userSchema);