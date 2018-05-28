const express = require("express");
const URL = require("url-parse");
const app = express();
const https = require("https");
const hb = require("express-handlebars");
const csurf = require("csurf");
const cookieParcer = require("cookie-parser");
app.use(cookieParcer());
const bodyParser = require("body-parser");
app.use(
    bodyParser.urlencoded({
        extended: false
    })
);
const cookieSession = require("cookie-session");
app.use(
    cookieSession({
        secret: "the empire did nothing wrong", //gitignore this!
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

app.use(csurf());
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken(); ///csrfToken
    next();
});
const {
    getSignatures,
    getId,
    getLength,
    getSigners,
    insertUserInfo,
    getUserInfo,
    getUserSigId,
    insertUserProfile,
    getUserProfile,
    getSameCity,
    updateUser,
    updateProfile,
    updateUserPassword,
    getUserOnId,
    deleteSignature
} = require("./db.js");

const { hashPassword, checkPassword } = require("./bcrypt.js");
let error = null;

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(express.static(`${__dirname}/public`));

app.get("/logout", (req, res) => {
    console.log(req.session);
    req.session = null;
    res.redirect("/register");
});

app.get("/", (req, res) => {
    res.redirect("/logout");
});

const requireSignature = (req, res, next) => {
    if (req.session.signatureId) {
        next();
    } else {
        res.redirect("/petition");
    }
};

const hasSigned = (req, res, next) => {
    if (req.session.hasSigned) {
        res.redirect("/signed");
    } else {
        res.redirect("/petition");
    }
};

app.use((req, res, next) => {
    res.setHeader("X-Frame-Options", "DENY"); /// XFRAMEOPTION HEADER
    next();
});

app.get("/register", (req, res) => {
    res.render("registration", {
        layout: "layout"
    });
});

app.post("/register", (req, res) => {
    let first = req.body.firstname;
    let last = req.body.lastname;
    let mail = req.body.email;
    let pass = req.body.password;
    req.session.mail = mail;
    req.session.user = {
        first,
        last
    };
    if (first && last && mail && pass) {
        hashPassword(req.body.password).then(data => {
            insertUserInfo(first, last, mail, data)
                .then(id => {
                    req.session.userId = id.rows[0].id;
                    console.log(`redirecting to profile ${req.session.userId}`);
                    res.redirect("/profile");
                })
                .catch(e => {
                    console.log(e);
                    res.render("registration", {
                        layout: "layout",
                        error:
                            "This e-mail is already linked to an account! Please log in to sign the petition."
                    });
                });
        });
    } else {
        res.render("registration", {
            layout: "layout",
            error: "Please register before signing the petition, thanks!"
        });
    }
});

app.get("/login", (req, res) => {
    res.render("login", {
        layout: "layout"
    });
});

app.post("/login", (req, res) => {
    let insertedMail = req.body.email;
    let insertedPass = req.body.password;
    console.log("POST LOGIN");
    if (insertedMail && insertedPass) {
        getUserInfo(insertedMail)
            .then(pass => {
                if (pass.rows[0] != undefined) {
                    req.session.user = {
                        first: pass.rows[0].first,
                        last: pass.rows[0].last
                    };
                    req.session.userId = pass.rows[0].id;
                    let userPass = pass.rows[0].pass;
                    checkPassword(insertedPass, userPass)
                        .then(match => {
                            if (match) {
                                getUserSigId(insertedMail)
                                    .then(data => {
                                        let rawData = data.rows;
                                        let mailSigned = false;
                                        rawData.forEach(item => {
                                            if (item.mail === insertedMail) {
                                                req.session.mail = insertedMail;
                                                req.session.signatureId =
                                                    item.sigid;
                                                mailSigned = true;
                                            }
                                        });
                                        if (mailSigned) {
                                            console.log("REDIRECT TO SIGNED");
                                            res.redirect("/signed");
                                        } else {
                                            console.log("REDIRECT TO PETITION");
                                            res.redirect("/petition");
                                        }
                                    })
                                    .catch(e => {
                                        console.log(e);
                                    });
                            } else {
                                res.render("login", {
                                    layout: "layout",
                                    error:
                                        "Your password does not match the e-mail address. Please register before signing the petition, thanks!"
                                });
                            }
                        })
                        .catch(e => {
                            console.log(e);
                        });
                } else {
                    res.render("login", {
                        layout: "layout",
                        error:
                            "Your password or e-mail address is not correct. Please register before signing the petition, thanks!"
                    });
                }
            })
            .catch(e => {
                console.log(e);
            });
    } else {
        res.render("login", {
            layout: "layout",
            error: "Please log in to sign the petition, thanks!"
        });
    }
});

app.get("/profile", (req, res) => {
    res.render("profile", {
        layout: "layout",
        logged: req.session.userId
    });
});

app.post("/profile", (req, res) => {
    let age;
    if (req.body.age) {
        age = req.body.age;
    } else {
        age = null;
    }
    let user_id = req.session.userId;
    let city = req.body.city;
    let url = req.body.url;
    insertUserProfile(user_id, age, city, url)
        .then(profile => {
            req.session.user.age = age;
            req.session.user.city = city;
            req.session.user.homepage = url;
            res.redirect("/petition");
        })
        .catch(e => {
            console.log(e);
        });
});

app.get("/petition", (req, res) => {
    res.render("welcome", {
        layout: "layout",
        logged: req.session.userId,
        last: req.session.user.last
    });
});

app.post("/petition", (req, res) => {
    req.session.hasSigned = true;
    console.log(req.body);
    if (req.body.signature) {
        let sig = req.body.signature;
        let userId = req.session.userId;
        getSignatures(sig, userId).then(results => {
            let userId = results.rows[0].id;
            req.session.signatureId = userId;
            res.redirect("/signed");
        });
    } else {
        let error =
            "Somethting went wrong here, sorry about that. Please try again.";
        res.render("welcome", {
            layout: "layout",
            message: error,
            logged: req.session.userId
        });
    }
});

app.get("/signed", requireSignature, (req, res) => {
    getUserProfile()
        .then(profileData => {
            let lengthId = profileData.rowCount;
            getId(req.session.signatureId).then(source => {
                let imgSource = source.rows[0].signature;
                res.render("signed", {
                    layout: "layout",
                    source: imgSource,
                    length: lengthId,
                    logged: req.session.userId
                });
            });
        })
        .catch(e => {
            console.log(e);
        });
});

app.get("/changeProfile", (req, res) => {
    getUserOnId(req.session.userId).then(info => {
        let userInfo = info.rows[0];
        console.log(userInfo);
        res.render("changeProfile", {
            layout: "layout",
            info: userInfo,
            logged: req.session.userId
        });
    });
});

app.post("/changeProfile", requireSignature, (req, res) => {
    let first = req.body.firstname;
    let last = req.body.lastname;
    let email = req.body.email;
    let id = req.session.userId;
    let pass = req.body.password;
    let age;
    if (!req.body.age) {
        age = null;
    } else {
        age = req.body.age;
    }
    let city = req.body.city;
    let homepage = req.body.homepage;
    if (!pass) {
        updateUser(first, last, email, id)
            .then(data => {
                updateProfile(id, age, city, homepage).then(result => {
                    req.session.first = first;
                    req.session.last = last;
                    req.session.email = email;
                    res.redirect("/signed");
                });
            })
            .catch(e => {
                console.log(e);
                console.log(`this is an error`);
                getUserOnId(req.session.userId).then(info => {
                    let userInfo = info.rows[0];
                    console.log(userInfo);
                    res.render("changeProfile", {
                        layout: "layout",
                        info: userInfo,
                        logged: req.session.userId,
                        error: "Please fill out all mandatory fields!"
                    });
                });
            });
    } else {
        hashPassword(pass)
            .then(data => {
                console.log(`THIS IS THE HASHED PASSWORD${data}`);
                updateUserPassword(first, last, email, id, data).then(info => {
                    console.log(info);
                    updateProfile(id, age, city, homepage).then(result => {
                        req.session.first = first;
                        req.session.last = last;
                        req.session.email = email;
                        res.redirect("/signed");
                    });
                });
            })
            .catch(e => {
                console.log(e);
            });
    }
});

app.get("/deleteSignature", (req, res) => {
    console.log(req.session.userId);
    deleteSignature(req.session.userId)
        .then(() => {
            req.session.hasSigned = false;
            console.log("DELETING SIGNATURE");
            res.redirect("/petition");
        })
        .catch(e => {
            console.log(e);
        });
});

app.get("/signers", requireSignature, (req, res) => {
    getUserProfile()
        .then(profileData => {
            let signerNames = [];
            let numSigners = profileData.rowCount;
            for (var i = 0; i < numSigners; i++) {
                let signer = {};
                signer.first = profileData.rows[i].first;
                signer.last = profileData.rows[i].last;
                signer.age = profileData.rows[i].age;
                signer.city = profileData.rows[i].city;
                signer.homepage = profileData.rows[i].homepage;
                signerNames.push(signer);
            }
            res.render("signers", {
                layout: "layout",
                signerNames: signerNames,
                logged: req.session.userId
            });
        })
        .catch(e => {
            console.log(e);
        });
});

app.get("/signers/:city", requireSignature, (req, res) => {
    getSameCity(req.params.city)
        .then(data => {
            let signerNames = [];
            let numSigners = data.rowCount;
            for (var i = 0; i < numSigners; i++) {
                let signer = {};
                signer.first = data.rows[i].first;
                signer.last = data.rows[i].last;
                signer.age = data.rows[i].age;
                signer.homepage = data.rows[i].homepage;
                signerNames.push(signer);
            }
            res.render("city", {
                layout: "layout",
                signerNames: signerNames,
                logged: req.session.userId
            });
        })
        .catch(e => {
            console.log(e);
        });
});

app.get("/user/:website", requireSignature, (req, res) => {
    let website = req.params.website;
    website = new URL(website);
    console.log(website);
    if (!website.protocol) {
        website.protocol = "https://";
        res.redirect(`${website.protocol}${website.pathname}`);
    } else {
        console.log(website);
        res.redirect(`${website.protocol}${website.pathname}`);
    }
});

////////////////LISTEN ON HEROKU PORT 8080////////////////////////
app.listen(process.env.PORT || 8080, () => {
    console.log("Listening");
});
