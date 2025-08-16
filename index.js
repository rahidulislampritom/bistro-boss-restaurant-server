const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// middleware 

app.use(cors());
app.use(express.json());


// 
// 
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.v3edin0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

        const bistroBossUsers = client.db("bistroDb").collection('users');
        const myMenuCollection = client.db("bistroDb").collection('menu');
        const reviewCollection = client.db("bistroDb").collection('reviews');
        const cardCollection = client.db("bistroDb").collection('carts');


        app.post('/users', async (req, res) => {
            const data = req.body;
            const result = await bistroBossUsers.insertOne(data);
            res.send(result);
        })

        app.get('/menu', async (req, res) => {
            const result = await myMenuCollection.find().toArray();
            res.send(result);
        })
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result)
        })

        // working for (FoodCard) component to add card and user info to db 
        app.post('/carts', async (req, res) => {
            const cartData = req.body;
            const result = await cardCollection.insertOne(cartData);
            res.send(result);
        })
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await cardCollection.find(query).toArray();
            res.send(result);
        })

        // delete from (cart.jsx) component cart item 
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cardCollection.deleteOne(query);
            res.send(result);
        })

    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('boss is sitting live');
});

app.listen(port, () => {
    console.log(`this is running from ${port}`);
});