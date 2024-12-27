const express = require("express")
const app = express()
const userModel = require("./models/user")
const postModel = require("./models/post")
const cookieParser = require("cookie-parser")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")


app.set("view engine", "ejs")
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())

app.get("/", (req, res)=>{
    res.render("index")
})

app.get("/login", (req, res)=>{
    res.render("login")
})

app.get("/logout", (req, res)=>{
    res.cookie("token" ,"")
    res.redirect("/login")
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
                    res.send("SignedUp");
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
    let { email, password } = req.body;
    try {
        let user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).send("Somthing Went Wrong");
        }
        bcrypt.compare(password, user.password, (err, result)=>{
            if(result){
                res.status(200).send("You Are logged in !")
            }else{
                res.redirect('/login')
            }
        })
        
    } catch (err) {
        res.status(500).send("Server error");
    }
});






app.listen(3000)