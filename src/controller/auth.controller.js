import joi from "joi";
import jwt from "jsonwebtoken";
import { ConflictError } from "../utils/errorHandler.js";
import wrapAsync, { asyncHandler } from "../utils/tryCatchWrapper.js";

import { loginUser } from "../services/auth.service.js";
import { findUserByEmail, createUser } from "../dao/user.dao.js";

import generateOTP, { verify_otp } from "../utils/makeOTP.js";

import sendEmail from "../utils/sendEmail.js";
import Otp from "../models/otp.js";
import { cookieOptions } from "../config/config.js";

export const register_user = asyncHandler(async (req, res, next) => {
  if (req.cookies.temp_user) {
    return res
      .status(400)
      .cookie("temp_user", "", {
        expires: new Date(Date.now()),
      })
      .json({ message: "verification for pending" });
  }

  const { name, email, password } = req?.body;

  const schema = joi.object({
    name: joi.string().required().trim().min(3).max(64),
    email: joi.string().email().required().min(6).max(32),
    password: joi.string().required().max(32).min(4),
  });

  let validation = schema.validate(req.body);
  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error.details[0].message,
    });
  }
  const find_user = await findUserByEmail(email);
  if (find_user) throw new ConflictError("User already exists");

  let otp;
  try {
    let findOtp = await Otp.findOne({ email });
    if (findOtp) {
      await Otp.findOneAndDelete({ email });
    }
    otp = generateOTP(6);
    let otpData = new Otp({
      email: email,
      otp: otp,
    });
    await otpData.save();
  } catch (error) {
    console.error("error while saving otp in database", error);
    throw new Error(error.message, 500);
  }
  const data = {
    to: email,
    subject: "Email Verification",
    html: `Your OTP for registration is ${otp} . It will expire in 10 minutes.`,
  };
  const emailData = await sendEmail(data);

  if (!emailData) throw new Error("Email not sent");
  res
    .cookie(
      "temp_user",
      JSON.stringify({
        name: name,
        email: email,
        password: password,
      }),
      {
        httpOnly: true,
        expires: new Date(Date.now() + 10 * 60 * 1000),
      }
    )
    .status(200)
    .json({
      success: true,
      message:
        "verification email sent. visit the otpVerification page to verify",
      link: `http://localhost:700/api/auth/register_user_verify_otp`,
    });
});

export const register_verifedUser = asyncHandler(async (req, res) => {
  if (!req.cookies.temp_user) {
    return res
      .status(400)
      .json({ message: "no otp generated .register again" });
  }
  const data = JSON.parse(req?.cookies?.temp_user);

  const { name, email, password } = data;

  const { otp } = req.body;
  if (!otp)
    return res.status(400).json({ message: "Provide OTP for verification" });

  const isOtpValid = await verify_otp(email, otp);

  if (!isOtpValid.success)
    return res.status(400).json({
      message: isOtpValid.message,
    });

  try {
    const newUser = await createUser(name, email, password);

    if (!newUser) throw new Error("Error while creating user", 500);

    let removeOtp = await Otp.findOneAndDelete({ email });
    console.log("removing otp after account creation");

    const token = jwt.sign(
      { id: newUser._id, name: newUser.name, email: newUser.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res
      .status(200)
      .cookie("auth_token", token, cookieOptions.maxAge==1000 * 60 * 60 * 24 * 7)
      .clearCookie("temp_user")
      .json({
        success: true,
        message: "Registration Succesfull",
        data: newUser,
      });
  } catch (error) {
    console.error("error while creating user", error);
    return res
      .status(500)
      .json({ success: false, message: error.message, error: error });
  }
});

export const login_user = asyncHandler(async (req, res) => {
  if (req?.cookies?.auth_token) {
    let maxAge = 1000 * 60 * 60 * 24 * 7;
    return res
      .status(400)
      .cookie(
        "auth_token",
        req.cookies.auth_token,
        (cookieOptions.maxAge = maxAge)
      )
      .json({ message: "Already logged in" });
  }
  const { email, password } = req.body;

  const loginSchema = joi.object({
    email: joi.string().email().required().min(6).max(32),
    password: joi.string().required().max(32).min(4),
  });

  let validation = loginSchema.validate({ email, password });
  if (validation.error) {
    return res.status(400).json({
      success: false,
      message: validation.error.details[0].message,
    });
  }
  const { token, user } = await loginUser(email, password);
  req.user = user;
  res.cookie(
    "auth_token",
    token,
    (cookieOptions.maxAge = 1000 * 60 * 60 * 24 * 7)
  );
  res.status(200).json({ message: "login success", user: user });
});

export const logout_user = wrapAsync(async (req, res) => {
  if (req?.cookies?.auth_token) {
    
    res.clearCookie("auth_token", (cookieOptions.maxAge = 0));
    res.status(200).json({ success: true, message: "Successfully logged out" });
  }else{
    console.log("no auth token found",req.cookies);
    res.status(200).json({ success: false, message: "No Authenticaiton Data Found" });
  }
});

export const get_current_user = wrapAsync(async (req, res) => {
  res.status(200).json({ user: req.user });
});
