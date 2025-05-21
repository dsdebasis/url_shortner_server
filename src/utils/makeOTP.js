import crypto from "crypto";
import Otp from "../models/otp.js";
function generateOTP(length = 6) {
  const digits = "0123456789";
  let otp = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    otp += digits[bytes[i] % digits.length];
  }
  return otp;
}

export default generateOTP;

export const verify_otp = async function (email, otp) {
 
  let findOtp =await Otp.findOne({ email });
  // console.log(findOtp);
  if (!findOtp) {
    return {
      success: false,
      message: "Invalid email ",
    }
  }
  if (findOtp.otp != otp) {
    return {
      success: false,
      message: "Invalid otp",
    }
  }
  return {
    success: true,
    message: "OTP verified successfully",
  }
};
