import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Mongo connection
mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Payment schema
const paymentSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
});

const Payment = mongoose.model("Payment", paymentSchema);

// Create a new payment
app.post("/api/create-payment", async (req, res) => {
    const { userEmail, amount } = req.body;
    try {
        const payment = new Payment({ userEmail, amount });
        await payment.save();
        res.json({ paymentId: payment._id, status: payment.status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Webhook endpoint (called by payment provider)
app.post("/api/payment-webhook", async (req, res) => {
    const { paymentId, status } = req.body; // "success" or "failed"
    try {
        const payment = await Payment.findById(paymentId);
        if (!payment) return res.status(404).json({ message: "Payment not found" });

        payment.status = status;
        await payment.save();
        res.json({ message: "Payment updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// Check payment status (frontend polls)
app.get("/api/check-payment/:paymentId", async (req, res) => {
    const { paymentId } = req.params;
    try {
        const payment = await Payment.findById(paymentId);
        if (!payment) return res.status(404).json({ message: "Payment not found" });
        res.json({ status: payment.status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
