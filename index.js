const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require ('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(cors({
    origin: ["https://forum-12-8aedb.web.app",
        'https://forum-12-8aedb.firebaseapp.com',
      ],
      credentials: true,
    })
);
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
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const db = client.db('forum'); 
    const postsCollection = db.collection('postsCollection');
    const AnnouncementsCollection = db.collection('AnouncementsCollection');
    const commentsCollection = db.collection('commentsCollection');
    const usersCollection = db.collection('usersCollection');
    const tagsCollection = db.collection('tagsCollection');
    const reportsCollection = db.collection('reportsCollection');
    const announcementsCollection = db.collection('announcementsCollection');

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


        app.get("/comments/:postId", async (req, res) => {
            const { postId } = req.params;
            try {
                const comments = await commentsCollection.find({ postId }).toArray();
                res.status(200).json(comments);
            } catch (error) {
                res.status(500).json({ message: "Error fetching comments" });
            }
        });
        

   app.get('/posts', async (req, res) => {
            const { page = 1, limit = 5, sortBy = "newest", query } = req.query;
            const decodedQuery = query ? decodeURIComponent(query) : '';
          
            try {
              const skip = (parseInt(page) - 1) * parseInt(limit);
              const sort = sortBy === "popularity" 
                ? { voteDifference: -1 } 
                : { createdAt: -1 };
               
const match = decodedQuery ? { tags: { $in: decodedQuery.split(',') } } : {};
                // const match = query ? { tags: { $in: query.split(',') } } : {};
          
              const posts = await postsCollection.aggregate([
                { $match: match }, 
                { $addFields: { voteDifference: { $subtract: ["$upVote", "$downVote"] } } },
                { $sort: sort },
                { $skip: skip },
                { $limit: parseInt(limit) }
              ]).toArray();
              
              for (const post of posts) {
                const commentsCount = await commentsCollection.countDocuments({ postTitle: post.title });
                post.commentsCount = commentsCount;
              }
          
              res.status(200).json(posts);
            } catch (err) {
              console.error(err);
              res.status(500).json({ message: "Error fetching posts", error: err });
            }
          });     

        // app.get('/posts', async (req, res) => {
        //     try {
        //         const posts = await postsCollection.find().toArray();
        //         res.status(200).json(posts);
        //     } catch (err) {
        //         console.error(err);
        //         res.status(500).json({ message: "Error fetching posts", error: err });
        //     }
        // });
        

        //   app.get('/posts/tags', async (req, res) => {
        //     try {
        //         const allPosts = await postsCollection.find().toArray();
        // const tags = allPosts.flatMap(post => post.tags || []);
        // const uniqueTags = [...new Set(tags)];

        // res.status(200).json(uniqueTags);
        //     } catch (err) {
        //         console.error(err);
        //         res.status(500).json({ message: "Error fetching tags", error: err });
        //     }
        // });

        app.post("/posts", async (req, res) => { 
            const post = req.body;

            const result = await postsCollection.insertOne(post);
            res.status(201).json({ message: "Post created successfully",result });
        });

        app.get("/posts/user/:email", async (req, res) => {
            const email = req.params.email;
            const {page=1,limit =10} =req.query;
            const skip =(page-1)*limit
            const posts = await postsCollection
            .find({ authorEmail: email })
            .skip(skip)

            .limit(parseInt(limit))
            .toArray();
            const totalPosts = await postsCollection.countDocuments({ authorEmail: email });
            res.status(200).json({ posts, totalPosts,
                totalPages:Math.ceil(totalPosts/limit),
                currentPage:parseInt(page),
            });
        });

        app.get("/posts/count/:email", async (req, res) => {
            const email = req.params.email;
            const postCount = await postsCollection.countDocuments({ authorEmail: email });
            res.status(200).json({ count: postCount });
        });

        app.delete("/posts/:id", async (req, res) => {
            const id = req.params.id;
            const result = await postsCollection.deleteOne({ _id: new ObjectId(id) });

            if (result.deletedCount === 0) {
                return res.status(404).json({ message: "Post not found" });
            }

            res.status(200).json({ message: "Post deleted successfully" });
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
      
          
          app.post('/announcements',verifyToken,verifyAdmin, async (req, res) => {
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

          app.post("/make-announcements", async (req, res) => {
            const announcement = req.body;
            const result = await announcementsCollection.insertOne(announcement);
            res.status(201).json({ message: "Announcement created successfully",result });
        });

        //   app.get ('/users'), async (req, res) => {
        //     // try {
        //         const users = await 
        //         usersCollection.find().toArray();
        //         // if (usersCount.length === 0) {
        //         //     return res.status(404).json({ message: 'No users found' });
        //         //   }
        //         res.status(200).json(users);
        //         // console.log( usersCount);
        //         // res.status(201).json( users );
        //         // } catch (error) {
        //         //     console.error('Error fetching users:', error);
        //         //     res.status(500).json({ message: 'Internal Server Error' });
        //         //     };
        //             };

        app.get('/users', async (req, res) => {
            try {
              const users = await usersCollection.find().toArray();
              res.status(200).json(users);
            } catch (error) {
              console.error('Error fetching announcements:', error);
              res.status(500).json({ message: 'Internal Server Error' });
            }
          });


          app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
              return res.send({ message: 'User already exists here ', user: existingUser, insertedId: null })
            }
            const newUser = 
            {...user,
             badge: "Bronze",
              isMember: false };
            const result = await usersCollection.insertOne(newUser);
            res.send(result);
          });

          app.get("/users/:email", async (req, res) => {
            const { email } = req.params;
        
            try {
                const user = await usersCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: "User not found" });
                }
        
                res.status(200).json(user);
            } catch (error) {
                console.error("Error fetching user:", error.message);
                res.status(500).json({ message: "Failed to fetch user" });
            }
        });

        app.patch("/users/:email",verifyToken, async (req, res) => {
            const { email } = req.params;
            const { role} = req.body;
        
            try {
               
                // const user = await usersCollection.findOne({ email });
                // if (!user) {
                //   return res.status(404).json({ message: "User not found" });
                // }
                const result = await usersCollection.updateOne(
                    { email },
                    { $set:{role}}
                );
        
                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: "User not found" });
                }
        
                res.status(200).json({ message: "User became admin" });
            } catch (error) {
                console.error("Error updating membership:", error.message);
                res.status(500).json({ message: "Failed to update membership" });
            }
        });

        app.get("/users/search/:username", async (req, res) => {
            const { username } = req.params;
        
            try {
                const users = await usersCollection
                    .find({ name: { $regex: username, $options: "i" } })
                    .toArray();
        
                res.status(200).json(users);
            } catch (error) {
                console.error("Error searching for users:", error.message);
                res.status(500).json({ message: "Failed to search for users" });
            }
        });

        app.get("/users/admin/:email",async (req, res) => {
            const { email } = req.params;
        
            try {
                const user = await usersCollection.findOne({ email });
                if (!user) {
                    return res.status(200).json({ admin: false }); 
                    }
                    const isAdmin = user.role === "admin";
                res.status(200).json({ admin: isAdmin });
            } catch (error) {
                console.error("Error checking admin status:", error.message);
                res.status(500).json({ message: "Failed to check admin status" });
            }
        });
        

        app.get("/tags", async (req, res) => {
            try {
                const tags = await tagsCollection.find().toArray();
                res.status(200).json(tags);
            } catch (error) {
                console.error("Error fetching tags:", error.message);
                res.status(500).json({ message: "Failed to fetch tags" });
            }
        });
        
        app.post("/tags",verifyToken, async (req, res) => {
            const { name } = req.body;
        
            try {
                const result = await tagsCollection.insertOne({ name });
                res.status(201).json({ message: "Tag added successfully", tag: result.ops[0] });
            } catch (error) {
                console.error("Error adding tag:", error.message);
                res.status(500).json({ message: "Failed to add tag" });
            }
        });
        
        app.delete("/tags/:id",verifyToken, async (req, res) => {
            const { id } = req.params;
        
            try {
                const result = await tagsCollection.deleteOne({ _id: new ObjectId(id) });
                res.status(200).json({ message: "Tag deleted successfully" },result);
            } catch (error) {
                console.error("Error deleting tag:", error.message);
                res.status(500).json({ message: "Failed to delete tag" });
            }
        });
        
        

        // app.post ('/create-payment-intent', async (req, res) => {
        //     const {price} = req.body;
        //     const amount = parseInt(price * 100); 
        //     const paymentIntent = await stripe.paymentIntents.create({
        //         amount:amount,
        //         currency: 'usd',
        //         payment_method_types: ['card'],
        //         });
        //         res.status(201).json({clientSecret: paymentIntent.client_secret})
        // })
        app.post("/create-payment-intent",verifyToken, async (req, res) => {
            const { email, amount } = req.body;
        
            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount,
                    currency: "usd",
                    payment_method_types: ["card"],
                    receipt_email: email,
                });
        
                res.status(200).json(paymentIntent.client_secret);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        });

        app.get("/admin/stats", async (req, res) => {
            try {
                const posts = await postsCollection.countDocuments();
                const comments = await commentsCollection.countDocuments();
                const users = await usersCollection.countDocuments();
        
                res.status(200).json({ posts, comments, users });
            } catch (error) {
                console.error("Error fetching stats:", error.message);
                res.status(500).json({ message: "Failed to fetch statistics" });
            }
        });
        


app.get("/reports", async (req, res) => {
    const reports = await reportsCollection.find().toArray();
    res.status(200).json(reports);
});

app.patch("/reports/:id",verifyToken,verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const result = await reportsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { resolved: true } }
    );
    res.status(200).json({ message: "Report resolved successfully",result });
});

app.delete("/reports/:id",verifyToken,verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const result = await reportsCollection.deleteOne({ _id: new ObjectId(id) });
    res.status(200).json({ message: "Report deleted successfully",result });
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