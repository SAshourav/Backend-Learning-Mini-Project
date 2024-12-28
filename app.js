const express = require("express")
const app = express()
const userModel = require("./models/user")
const postModel = require("./models/post")
const cookieParser = require("cookie-parser")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const path = require("path")
const multer = require("multer")


app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/images/upload'); // Destination folder
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(12, function (err, bytes) {
      if (err) return cb(err); // Handle error from randomBytes
      const fn = bytes.toString('hex') + path.extname(file.originalname); // Correctly get file extension
      cb(null, fn); // Pass generated filename to multer
    });
  }
});

const upload = multer({ storage: storage });

module.exports = upload; // Export to use in routes


app.get("/", (req, res)=>{
    res.render("index")
})
app.get("/test", (req, res)=>{
    res.render("test")
})
app.post("/upload",upload.single("image"), (req, res)=>{
    console.log(req.file) // req.body te shudhu text part gula thake , i mean text input
    res.redirect("/test")
})

app.get("/login", (req, res)=>{
    res.render("login")
})

app.get("/logout", (req, res)=>{
    res.cookie("token" ,"")
    res.redirect("/login")
})
app.get("/profile", isLoggedIn, async (req, res) => {
    try {
        // Fetch the user and populate posts
        let user = await userModel.findOne({ email: req.user.email }).populate("posts");

        if (!user) {
            return res.status(404).send("User not found");
        }

        res.render("profile", { user });
    } catch (err) {
        console.error("Error loading profile:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
    try {
        // Fetch the user and populate posts
        let post = await postModel.findOne({ _id: req.params.id }).populate("user")

        if(post.likes.indexOf(req.user.userid) === -1){
            post.likes.push(req.user.userid)
        }else{
            post.likes.splice(post.likes.indexOf(req.user.userid), 1)
        }
        await post.save()
        res.redirect("/profile")
    } catch (err) {
        console.error("Error loading profile:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
    try {
        let post = await postModel.findOne({ _id: req.params.id }).populate("user")
        res.render("edit", {post})
    } catch (err) {
        console.error("Error loading profile:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
    try {
        let post = await postModel.findOneAndUpdate({ _id: req.params.id }, {content: req.body.content})
        res.redirect("/profile")
    } catch (err) {
        console.error("Error loading profile:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/addpost",isLoggedIn,async (req,res)=>{
    let user = await userModel.findOne({email: req.user.email})
    let {content} = req.body
    let post = await postModel.create({
        user: user._id,
        content
    })

    user.posts.push(post._id)
    await user.save()
    res.redirect('/profile')
})

app.post("/register", async (req, res) => {
    let { email, password, username, name, age } = req.body;
    try {
        let user = await userModel.findOne({ email });
        if (user) {
            return res.status(400).send("User already registered");
        }

        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                return res.status(500).send("Error generating salt");
            }

            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) {
                    return res.status(500).send("Error hashing password");
                }

                try {
                    let newUser = await userModel.create({
                        username,
                        email,
                        age,
                        name,
                        password: hash
                    });

                    let token = jwt.sign({ email, userid: newUser._id }, "shhh");
                    res.cookie("token", token, { httpOnly: true });
                    res.redirect("profile");
                } catch (err) {
                    res.status(500).send("Error creating user");
                }
            });
        });
    } catch (err) {
        res.status(500).send("Server error");
    }
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).send("Invalid email or password.");
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                return res.status(500).send("Error during password validation.");
            }

            if (result) {
                const token = jwt.sign({ email, userid: user._id }, "shhh");
                res.cookie("token", token, { httpOnly: true });
                return res.status(200).redirect("profile");
            } else {
                return res.status(400).send("Invalid email or password.");
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error.");
    }
});


function isLoggedIn(req, res, next) {
    const token = req.cookies.token; // Corrected: use req.cookies
    if (!token) {
        return res.redirect("/login"); // Redirect if token is missing
    }

    try {
        const data = jwt.verify(token, "shhh");
        req.user = data; // Attach user data to the request
        next();
    } catch (err) {
        console.error("Invalid token:", err);
        return res.redirect("/login"); // Redirect if token is invalid
    }
}

app.get("/homepage", isLoggedIn, async (req, res) => {
    try {
        // Fetch all posts and populate user information
        let posts = await postModel.find().populate("user");

        if (!posts) {
            return res.status(404).send("No posts available.");
        }

        // Pass posts and user to the view
        res.render("homepage", { posts, user: req.user });
    } catch (err) {
        console.error("Error fetching posts:", err);
        res.status(500).send("Internal Server Error");
    }
});







app.listen(3000)