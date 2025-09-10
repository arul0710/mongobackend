import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// ✅ Allow React frontend to connect
app.use(cors({
    origin: "*", // for production: replace with your React app URL
}));

// ✅ Environment variables
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ✅ Connect MongoDB
mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Health check route
app.get("/", (req, res) => {
    res.send("🚀 Backend is working!");
});

// ✅ Example API route
app.get("/api/test", (req, res) => {
    res.json({ message: "API is working fine!" });
});

// ✅ Handle 404
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// ✅ Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
