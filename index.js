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

// Middleware - Check if logged in
function isloggedin(req, res, next) {
    if (!req.cookies.token || req.cookies.token === "") {
        return res.redirect("/login");
    }
    try {
        let data = jwt.verify(req.cookies.token, "xyz");
        req.user = data;
        next();
    } catch (err) {
        return res.send("You must be logged in");
    }
}

// ========== GET ROUTES ==========

// Register Page
app.get("/register", (req, res) => {
    res.render("index");
});

// Login Page
app.get("/login", (req, res) => {
    res.render("login");
});

// Logout
app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login");
});

// Profile Page (Show posts)
app.get("/profile", isloggedin, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate("posts");
    res.render("profile", { user });
});

// Edit Post Page
app.get("/edit/:postid", isloggedin, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.postid });
    res.render("edit", { post });
});

// Like/Unlike Post
app.get("/like/:postid", isloggedin, async (req, res) => {
    try {
        let post = await postModel.findOne({ _id: req.params.postid });

        if (!post.likes) {
            post.likes = [];
        }

        let userIndex = post.likes.indexOf(req.user.userid);

        if (userIndex === -1) {
            post.likes.push(req.user.userid);
        } else {
            post.likes.splice(userIndex, 1);
        }

        await post.save();
        res.redirect("/profile");

    } catch (err) {
        console.error("Error:", err.message);
        res.redirect("/profile");
    }
});

// Delete Post
app.get("/delete/:postid", isloggedin, async (req, res) => {
    await postModel.findOneAndDelete({ _id: req.params.postid });
    res.redirect("/profile");
});

// ========== POST ROUTES ==========

// Register
app.post("/register", async (req, res) => {
    try {
        let { email, password, name, age, username } = req.body;

        let user = await userModel.findOne({ $or: [{ email }, { username }] });

        if (user) {
            return res.status(400).send("User already exists");
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const newUser = await userModel.create({
            name,
            username,
            email,
            password: hash,
            age
        });

        const token = jwt.sign(
            { email: newUser.email, userid: newUser._id },
            "xyz",
            { expiresIn: "1h" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            maxAge: 60 * 60 * 1000
        });

        res.status(201).send("Registration successful!");

    } catch (err) {
        console.error("Error:", err.message);
        res.status(500).send("Error: " + err.message);
    }
});

// Login
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

                res.cookie("token", token, {
                    httpOnly: true,
                    maxAge: 60 * 60 * 1000
                });

                res.redirect("/profile");
            } else {
                res.status(400).send("Invalid email or password");
            }
        });

    } catch (err) {
        res.status(500).send("Error: " + err.message);
    }
});

// Create Post
app.post("/profile", isloggedin, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let { content } = req.body;

    let post = await postModel.create({
        user: user._id,
        content: content
    });

    user.posts.push(post._id);
    await user.save();

    res.redirect("/profile");
});

// Update Post
app.post("/edit/:postid", isloggedin, async (req, res) => {
    let { content } = req.body;
    await postModel.findOneAndUpdate(
        { _id: req.params.postid },
        { content: content }
    );
    res.redirect("/profile");
});

// Start Server
app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});