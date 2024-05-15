const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const {MongoClient, ServerApiVersion, ObjectId} = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://shelf-master-f5449.web.app",
      "https://shelf-master-f5449.firebaseapp.com",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// verify jwt token middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log("token:", token);
  if (!token) {
    return res.status(401).send({message: "unauthorize access"});
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({message: "unauthorize access"});
    }
    console.log("decoded:", decoded);
    req.user = decoded;
    next();
  });
};

// connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aeb0oh8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const booksCollection = client.db("shelfMaster").collection("books");
    const borrowedCollection = client
      .db("shelfMaster")
      .collection("borrowedBooks");

    // creating cookie
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res.cookie("token", token, cookieOptions).send({success: true});
    });

    //clearing Token
    app.post("/logout", async (req, res) => {
      const user = req.body;
      res
        .clearCookie("token", {...cookieOptions, maxAge: 0})
        .send({success: true});
    });

    app.post("/addBooks", verifyToken, async (req, res) => {
      const newBook = req.body;
      const result = await booksCollection.insertOne(newBook);
      res.send(result);
    });

    // borrowed books
    app.post("/borrowedBooks", async (req, res) => {
      const borrowedBooks = req.body;
      // console.log(borrowedBooks);
      const result = await borrowedCollection.insertOne(borrowedBooks);
      res.send(result);
    });

    // get borrowed books
    app.get("/borrowedBooks/:email", async (req, res) => {
      const result = await borrowedCollection
        .find({email: req.params.email})
        .toArray();
      res.send(result);
    });

    app.get("/allBooks", verifyToken, async (req, res) => {
      console.log("verify token:", req.cookies);
      const cursor = booksCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });
    app.get("/categoryBooks", async (req, res) => {
      console.log("verify token:", req.cookies);
      const cursor = booksCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/singleBook/:id", async (req, res) => {
      const result = await booksCollection.findOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    app.get("/booksCategory/:category", async (req, res) => {
      const result = await booksCollection
        .find({category: req.params.category})
        .toArray();
      res.send(result);
    });

    app.put("/updateBook/:id", async (req, res) => {
      const query = {_id: new ObjectId(req.params.id)};
      const updateBook = req.body;

      const bookInfo = {
        $set: {
          name: updateBook.name,
          category: updateBook.category,
          quantity: updateBook.quantity,
          rating: updateBook.rating,
          image: updateBook.image,
          description: updateBook.description,
        },
      };
      const result = await booksCollection.updateOne(query, bookInfo);
      res.send(result);
    });

    app.delete("/deleteBooks/:id", async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await borrowedCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ping: 1});
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// test
app.get("/", (req, res) => {
  res.send("Library management system working successful");
});

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
