const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: 'secret',
        resave: false,
        saveUninitialized: true,
        store: MongoStore.create({
            mongoUrl: 'mongodb://localhost:27017/blog_app1',
        }),
    })
);

app.use(express.static('experi'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/blog_app1', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Multer setup for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath); // Save in uploads directory
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`); // Add a timestamp to filename
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Max file size of 5MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
        }
    }
});

// Schemas and models
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    profileImage: { type: String },  // Store path of profile image
});

userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const User = mongoose.model('User', userSchema);

const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String, required: false },
    author: { type: String, required: true },
    likes: { type: Number, default: 0 },
    comments: [
        {
            author: String,
            text: String,
            replies: [
                {
                    author: String,
                    text: String,
                    createdAt: { type: Date, default: Date.now },
                }
            ],
            createdAt: { type: Date, default: Date.now },
        }
    ],
});


const Post = mongoose.model('Post', postSchema);

// Routes

// Home route
app.get('/', async (req, res) => {
    const posts = await Post.find();
    res.render('index', { user: req.session.user, posts });
});

// Register user
app.post('/register',upload.single('profileImage'), async (req, res) => {
    try {
        const { username, password } = req.body;
        const profileImage = req.file ? `/upload/${req.file.filename}`:null;

        const user = new User({ username, password , profileImage});
        await user.save();
        req.session.user = user;
        res.redirect('/');
    } catch (error) {
        console.error('Error during registration:', error.message);
        res.status(400).send({ message: 'Registration failed. Username might already be taken.' });
    }
});

// Login user
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (user && (await bcrypt.compare(password, user.password))) {
            req.session.user = user;
            res.redirect('/');
        } else {
            res.status(401).send('Invalid username or password.');
        }
    } catch (error) {
        console.error('Login error: ', error.message);
        res.status(500).send('Login failed.');
    }
});

// Logout user
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error: ', err.message);
            return res.status(500).send('Logout failed.');
        }
        res.redirect('/');
    });
});

// Create post
app.post('/posts', upload.single('image'), async (req, res) => {
    try {
        const { title, content } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;

        const post = new Post({
            title,
            content,
            image,
            author: req.session.user.username,
        });

        await post.save();
        res.redirect('/');
    } catch (error) {
        console.error('Error creating post:', error.message);
        if (error instanceof multer.MulterError) {
            return res.status(400).send('File upload error: ' + error.message);
        }
        res.status(500).send('Failed to create post.');
    }
});

// Like post
app.post('/posts/:id/like', async (req, res) => {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post not found');
    post.likes++;
    await post.save();
    res.redirect('/')
});

// Comment on post
app.post('/posts/:id/comment', async (req, res) => {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post not found');
    post.comments.push({ author: req.session.user.username, text });
    await post.save();
    res.redirect('/');
});

app.post('/posts/:postId/comments/:commentId/reply', async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { text } = req.body;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).send('Post not found');

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).send('Comment not found');

        comment.replies.push({ author: req.session.user.username, text });
        await post.save();

        res.redirect('/');
    } catch (error) {
        console.error('Error replying to comment:', error.message);
        res.status(500).send('Failed to reply to comment.');
    }
});


// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
