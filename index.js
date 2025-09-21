import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Razorpay from "razorpay";
import crypto from "crypto";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ------------------ Mongo Schemas ------------------
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
});
const User = mongoose.model("User", userSchema);

const paymentSchema = new mongoose.Schema({
    userEmail: String,
    amount: Number,
    status: { type: String, default: "pending" }, // pending | success | failed
    razorpayOrderId: String,
    razorpayPaymentId: String,
});
const Payment = mongoose.model("Payment", paymentSchema);

// ------------------ Razorpay Setup ------------------
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ------------------ Routes ------------------

// Test route
app.get("/", (req, res) => res.send("✅ Backend is working!"));

// Register
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Incorrect password" });

        res.json({ message: "Login successful", user: { name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// Create Razorpay Order
app.post("/api/create-payment", async (req, res) => {
    const { userEmail, amount } = req.body;
    try {
        const order = await razorpay.orders.create({
            amount: amount * 100, // convert to paise
            currency: "INR",
            payment_capture: 1,
        });

        const newPayment = new Payment({
            userEmail,
            amount,
            razorpayOrderId: order.id,
            status: "pending",
        });
        await newPayment.save();

        res.json({ orderId: order.id, amount: order.amount, currency: order.currency });
    } catch (err) {
        res.status(500).json({ message: "Error creating payment", error: err.message });
    }
});

// Verify Payment
app.post("/api/verify-payment", async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    try {
        const sign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (sign === razorpay_signature) {
            await Payment.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                { status: "success", razorpayPaymentId: razorpay_payment_id }
            );
            return res.json({ status: "success" });
        } else {
            await Payment.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                { status: "failed" }
            );
            return res.json({ status: "failed" });
        }
    } catch (err) {
        res.status(500).json({ message: "Error verifying payment", error: err.message });
    }
});

// ------------------ Connect DB + Start Server ------------------
mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
