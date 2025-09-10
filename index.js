import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcrypt"; // use bcryptjs if bcrypt fails on Windows

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const uri = process.env.REACT_APP_API_URL

mongoose
    .connect(uri)
    .then(() => console.log("✅ Connected to Arul_0710 database!"))
    .catch((err) => console.error("❌ Connection error:", err));

// Schema for users
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

//
// 🟢 REGISTER USER
//
app.post("/users", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ name }, { email }] });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists!" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Save user
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();

        res.json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ message: "Error registering user", error: err });
    }
});

//
// 🔑 LOGIN USER
//
app.post("/login", async (req, res) => {
    const { name, password } = req.body;

    try {
        // Find user by name
        const user = await User.findOne({ name });
        if (!user) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // Compare entered password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        // ✅ Login successful
        res.json({ message: "Login successful", user });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

//
// 🚀 START SERVER
//
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));


