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

// ✅ Razorpay instance (use env values only!)
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ---------------- MongoDB Schemas ----------------
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
});
const User = mongoose.model("User", userSchema);

const paymentSchema = new mongoose.Schema({
    userEmail: String,
    amount: Number,
    status: { type: String, default: "pending" },
    razorpayOrderId: String,
    razorpayPaymentId: String,
});
const Payment = mongoose.model("Payment", paymentSchema);

// ---------------- Routes ----------------
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

// ✅ Create Order API
app.post("/create-order", async (req, res) => {
    try {
        const { amount, userEmail } = req.body;

        const order = await razorpay.orders.create({
            amount: Number(amount) * 100,
            currency: "INR",
            receipt: "receipt_" + Date.now(),
        });

        // Save to DB
        const payment = new Payment({
            userEmail,
            amount,
            status: "created",
            razorpayOrderId: order.id,
        });
        await payment.save();

        res.json(order);
    } catch (err) {
        res.status(500).send(err);
    }
});

// ✅ Verify Payment API
app.post("/verify-payment", async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            // Update payment in DB
            await Payment.findOneAndUpdate(
                { razorpayOrderId: razorpay_order_id },
                { status: "success", razorpayPaymentId: razorpay_payment_id }
            );
            res.json({ success: true, message: "Payment verified successfully" });
        } else {
            res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (err) {
        res.status(500).json({ message: "Verification failed", error: err.message });
    }
});

// ---------------- Start Server ----------------
mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
