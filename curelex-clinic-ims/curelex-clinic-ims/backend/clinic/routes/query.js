import express from "express";
import Contact from "../models/QueryContact.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      message,
    } = req.body;

    // Validation
    if (
      !name ||
      !email ||
      !phone ||
      !message
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required",
      });
    }

    // Email validation
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid email address",
      });
    }

    // Phone validation
    if (
      phone.length !== 10 ||
      isNaN(phone)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number must be 10 digits",
      });
    }

    const newQuery =
      await Contact.create({
        name,
        email,
        phone,
        message,
      });


    res.status(201).json({
      success: true,
      message:
        "Message saved successfully",
      data: newQuery,
    });
  } catch (err) {
    console.error(
      "Contact Error:",
      err
    );

    res.status(500).json({
      success: false,
      message:
        "Internal Server Error",
    });
  }
});

export default router;