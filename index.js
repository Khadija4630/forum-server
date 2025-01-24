const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require ('dotenv').config();
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.q2nbs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const db = client.db('forum'); 
    const postsCollection = db.collection('postsCollection');
    const AnnouncementsCollection = db.collection('AnouncementsCollection');
    const commentsCollection = db.collection('comments');

    app.post ('/jwt', async (req, res) => {
        const user = req.body;
        const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '2d' });
        res.send({token});
    })
    const verifyToken = (req, res, next) => {
        if (!req.headers.authorization) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: 'unauthorized access' })
          }
          req.decoded = decoded;
          next();
        })
    }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
              return res.status(403).send({ message: 'forbidden access' });
            }
            next();
          }

        //   Posts
        // app.get ('/posts', async (req, res) => {
        //     const posts = await postsCollection.find().toArray();
        //     res.send(posts);
        //     })

        app.get('/posts', async (req, res) => {
            const { page = 1, limit = 5, sortBy = "newest",tag } = req.query;
          
            try {
              const skip = (parseInt(page) - 1) * parseInt(limit);
              const sort = sortBy === "popularity" 
                ? { voteDifference: -1 } 
                : { createdAt: -1 };
                const match = tag ? { tags: tag } : {}; 
          
              const posts = await postsCollection.aggregate([
                { $match: match }, 
                { $addFields: { voteDifference: { $subtract: ["$upVote", "$downVote"] } } },
                { $sort: sort },
                { $skip: skip },
                { $limit: parseInt(limit) }
              ]).toArray();
              
            //   for (const post of posts) {
            //     const commentsCount = await commentsCollection.countDocuments({ postTitle: post.title });
            //     post.commentsCount = commentsCount;
            //   }
          
              res.status(200).json(posts);
            } catch (err) {
              console.error(err);
              res.status(500).json({ message: "Error fetching posts", error: err });
            }
          });

          app.get('/posts/tags', async (req, res) => {
            try {
                const allPosts = await postsCollection.find().toArray();
        const tags = allPosts.flatMap(post => post.tags || []);
        const uniqueTags = [...new Set(tags)];

        res.status(200).json(uniqueTags);
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Error fetching tags", error: err });
            }
        });
        app.get('/announcements', async (req, res) => {
            try {
              const announcements = await AnnouncementsCollection.find().toArray();
              res.status(200).json(announcements);
            } catch (error) {
              console.error('Error fetching announcements:', error);
              res.status(500).json({ message: 'Internal Server Error' });
            }
          });
      
          
          app.post('/announcements', async (req, res) => {
            const { authorImage, authorName, title, description } = req.body;
          
            const newAnnouncement = new Announcement({
              authorImage,
              authorName,
              title,
              description,
              createdAt: new Date(),
            });
          
            try {
              await newAnnouncement.save();
              res.status(201).json(newAnnouncement);
            } catch (error) {
              res.status(500).json({ message: error.message });
            }
          });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
            
app.get('/', (req, res) => {
    res.send('Forum is ready for receiving messages ')
        })
              
app.listen(port, () => {
    console.log(`Forum server is running on port ${port}`);
        })