const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const cors = require('cors');
const Community = require('./models/Community');
const multer = require('multer');
const app = express();
const bodyParser = require('body-parser');

app.use(express.json());
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static('uploads')); 

mongoose.connect('mongodb+srv://josephpeterjece2021:AJ9Hg6xTtQBUCoGr@cluster1.xaacunv.mongodb.net/aryan?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });

// User Registration
app.post('/register', async (req, res) => {
  const { email, password, imageUrl } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword, imageUrl });
  await user.save();
  
  res.json({ message: 'User registered successfully' });
});

// User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await User.findOne({ email });
  
  if (!user) return res.status(400).json({ message: 'User not found' });
  // const isValid = await bcrypt.compare(password, user.password);
  // if (!isValid) return res.status(400).json({ message: 'Invalid password' });
  const token = jwt.sign({ userId: user._id }, 'secret');
  res.json({ token, imageUrl: user.imageUrl, userId: user._id });
});

// User Profile Update
app.put('/user/:id', async (req, res) => {
  const { email, imageUrl, bio } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.email = email;
    user.imageUrl = imageUrl;
    user.bio = bio;

    await user.save();
    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

// Community Creation Route
app.post('/api/community/create', async (req, res) => {
  const { name, description, userid } = req.body;

  try {
      const community = new Community({
          name,
          description,
          createdBy: userid,
      });
      await community.save();
      res.status(201).json(community);
  } catch (err) {
      res.status(500).json({ error: 'Server error' });
  }
});

// File Upload Route
app.post('/api/community/:id/files', upload.single('file'), async (req, res) => {
  const communityId = req.params.id;

  try {
      const community = await Community.findById(communityId);
      if (!community) {
          return res.status(404).json({ msg: 'Community not found' });
      }

      const fileData = {
          filename: req.file.originalname,
          fileUrl: `http://localhost:5000/uploads/${req.file.filename}`,
          uploadedBy: req.user.id,  // Ensure you have middleware to set req.user
      };

      community.files.push(fileData);
      await community.save();
      res.status(200).json(community);
  } catch (err) {
      console.error(err);
      res.status(500).json({ msg: 'Server error' });
  }
});

// Message Posting Route
app.post('/api/community/:id/messages', async (req, res) => {
  const communityId = req.params.id;
  const { text, sender, fileUrl } = req.body;

  try {
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ msg: 'Community not found' });
    }

    const message = {
      type: text ? 'text' : 'file',
      text: text || null,
      sender: sender, // Ensure sender is passed in the request body
      fileUrl: fileUrl || null,
      createdAt: new Date(),
    };

    community.messages.push(message);
    await community.save();
    res.status(200).json(community.messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});


// Route to retrieve all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// Get all communities
app.get('/api/community', async (req, res) => {
  try {
      const communities = await Community.find().populate('createdBy', 'name').populate('members', 'name');
      res.json(communities);
  } catch (err) {
      console.error('Error fetching communities:', err);
      res.status(500).json({ error: 'Failed to fetch communities' });
  }
});

// Get messages for a community
app.get('/api/community/:id/messages', async (req, res) => {
  const communityId = req.params.id;

  try {
    const community = await Community.findById(communityId).populate('messages.sender', 'email');
    if (!community) {
      return res.status(404).json({ msg: 'Community not found' });
    }

    res.status(200).json(community.messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

//add user community
app.patch('/community/:communityId/members', async (req, res) => {
  const { communityId } = req.params;
  const { userId } = req.body;
  console.log(req.body)

  try {
      await Community.findByIdAndUpdate(
          communityId,
          { $addToSet: { members: userId } },
          { new: true }
      );

      res.status(200).json({ message: 'User added to community members successfully.' });
  } catch (err) {
      console.error('Error adding member to community', err);
      res.status(500).json({ message: 'Error adding member to community' });
  }
});

// Get participants of a community
app.get('/:communityId/participants', async (req, res) => {
  const { communityId } = req.params;

  try {
      const community = await Community.findById(communityId).populate('members', 'email');
      if (!community) {
          return res.status(404).json({ message: 'Community not found' });
      }

      res.json(community.members);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/community/:communityId/participants/:userId', async (req, res) => {
  const { communityId, userId } = req.params;

  try {
      // Find the community and remove the participant
      const community = await Community.findByIdAndUpdate(
          communityId,
          { $pull: { members: userId } },
          { new: true } // Return the updated community
      );

      if (!community) {
          return res.status(404).json({ message: 'Community not found' });
      }

      res.status(200).json({ message: 'Participant removed successfully', community });
  } catch (error) {
      console.error('Error removing participant:', error);
      res.status(500).json({ message: 'Error removing participant' });
  }
});
app.post('/api/forgot-password', async (req, res) => {
  const { email, newPassword } = req.body;
  console.log(req.body)
  
  try {
    const user = await User.findOne({ email });
    if (!user) {  
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    user.password = newPassword; 
    await user.save();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});



// Start the server
app.listen(5000, () => console.log('Server running on port 5000'));
