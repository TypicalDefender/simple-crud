const express = require('express');
const app = express.Router();
const {
    User,
    validate
} = require('../models/cmodel');
const redis = require('redis');

const redisPort = process.env.redisPort || 6379;

const client = redis.createClient(redisPort);


//cache implementation
function readCache(req, res, next) {
    const {
        email
    } = req.params;
    console.log("cache");
    client.get(email, (err, data) => {
        if (err) throw err;

        if (data !== null) {
            res.status(200).send(data);
        } else {
            next();
        }
    });
}

//read through cache [get specific email data]
app.get('/data/:email', readCache, async (req, res, next) => {
    console.log(req.params.email);
    console.log("not cache");
    if (!req.params.email) {
        return res.status(404).send("missing paramater");
    }
    const {
        email
    } = req.params;
    const userData = await User.find({
            email
        })
        .select({
            _id: 0,
            __v: 0,
            password: 0
        });

    if (!userData.length) {
        console.log("no data");
        return res.status(404).send("data not found");
    }
    return res.status(200).send(userData);
});

//requires authorization to get all users (haven't implemented authorization)
app.get('/data', async(req, res)=>{
    try{
       const data = await User.find({})
                              .select({_id : 0, password : 0, __v : 0})
                              .limit(10);
       console.log(data);
       if(!data){
           return res.status(404).send("No data found at this moment");
       }
       res.status(200).send(data);
    }
    catch(err){
       console.log(err);
    }
})

//write cache implemented
app.post('/data', async (req, res, next) => {
    try {
        const {
            error
        } = validate(req.body);
        if (error) {
            return res.status(400).send('Invalid format');
        }
        let user = await User.findOne({
            email: req.body.email
        });

        console.log(user);
        if (user) {
            return res.status(400).send("user already exist");
        }
        client.setex(req.body.email, 3000, req.body.name);
        user = new User({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        });
        await user.save();
        res.status(200).send("user data saved");
    } catch (err) {
        console.log("the error is", err);
    }
});

//write cache
app.put('/data/:email', async (req, res, next) => {
    try {
        const {
            email
        } = req.params;
        // req.body.email = email;
        const userData = await User.findOne({
            email
        });
        if (!userData) {
            return res.status(404).send("details not found to update");
        }
        const {
            name,
            password
        } = req.body;
        client.get(email, (err, data) => {
            if (data) {
                if (data.name == req.body.name) {
                    return res.status(400).send("same as previous data");
                }
            }
        });
        if (!email) {
            return res.status(404).send("email not found");
        }
        const toUpdate = await User.updateOne({
            email
        }, {
            $set: {
                name,
                password
            },
            upsert: true
        });
        return res.status(200).send("Details updated successfully");
    } catch (err) {
        console.log(err);
    }
});


//write back cache
app.delete('/data/:email', async (req, res) => {
    try {
        const {
            email
        } = req.params;
        const userData = await User.findOne({
            email
        });
        client.del(email, (err, data) => {
            if (err) {
                console.log("data is not in the cache to delete");
            }
            console.log("deleted from cache");
        });
        if (!userData) {
            return res.status(404).send("nothing to delete");
        }
        const deleteRes = await User.remove({
            email
        });
        return res.status(200).send("data deleted");
    } catch (err) {
        console.log(err);
    }
})
module.exports = app;