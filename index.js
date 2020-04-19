//MEN(MongoDB, express, Nodejs) Stack 
// const config = require('config');
const mongoose = require('mongoose');
const express = require('express');
const app = express();
const crud = require('./routes/crud');
const morgan = require('morgan');
const config = require('config');


//mongo connection
(async function setDB() {
    try {
        const data = config.get(app.get('env'));
        console.log(data.MONGO_URI);
        // const { MONGO_URI } = process.env.NODE_ENV;
        await mongoose.connect(data.MONGO_URI);
        console.log("Database connected");
    } catch (err) {
        console.log(err);
    }
})();

//http verbs for development environment
if (app.get('env') == 'development') {
    app.use(morgan('tiny'))
}
app.use(express.json());
//crud apis
app.use('/api', crud);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Magic Happens on ${port}...`));