const express = require('express');
const router =  express.Router();
const multer = require('multer');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const request = require('request-promise');

const { API_KEY } = process.env;

const Artwork = require('../database/Artwork');

let uploadStorage = multer.diskStorage({
    destination: function(req, file, callback) {
        console.log(file)
        callback(null, "./public/artwork")
    },
    filename: function(req, file, callback) {
        callback(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname))
    }
})

let upload = multer({storage: uploadStorage})

router.use(require('../tokenChecker'))

router.get('/', (req, res) => {
    let email = req.decoded.email;
    if(req.query.id) {
        Artwork.find({product_id: req.query.id}).then(doc => {
            res.status(200).json(doc)
        }).catch(err => {
            res.status(500).json(err)
        })
    } else {
        Artwork.find({email: email}).then(doc => {
            res.status(200).json(doc)
        }).catch(err => {
            res.status(500).json(err)
        })
    }   
});

router.post('/checkDPI', upload.single("file"), (req, res) => {
    console.log(req.decoded)
    Jimp.read(req.file.path).then(image => {
        console.log(image);
        if(image._exif && image._exif.tags.XResolution >= 300) {
            fs.unlink(req.file.path, function(err){
                if(err) throw err;
                console.log('deleted')
            })
            res.send(true)
        } else {
            fs.unlink(req.file.path, function(err){
                if(err) throw err;
                console.log('deleted')
            })
            res.send(false)
        }
    })
});

router.get('/tags', async (req, res) => {   
    let url=`${API_KEY}products.json?fields=tags`;    
    let getProductTagsOptions = {
        method: 'GET',
        uri: url,
        json: true,
        headers: {
            'content-type': 'application/json'
        }
    };
    await request(getProductTagsOptions).then(response => {
        console.log(response)
        res.status(200).json(response)   
    }).catch(err => {
        console.log(err)
        res.status(500).json(err)
    })
    
});

router.get('/orders', async (req, res) => {   
    let url=`${API_KEY}orders.json?status=any`;    
    let getProductTagsOptions = {
        method: 'GET',
        uri: url,
        json: true,
        headers: {
            'content-type': 'application/json'
        }
    };
    await request(getProductTagsOptions).then(response => {
        res.status(200).json(response)   
    }).catch(err => {
        console.log(err)
        res.status(500).json(err)
    })    
});

router.post('/upload', upload.single("file"), async (req, res) => {
    let {
        title,
        vendor,
        variants,
        date,
        tags,
        description,
        artType,
    } = req.body

    console.log(req.file)
    let src = [];
    if(req.file != undefined || req.file != null) {
            var bitmap = fs.readFileSync(req.file.path);
            let encoded = new Buffer(bitmap).toString('base64');
            src.push({
                'attachment': encoded
            })
            fs.unlink(req.file.path, function(err){
                if(err) throw err;
                console.log('deleted')
            })
    }

    let variantObj = [];
    let reqVariants = JSON.parse(variants)
    reqVariants.map((variant) => {
        variantObj.push({
            "option1": variant.size,
            "option2": "Art Print",
            "option3": date,
            "price": variant.price
        })
    })
    console.log("reqVariants", reqVariants)
    if(req.query.id) {
        let url=`${API_KEY}products/${req.query.id}.json`;
        let update_product = {};
        if(src.length == 0) {
            update_product = {
                "product": {
                    "id": req.query.id,
                    "title": title,
                    "body_html": description,
                    "vendor": vendor,
                    "product_type": artType,
                    "tags": tags,
                    "variants": variantObj,
                    "options": [
                        {
                            "name": "Size"
                        },
                        {
                            "name": "Canvas Material",
                        },
                        {
                            "name": "Date",
                        }
                    ]
                }
            }
        } else {
            update_product = {
                "product": {
                    "id": req.query.id,
                    "title": title,
                    "body_html": description,
                    "vendor": vendor,
                    "product_type": artType,
                    "tags": tags,
                    "images":src,
                    "variants": variantObj,
                    "options": [
                        {
                            "name": "Size"
                        },
                        {
                            "name": "Canvas Material",
                        },
                        {
                            "name": "Date",
                        }
                    ]
                }
            }
        }
        
        let updateProductOptions = {
            method: 'PUT',
            uri: url,
            json: true,
            resolveWithFullResponse: true,
            headers: {
                'content-type': 'application/json'
            },
            body: update_product
        };
        let email = req.decoded.email;
        console.log(email)
        await request.put(updateProductOptions).then(response => {
            console.log("edit", src.length)
            let product_id =  response.body.product.id;
            let artwork = {};
            if(src.length == 0) {
                artwork = {title: title, vendor: vendor, artType: artType, variants: reqVariants, tags: tags, description: description, email: email, product_id: product_id}
            } else {
                let filePaths = response.body.product.images[0].src;
                console.log(filePaths)
                artwork = {title: title, vendor: vendor, artType: artType, variants: reqVariants, tags: tags, description: description, email: email, file: filePaths, product_id: product_id}
            }
            console.log(artwork)
            Artwork.update({product_id: product_id}, artwork).then(doc => {
                res.status(200).json(doc)
            })
        }).catch(err => {
            console.log("artwork - error")
            res.status(500).json(err)
        })
    } else {
        let url=`${API_KEY}products.json`;
        let new_product = {
            "product": {
                "title": title,
                "body_html": description,
                "vendor": vendor,
                "product_type": artType,
                "tags": tags,
                "images":src,
                "variants": variantObj,
                "options": [
                    {
                        "name": "Size"
                    },
                    {
                        "name": "Canvas Material",
                    },
                    {
                        "name": "Date",
                    }
                ]
            }
        }
        let addProductOptions = {
            method: 'POST',
            uri: url,
            json: true,
            resolveWithFullResponse: true,
            headers: {
                'content-type': 'application/json'
            },
            body: new_product
        };
        let email = req.decoded.email;
        
        await request.post(addProductOptions).then(response => {
            let filePaths = response.body.product.images[0].src;
            let product_id =  response.body.product.id;
            let artwork = new Artwork({title: title, vendor: vendor, artType: artType, variants: reqVariants, tags: tags, description: description, email: email, file: filePaths, product_id: product_id})
            artwork.save().then(doc => {
                res.status(200).json(doc)
            })
        }).catch(err => {
            res.status(500).json(err)
        })
    }
});

router.get('/delete', async (req, res) => {
    let pro_id = req.query.id;
    console.log(pro_id)
    let url=`${API_KEY}products/${pro_id}.json`;
    let deleteOption = {
        method: 'DELETE',
        uri: url,
        json: true,
        headers: {
            'content-type': 'application/json'
        }
    }
    await request(deleteOption).then(response => {
        console.log(response)
        Artwork.deleteOne({product_id: pro_id})
        .then(doc => {
            res.status(200).json(doc)
        })
        .catch(err => {
            console.log("database delete error")
            res.status(500).json(err)
        })
    }).catch(err => {
        console.log("shopify delete error")
        res.status(500).json(err)
    })   
    
});

module.exports = router;

