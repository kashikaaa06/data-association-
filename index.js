const express = require("express");
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Home route
app.get("/", (req, res) => {
    res.render("index");
});

// Register route
app.post("/register", async (req, res) => {
    try {
        let { email, password, name, age, username } = req.body;
        
        console.log(" Register route hit");
        console.log("Data received:", { name, username, email, age });
        
        // Check if user already exists
        let user = await userModel.findOne({ $or: [{ email }, { username }] });
        
        if (user) {
            console.log("❌ User already exists");
            return res.status(400).send("User already exists. Try another email or username.");
        }
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        console.log("🔐 Password hashed successfully");
        
        // Create user in database
        const newUser = await userModel.create({
            name,
            username,
            email,
            password: hash,
            age
        });
        
        console.log(" User created successfully:", newUser.email);
         const token = jwt.sign(
            { email: newUser.email, userid: newUser._id }, 
            "xyz", 
            { expiresIn: "1h" }
        );
        
      
        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        // Send success response
        res.status(201).send(" Registration successful! You can now login.");
        
    } catch (err) {
        console.error("Error during registration:", err.message);
        res.status(500).send("Error: " + err.message);
    }
});


// Start server
app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});