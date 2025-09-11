import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";


dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Config
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// ✅ Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
});

const User = mongoose.model("User", userSchema);

// ✅ Routes
app.get("/", (req, res) => res.send("Backend is working!"));

// Register route
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    console.log("📥 Request body:", req.body);

    try {
        // check if user exists
        const existing = await User.findOne({ email });
        if (existing) {
            console.log("❌ User already exists:", email);
            return res.status(400).json({ message: "User already exists" });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // save user
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        console.log("✅ User registered:", email);
        res.json({ message: "User registered successfully" });
    } catch (err) {
        console.error("❌ Error in register:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});
// Login route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    console.log("📥 Login attempt:", req.body);

    try {
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            console.log("❌ User not found:", email);
            return res.status(400).json({ message: "User not found" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log("❌ Incorrect password for:", email);
            return res.status(400).json({ message: "Incorrect password" });
        }

        // Success
        console.log("✅ User logged in:", email);
        res.json({ message: "Login successful", user: { name: user.name, email: user.email } });
    } catch (err) {
        console.error("❌ Error in login:", err);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


// ✅ Mongo connect + start server
mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
