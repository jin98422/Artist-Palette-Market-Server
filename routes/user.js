const express = require('express');
require('dotenv').config();
const jwt = require('jsonwebtoken')
const router =  express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sgMail = require('@sendgrid/mail');

const User = require('../database/User');
const { REDIRECTHOST, HOST, SENDGRID_EMAIL  } = process.env;

let uploadStorage = multer.diskStorage({
    destination: function(req, file, callback) {
        console.log(file)
        callback(null, "./public/user")
    },
    filename: function(req, file, callback) {
        callback(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
    }
})

let upload = multer({storage: uploadStorage})

const { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_LIFE, SENDGRID_API_KEY } = process.env;

sgMail.setApiKey(SENDGRID_API_KEY);

router.post('/check', (req, res) => {  
    const { email } = req.body 
    User.find({email: email}).then(doc => {
        res.status(200).json({active: doc[0].active})
    }).catch(err => {
        res.status(500).json(err)
    })
});

router.post('/', (req, res) => {
    console.log("get specify user")  
    const { email } = req.body
 console.log(email)
 User.find({email: email}).then(doc => {
     console.log(doc)
     if(doc[0].photo != "") {
        var bitmap = fs.readFileSync(doc[0].photo);
        let encoded = new Buffer(bitmap).toString('base64');
        res.json({
            path: encoded,
            data: doc[0]
        })
     } else {
        res.json({
            data: doc[0]
        })
     }
    
 }).catch(err => {
     res.json(err)
 })
})

router.post('/login', async (req,res) => {
    console.log("login users")  
    const { email, password } = req.body;
    console.log(req.body)
    User.find({email: email, password: password})
    .then((doc) => {
        if(doc.length != 0) {
            if(doc[0].active) {
                const userInfo = {
                    "first_name": doc[0].first_name,
                    "last_name":  doc[0].last_name,
                    "email": email,
                    "password": password
                }
                // do the database authentication here, with user name and password combination.
                console.log(ACCESS_TOKEN_LIFE)
                const token = jwt.sign(userInfo, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_LIFE})
                const response = {
                    "token": token,
                }
                User.update({email: email, password: password}, {
                    "token": token
                }).then(doc => {
                    res.status(200).json(response);
                }).catch(err => {
                    res.status(500).json(err)
                })
            } else {
                res.status(401).send('not confirm')
            }
        } else {
            res.status(404).send('Invalid request')
        }
    })
    .catch(err => {
        console.log(err);
        res.status(404).json(err)
    }); 
})

router.post('/forgot', async (req,res) => {
    console.log("forgot users")  
    const { email } = req.body; 
    User.find({email: email})
    .then((doc) => {
        if(doc.length != 0) {
            const userInfo = {
                "first_name": doc[0].first_name,
                "last_name":  doc[0].last_name,
                "email": email,
            }
            // do the database authentication here, with user name and password combination.
            console.log(ACCESS_TOKEN_LIFE)
            const token = jwt.sign(userInfo, ACCESS_TOKEN_SECRET)
            let link = `${REDIRECTHOST}/api/user/forgot/${token}`;
            const msg = {
                to: `${email}`,
                from: `Palette Market <${SENDGRID_EMAIL}>`,
                subject: 'Confirm reset password on Palette Market',
                html: `You must follow this link to reset your password:<br /><a href='${link}' target='_blank'>${link}<a>`
            };
            sgMail.send(msg).then(() => {
                res.status(200).send("Confirm Email Sent");
            }).catch((error) => {
                console.log(error.response.body)
                res.status(500).json(err)
            })
        } else {
            res.status(404).send('Invalid request')
        }
    })
    .catch(err => {
        console.log(err);
        res.status(404).json(err)
    }); 
})

router.get('/forgot/:token', (req, res) => {
    console.log(req.params)
    jwt.verify(req.params.token, ACCESS_TOKEN_SECRET, function(err, decoded) {
        if (err) {
            if(err.name == "TokenExpiredError") {
                return res.send("This link expired! please register again")
            } else {
                return res.json(err);
            }
        }
        const userInfo = {
            "first_name": decoded.first_name,
            "last_name": decoded.last_name,
            "email": decoded.email,
        }
        const token = jwt.sign(userInfo, ACCESS_TOKEN_SECRET, {expiresIn: ACCESS_TOKEN_LIFE})
        return res.redirect(`${HOST}/forgot/${token}`);
    })
});

