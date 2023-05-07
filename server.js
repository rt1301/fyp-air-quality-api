require('dotenv').config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require('cors');
const axios = require("axios");
const path = require("path");
const PORT = process.env.PORT || 5000;

app.use(cors());

const { MongoClient } = require("mongodb");

const dbURL = process.env.MONGO_URL;

const client = new MongoClient(dbURL);

client.connect()
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch(error => console.log('Failed to connect', error))

app.use(express.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

const fetchGasValue = async () => {
    try {

        const res = await axios.get("https://blr1.blynk.cloud/external/api/get?token=fjKm-hTPsySPxRo1RrWIo6qwzogruKLC&V2");
        
        return res.data;
        
    } catch (error) {
        console.log(error);
        return 5;
    }
}

const fetchTemperatureValue = async () => {
    try {

        const res = await axios.get("https://blr1.blynk.cloud/external/api/get?token=fjKm-hTPsySPxRo1RrWIo6qwzogruKLC&V3");
        
        return res.data;
        
    } catch (error) {
        console.log(error.message);
        return 30;
    }
}

app.get("/", (req, res) => {
    res.sendFile('./index.html', { root: __dirname })
})

app.get("/api/listAll", async (req, res) => {
    try {
        const db = client.db("airQualitySystem")
        const collection = db.collection("parameters")
        const data = await collection.find({});
        let finalData = [];
        for await (const doc of data) {
            finalData.push(doc);
        }
        return res.json({
            code:200,
            data: finalData
        });
    } catch (error) {
        return res.json({
            code: 400,
            error: error.message
        })
    }
})

app.post("/api/getDataRange", async (req, res) => {
    const { start, end } = req.body;
    try {
        const db = client.db("airQualitySystem")
        const collection = db.collection("parameters")
        const cursor = await collection.find({
            timestamp: {
                $gte: new Date(start),
                $lt: new Date(end),
            }
        })
        let finalData = [];
        for await (const doc of cursor) {
            finalData.push(doc);
        }
        return res.json({
            code: 200,
            data: finalData
        });

    } catch (error) {
        return res.json({
            code: 400,
            error: error.message
        })
    }
})

app.get("/api/getLatestVal", async (req, res) => {
    try {
        const db = client.db("airQualitySystem")
        const collection = db.collection("parameters")
        const cursor = collection.find().sort({ timestamp: -1 }).limit(1);
        let finalDoc = [];

        for await (const doc of cursor) {
            finalDoc.push(doc);
        }

        return res.json({
            code: 200,
            data: finalDoc
        });

    } catch (error) {
        return res.json({
            code: 400,
            error: error.message
        })
    }
})

app.post("/api/sendData", async (req, res) => {
    try {
        const gas = await fetchGasValue();
        const temperature = await fetchTemperatureValue();
        const {longitude, latitude} = req.body;
        const db = client.db("airQualitySystem")
        const collection = db.collection("parameters")
        const doc = {
            timestamp: new Date(),
            airData: {
                gas: Number(parseFloat(gas + Math.random()).toFixed(3)),
                temperature: Number(parseFloat(temperature + Math.random()).toFixed(3)),
                longitude,
                latitude
            }
        }

        const data = await collection.insertOne(doc);

        if (data.acknowledged) {
            return res.json({
                code: 200,
                id: data.insertedId,
                msg: "Success"
            })
        } else {
            return res.json({
                code: 400,
                msg: "Data couldn't be sent"
            });
        }
    } catch (error) {
        console.log(error);
        res.json({
            code: 400,
            msg: "Server Error please try again"
        })
    }
})

app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
})