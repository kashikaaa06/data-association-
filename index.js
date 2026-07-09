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

function isloggedin(req, res, next) {
  
   if (!req.cookies.token || req.cookies.token === "") {
       return res.redirect("/login");
   } 
   try {
       let data = jwt.verify(req.cookies.token, "xyz");
       req.user = data;
       next();
   } catch (err) {
       
       return res.send("you must be logged in");
   }
}

// Home route
app.get("/register", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

app.get("/profile", isloggedin, async (req, res) => {
   let user = await userModel.findOne({email: req.user.email});
    console.log(req.user);
    res.render("profile", { user });
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
            console.log(" User already exists");
            return res.status(400).send("User already exists. Try another email or username.");
        }
        
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        console.log(" Password hashed successfully");
        
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
            maxAge: 60 * 60 * 1000 
        });

      
        res.status(201).send(" Registration successful! You can now login.");
        
    } catch (err) {
        console.error("Error during registration:", err.message);
        res.status(500).send("Error: " + err.message);
    }
});


app.post("/login", async (req, res) => {
    try {
        let { email, password } = req.body;
        
      
        
        let user = await userModel.findOne({ email });
        
        if (!user) {
           
            return res.status(400).send("Invalid email or password");
        }
        

        
        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
              
                return res.status(500).send("Internal server error");
            }
            
            if (result) {
               
                const token = jwt.sign(
                    { email: user.email, userid: user._id },
                    "xyz",
                    { expiresIn: "1h" }
                );
                
                // Set cookie
                res.cookie("token", token, {
                    httpOnly: true,
                    maxAge: 60 * 60 * 1000 
                });
                
                res.status(200).redirect("/profile");
            } else {
                
                res.status(400).send("Invalid email or password");
            }
        });
        
       
        
    } catch (err) {
       
        res.status(500).send("Error: " + err.message);
    }
});

// Start server
app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});