router.post('/register', (req, res) => {
    console.log("register users")  
    const { email, password, first_name, last_name } = req.body;
    const userInfo = {
        "first_name": first_name,
        "last_name": last_name,
        "email": email,
        "password": password
    }
    const token = jwt.sign(userInfo, ACCESS_TOKEN_SECRET)
    let user = new User({ 
        email: email, 
        password: password, 
        first_name: first_name, 
        last_name: last_name,
        token: token
    });
    // do the database authentication here, with user name and password combination.
    User.find({email: email})
        .then((doc) => {
            if(doc.length == 0) {
                user.save().then(userInfo => {
                    console.log(userInfo)
                })
                .catch(err => {
                    console.log(err);
                    return res.status(500).json(err)
                })
                let link = `${REDIRECTHOST}/api/user/account/${token}`;
                const msg = {
                    to: `${email}`,
                    from: `Palette Market <${SENDGRID_EMAIL}>`,
                    subject: 'Confirm your account on Palette Market',
                    html: `Thanks for singing up with Palette Market! You must follow this link to active your account:<br /><a href='${link}' target='_blank'>${link}<a>`
                };
                sgMail.send(msg).then(() => {
                    res.status(200).send("Confirm Email Sent");
                }).catch((error) => {
                    console.log(error.response.body)
                    res.status(500).json(err)
                })
            } else {
                res.status(409).send('Email existing!')
            }
        })
        .catch(err => {
            console.log(err);
            res.status(500).json(err)
        });
});

router.get('/account/:token', (req, res) => {
    console.log(req.params)
    jwt.verify(req.params.token, ACCESS_TOKEN_SECRET, function(err, decoded) {
        if (err) {
            if(err.name == "TokenExpiredError") {
                return res.send("This link expired! please register again")
            } else {
                return res.json(err);
            }
        }
        const userInfo = {
            "first_name": decoded.first_name,
            "last_name": decoded.last_name,
            "email": decoded.email,
            "password": decoded.password
        }
        const token = jwt.sign(userInfo, ACCESS_TOKEN_SECRET, {expiresIn: ACCESS_TOKEN_LIFE})
        return res.redirect(`${HOST}/thanks/${token}`);
    })
});

router.post('/update', upload.single("file"), (req, res) => {
    const {preEmail, email, type, firstName, lastName, instagram, hometown, website, about } = req.body;
    
    let path = ""
    let encoded = ""
    if(req.file) {
        path = req.file.path;
        var bitmap = fs.readFileSync(req.file.path);
        encoded = new Buffer(bitmap).toString('base64');
    }

    let updatDoc = {};    
    if(path == "") {
        updatDoc = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            about: about,
            type: type,
            instagram: instagram,
            hometown: hometown,
            website: website,
        }
    } else {
        updatDoc = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            photo: path,
            about: about,
            type: type,
            instagram: instagram,
            hometown: hometown,
            website: website,
        }
    }

    User.update({email: preEmail}, updatDoc).then(doc => {
        console.log("document", doc)        
        res.status(200).json({
            data: encoded
        })
    }).catch(err => {
        res.status(500).json(err)
    })
});

router.post('/setInfo', (req, res) => {
    const { email, username, payment } = req.body;
    User.find({username: username})
    .then((doc) => {
        if(doc.length == 0) {
            User.update({email: email}, {
                username: username,
                payment: payment,
                active: true,
            }).then(doc => {
                res.status(200).json(doc)
            }).catch(err => {
                res.status(500).json(err)
            })
        } else {
            res.status(409).send('Username existing!')
        }
    }).catch(err => {
        res.status(500).json(err)
    })
    
})

router.post('/reset', (req, res) => {
    const { email, password } = req.body;
    User.update({email: email}, {
        password: password,
    }).then(doc => {
        res.status(200).json(doc)
    }).catch(err => {
        res.status(500).json(err)
    })    
})

module.exports = router;

