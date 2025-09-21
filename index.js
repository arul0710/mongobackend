import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
});
const User = mongoose.model("User", userSchema);

// Payment Schema
const paymentSchema = new mongoose.Schema({
    userEmail: String,
    amount: Number,
    status: { type: String, default: "pending" }, // pending | success | failed
});
const Payment = mongoose.model("Payment", paymentSchema);

// Routes
app.get("/", (req, res) => res.send("Backend is working!"));

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

// Create Payment + auto-success for demo
app.post("/api/create-payment", async (req, res) => {
    const { userEmail, amount } = req.body;
    try {
        const newPayment = new Payment({ userEmail, amount });
        await newPayment.save();

        // Auto-success after 5 sec for demo
        setTimeout(async () => {
            newPayment.status = "success";
            await newPayment.save();
            console.log("💰 Payment auto-success for demo, ID:", newPayment._id);
        }, 5000);

        res.json({ paymentId: newPayment._id });
    } catch (err) {
        res.status(500).json({ message: "Error creating payment", error: err.message });
    }
});

// Check Payment
app.get("/api/check-payment/:id", async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id);
        if (!payment) return res.status(404).json({ message: "Payment not found" });

        res.json({ status: payment.status });
    } catch (err) {
        res.status(500).json({ message: "Error checking payment", error: err.message });
    }
});

// Connect Mongo + Start server
mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
