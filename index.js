const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// middleware 

app.use(cors());
app.use(express.json());


// middleWare 
const verifyToken = (req, res, next) => {
    const tokenWithBearer = req.headers.authorization;

    if (!tokenWithBearer) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = tokenWithBearer.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
        }

        req.decoded = decoded;

        next();
    })

};



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

        //middleware for use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await bistroBossUsers.findOne(query);
            const isAdmin = user.role === 'Admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }

        // jwt 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: 60 * 60 });
            res.send({ token });
        })

        // this post is working in the (SocialLogin.jsx and SignUp.jsx ) Component for save users in users collection
        app.post('/users', async (req, res) => {
            const data = req.body;
            const email = data.email;
            const query = { email: email };
            const existingUser = await bistroBossUsers.findOne(query);
            if (existingUser) {
                return res.send({
                    message: 'user already exits', insertedId: null
                })
            }
            const result = await bistroBossUsers.insertOne(data);
            res.send(result);
        })


        // this get for show data of all users and using from (AllUsers.jsx) 
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await bistroBossUsers.find().toArray();
            res.send(result);
        })

        // this delete for deleting user from users collection using from (AllUsers.jsx)
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bistroBossUsers.deleteOne(query);
            res.send(result);
        })

        // this patch for make an admin and updating data in users collection from (AllUsers.jsx)
        app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'Admin'
                }
            }
            const result = await bistroBossUsers.updateOne(filter, updateDoc);
            res.send(result);
        })

        // this is for admin validation for (useAdmin.jsx )
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await bistroBossUsers.findOne(query);
            let admin = false;
            if (user) {
                admin = user.role === "Admin"
            }
            res.send({ admin });
        })

        app.get('/menu', async (req, res) => {
            const result = await myMenuCollection.find().toArray();
            res.send(result);
        })

        // this post is using for posting foodCardData in menu collection from (AddItems.jsx)
        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const menuData = req.body;
            const result = await myMenuCollection.insertOne(menuData);
            res.send(result);
        })

        // this get is using for find a specific data by id from menu collection in (Routes.jsx and UpdateItem.jsx)
        app.get('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await myMenuCollection.findOne(query);
            res.send(result);

        })

        // this delete is using for delete foodCardData from menu collection in (ManageItem.jsx) 
        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await myMenuCollection.deleteOne(query);
            res.send(result);
        })

        // this patch is using for update foodCardData from menuCollection in (UpdateItem.jsx)
        app.patch('/menu/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    name: data.name,
                    recipe: data.recipe,
                    image: data.image,
                    category: data.category,
                    price: data.price,
                }
            }
            const result = await myMenuCollection.updateOne(filter, updatedDoc);
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

        // payment intent (CheckoutForm.jsx)
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
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