const bcrypt = require("bcrypt");
const { isDatabaseConnected } = require("./db");
const UserModel = require("./models/User");
const PostModel = require("./models/Post");
const CommentModel = require("./models/Comment");

const users = [];
const posts = [];
const comments = [];
let nextId = 1;

function makeId() {
  return `id-${nextId++}`;
}

function serializeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return {
    ...safeUser,
    id: safeUser.id || safeUser._id,
    followers: safeUser.followers || [],
    following: safeUser.following || [],
  };
}

function resolveAuthor(authorId) {
  const user = users.find((entry) => entry.id === authorId || entry._id?.toString() === authorId?.toString());
  return user ? serializeUser(user) : null;
}

function serializeComment(comment) {
  if (!comment) return null;
  return {
    ...comment,
    id: comment.id || comment._id,
    author: comment.author && typeof comment.author === "object"
      ? serializeUser(comment.author)
      : comment.author,
  };
}

function serializePost(post) {
  if (!post) return null;
  const authorId = post.author && typeof post.author === "object" ? post.author.id || post.author._id : post.author;
  const author = post.author && typeof post.author === "object"
    ? serializeUser(post.author)
    : resolveAuthor(authorId);
  return {
    ...post,
    id: post.id || post._id,
    author,
    comments: (post.comments || []).map((comment) => serializeComment(comment)),
    likes: post.likes || [],
  };
}

function getUserIndex(id) {
  return users.findIndex((user) => user.id === id || user._id?.toString() === id?.toString());
}

function getPostIndex(id) {
  return posts.findIndex((post) => post.id === id || post._id?.toString() === id?.toString());
}

function getCommentIndex(id) {
  return comments.findIndex((comment) => comment.id === id || comment._id?.toString() === id?.toString());
}

async function createUser(data) {
  if (isDatabaseConnected()) {
    const user = new UserModel({
      name: data.name,
      username: data.username,
      email: data.email,
      password: data.password,
      bio: data.bio || "",
      profilePicture: data.profilePicture || "https://via.placeholder.com/150",
    });
    await user.save();
    return user;
  }

  const existing = users.find((entry) => entry.email === data.email || entry.username === data.username);
  if (existing) {
    return null;
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const user = {
    id: makeId(),
    name: data.name,
    username: data.username,
    email: data.email,
    password: hashedPassword,
    bio: data.bio || "",
    profilePicture: data.profilePicture || "https://via.placeholder.com/150",
    followers: [],
    following: [],
    createdAt: new Date().toISOString(),
    comparePassword: async function (candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    },
  };

  users.push(user);
  return user;
}

async function findUserByEmailOrUsername(email, username) {
  if (isDatabaseConnected()) {
    return UserModel.findOne({ $or: [{ email }, { username }] });
  }

  return users.find((user) => user.email === email || user.username === username) || null;
}

async function getUserByEmail(email) {
  if (isDatabaseConnected()) {
    return UserModel.findOne({ email });
  }

  return users.find((user) => user.email === email) || null;
}

async function getUserById(id) {
  if (isDatabaseConnected()) {
    return UserModel.findById(id).select("-password");
  }

  const user = users.find((entry) => entry.id === id || entry._id?.toString() === id?.toString());
  return user ? serializeUser(user) : null;
}

async function getUserByUsername(username) {
  if (isDatabaseConnected()) {
    return UserModel.findOne({ username }).select("-password");
  }

  return users.find((user) => user.username === username) || null;
}

async function updateUser(id, updates) {
  if (isDatabaseConnected()) {
    return UserModel.findByIdAndUpdate(id, updates, { new: true }).select("-password");
  }

  const index = getUserIndex(id);
  if (index === -1) return null;
  const current = users[index];
  users[index] = { ...current, ...updates };
  return serializeUser(users[index]);
}

async function searchUsers(query) {
  if (isDatabaseConnected()) {
    return UserModel.find({ $or: [{ name: { $regex: query, $options: "i" } }, { username: { $regex: query, $options: "i" } }] }).select("-password").limit(10);
  }

  const q = query.toLowerCase();
  return users
    .filter((user) => user.name.toLowerCase().includes(q) || user.username.toLowerCase().includes(q))
    .slice(0, 10)
    .map((user) => serializeUser(user));
}

async function getUserProfile(id) {
  if (isDatabaseConnected()) {
    return UserModel.findById(id).select("-password");
  }

  const user = users.find((entry) => entry.id === id || entry._id?.toString() === id?.toString());
  return user ? serializeUser(user) : null;
}

async function createPost(data) {
  if (isDatabaseConnected()) {
    const post = new PostModel({
      author: data.author,
      image: data.image,
      caption: data.caption || "",
      mood: data.mood || "",
    });
    await post.save();
    return post.toObject();
  }

  const post = {
    id: makeId(),
    author: data.author,
    image: data.image,
    caption: data.caption || "",
    mood: data.mood || "",
    likes: [],
    comments: [],
    createdAt: new Date().toISOString(),
  };

  posts.push(post);
  return serializePost(post);
}

async function getPostById(id) {
  if (isDatabaseConnected()) {
    return PostModel.findById(id)
      .populate("author", "name username profilePicture")
      .populate({ path: "comments", populate: { path: "author", select: "username" } });
  }

  const post = posts.find((entry) => entry.id === id || entry._id?.toString() === id?.toString());
  return post ? serializePost(post) : null;
}

async function getPostsByUser(userId) {
  if (isDatabaseConnected()) {
    return PostModel.find({ author: userId })
      .sort({ createdAt: -1 })
      .populate("author", "name username profilePicture");
  }

  return posts
    .filter((post) => post.author === userId || post.author?.toString() === userId?.toString())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((post) => serializePost(post));
}

async function getFeedPosts() {
  if (isDatabaseConnected()) {
    return PostModel.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("author", "name username profilePicture")
      .populate({ path: "comments", populate: { path: "author", select: "username" } });
  }

  return posts
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map((post) => serializePost(post));
}

async function toggleLike(postId, userId, shouldLike) {
  if (isDatabaseConnected()) {
    const post = await PostModel.findById(postId);
    if (!post) return null;
    if (shouldLike) {
      if (!post.likes.includes(userId)) post.likes.push(userId);
    } else {
      post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
    }
    await post.save();
    return post.toObject();
  }

  const index = getPostIndex(postId);
  if (index === -1) return null;
  const current = posts[index];
  if (shouldLike) {
    current.likes = current.likes.includes(userId) ? current.likes : [...current.likes, userId];
  } else {
    current.likes = current.likes.filter((id) => id.toString() !== userId.toString());
  }
  posts[index] = current;
  return serializePost(current);
}

async function deletePost(postId) {
  if (isDatabaseConnected()) {
    return PostModel.findByIdAndDelete(postId);
  }

  const index = getPostIndex(postId);
  if (index === -1) return null;
  const post = posts[index];
  posts.splice(index, 1);
  return post;
}

async function addComment(postId, authorId, text) {
  if (isDatabaseConnected()) {
    const comment = new CommentModel({ post: postId, author: authorId, text });
    await comment.save();
    const post = await PostModel.findById(postId);
    if (post) {
      post.comments.push(comment._id);
      await post.save();
    }
    return comment.toObject();
  }

  const comment = {
    id: makeId(),
    post: postId,
    author: authorId,
    text,
    createdAt: new Date().toISOString(),
  };

  comments.push(comment);
  const index = getPostIndex(postId);
  if (index !== -1) {
    posts[index].comments = [...posts[index].comments, comment];
  }
  return serializeComment(comment);
}

async function deleteComment(commentId, userId) {
  if (isDatabaseConnected()) {
    const comment = await CommentModel.findById(commentId);
    if (!comment) return null;
    if (comment.author.toString() !== userId.toString()) {
      throw new Error("Unauthorized");
    }
    return CommentModel.findByIdAndDelete(commentId);
  }

  const index = getCommentIndex(commentId);
  if (index === -1) return null;
  const comment = comments[index];
  if (comment.author !== userId) {
    throw new Error("Unauthorized");
  }
  comments.splice(index, 1);
  const postIndex = posts.findIndex((post) => post.comments.some((entry) => entry.id === commentId || entry._id?.toString() === commentId?.toString()));
  if (postIndex !== -1) {
    posts[postIndex].comments = posts[postIndex].comments.filter((entry) => entry.id !== commentId && entry._id?.toString() !== commentId?.toString());
  }
  return comment;
}

async function followUser(currentUserId, targetUserId) {
  if (isDatabaseConnected()) {
    const currentUser = await UserModel.findById(currentUserId);
    const targetUser = await UserModel.findById(targetUserId);
    if (!currentUser || !targetUser) return null;
    if (!currentUser.following.includes(targetUserId)) currentUser.following.push(targetUserId);
    if (!targetUser.followers.includes(currentUserId)) targetUser.followers.push(currentUserId);
    await currentUser.save();
    await targetUser.save();
    return { currentUser, targetUser };
  }

  const currentIndex = getUserIndex(currentUserId);
  const targetIndex = getUserIndex(targetUserId);
  if (currentIndex === -1 || targetIndex === -1) return null;

  const currentUser = users[currentIndex];
  const targetUser = users[targetIndex];
  currentUser.following = currentUser.following.includes(targetUserId) ? currentUser.following : [...currentUser.following, targetUserId];
  targetUser.followers = targetUser.followers.includes(currentUserId) ? targetUser.followers : [...targetUser.followers, currentUserId];
  users[currentIndex] = currentUser;
  users[targetIndex] = targetUser;
  return { currentUser, targetUser };
}

async function unfollowUser(currentUserId, targetUserId) {
  if (isDatabaseConnected()) {
    const currentUser = await UserModel.findById(currentUserId);
    const targetUser = await UserModel.findById(targetUserId);
    if (!currentUser || !targetUser) return null;
    currentUser.following = currentUser.following.filter((id) => id.toString() !== targetUserId.toString());
    targetUser.followers = targetUser.followers.filter((id) => id.toString() !== currentUserId.toString());
    await currentUser.save();
    await targetUser.save();
    return { currentUser, targetUser };
  }

  const currentIndex = getUserIndex(currentUserId);
  const targetIndex = getUserIndex(targetUserId);
  if (currentIndex === -1 || targetIndex === -1) return null;

  const currentUser = users[currentIndex];
  const targetUser = users[targetIndex];
  currentUser.following = currentUser.following.filter((id) => id.toString() !== targetUserId.toString());
  targetUser.followers = targetUser.followers.filter((id) => id.toString() !== currentUserId.toString());
  users[currentIndex] = currentUser;
  users[targetIndex] = targetUser;
  return { currentUser, targetUser };
}

async function isFollowing(currentUserId, targetUserId) {
  if (isDatabaseConnected()) {
    const currentUser = await UserModel.findById(currentUserId);
    return currentUser?.following?.includes(targetUserId) || false;
  }

  const currentUser = users.find((entry) => entry.id === currentUserId || entry._id?.toString() === currentUserId?.toString());
  return currentUser?.following?.includes(targetUserId) || false;
}

function reset() {
  users.length = 0;
  posts.length = 0;
  comments.length = 0;
  nextId = 1;
}

function createDemoUser({ name, username, email, bio, profilePicture }) {
  return {
    id: makeId(),
    name,
    username,
    email,
    password: "password123",
    bio,
    profilePicture,
    followers: [],
    following: [],
    createdAt: new Date().toISOString(),
    comparePassword: async function (candidatePassword) {
      return candidatePassword === this.password;
    },
  };
}

const demoUsers = [
  createDemoUser({
    name: "Aarav",
    username: "aarav",
    email: "aarav@example.com",
    bio: "Sharing daily moments",
    profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
  }),
  createDemoUser({
    name: "Maya",
    username: "maya",
    email: "maya@example.com",
    bio: "City explorer and coffee lover",
    profilePicture: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=200&q=80",
  }),
  createDemoUser({
    name: "Nikhil",
    username: "nikhil",
    email: "nikhil@example.com",
    bio: "Tech, travel, and tennis",
    profilePicture: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
  }),
  createDemoUser({
    name: "Sanya",
    username: "sanya",
    email: "sanya@example.com",
    bio: "Design and street photography",
    profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  }),
];

if (users.length === 0) {
  users.push(...demoUsers);
}

// Seed some example posts so the frontend isn't empty
if (posts.length === 0) {
  const now = Date.now();
  posts.push({
    id: makeId(),
    author: demoUsers[0].id,
    image: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=800&q=80",
    caption: "Sunset walk by the lake 🌅",
    likes: [demoUsers[1].id],
    comments: [],
    createdAt: new Date(now - 1000 * 60 * 60 * 2).toISOString(),
  });

  posts.push({
    id: makeId(),
    author: demoUsers[1].id,
    image: "https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=800&q=80",
    caption: "Morning coffee and a good book ☕📚",
    likes: [demoUsers[0].id, demoUsers[2].id],
    comments: [],
    createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
  });

  posts.push({
    id: makeId(),
    author: demoUsers[2].id,
    image: "https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?auto=format&fit=crop&w=800&q=80",
    caption: "Hiking vibes — into the wild 🥾",
    likes: [demoUsers[3].id],
    comments: [],
    createdAt: new Date(now - 1000 * 60 * 30).toISOString(),
  });

  posts.push({
    id: makeId(),
    author: demoUsers[3].id,
    image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80",
    caption: "City lights and late-night vibes ✨",
    likes: [],
    comments: [],
    createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
  });
}

// Add demo comments so the UI shows comment previews
if (comments.length === 0 && posts.length > 0) {
  const demoComment1 = {
    id: makeId(),
    post: posts[0].id,
    author: demoUsers[1].id,
    text: "Lovely view! 😍",
    createdAt: new Date().toISOString(),
  };
  const demoComment2 = {
    id: makeId(),
    post: posts[1].id,
    author: demoUsers[2].id,
    text: "Perfect morning routine.",
    createdAt: new Date().toISOString(),
  };
  const demoComment3 = {
    id: makeId(),
    post: posts[2].id,
    author: demoUsers[0].id,
    text: "Let's go on a hike!",
    createdAt: new Date().toISOString(),
  };

  comments.push(demoComment1, demoComment2, demoComment3);
  const idx0 = getPostIndex(posts[0].id);
  if (idx0 !== -1) posts[idx0].comments.push(demoComment1);
  const idx1 = getPostIndex(posts[1].id);
  if (idx1 !== -1) posts[idx1].comments.push(demoComment2);
  const idx2 = getPostIndex(posts[2].id);
  if (idx2 !== -1) posts[idx2].comments.push(demoComment3);
}

if (posts.length === 0) {
  posts.push({
    id: makeId(),
    author: demoUsers[0].id,
    image: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
    caption: "Welcome to Mini Insta!",
    likes: [],
    comments: [],
    createdAt: new Date().toISOString(),
  });
}

module.exports = {
  createUser,
  findUserByEmailOrUsername,
  getUserByEmail,
  getUserById,
  getUserByUsername,
  updateUser,
  searchUsers,
  getUserProfile,
  createPost,
  getPostById,
  getPostsByUser,
  getFeedPosts,
  toggleLike,
  deletePost,
  addComment,
  deleteComment,
  followUser,
  unfollowUser,
  isFollowing,
  reset,
  // ensure DB has demo content when connected
  ensureSeed: async function ensureSeed() {
    if (!isDatabaseConnected()) return;

    const existingPosts = await PostModel.countDocuments();
    if (existingPosts > 0) return;

    const demoProfiles = [
      {
        name: "Aarav",
        username: "aarav",
        email: "aarav@example.com",
        bio: "Sharing daily moments",
        profilePicture: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Maya",
        username: "maya",
        email: "maya@example.com",
        bio: "City explorer and coffee lover",
        profilePicture: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Nikhil",
        username: "nikhil",
        email: "nikhil@example.com",
        bio: "Tech, travel, and tennis",
        profilePicture: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80",
      },
      {
        name: "Sanya",
        username: "sanya",
        email: "sanya@example.com",
        bio: "Design and street photography",
        profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      },
    ];

    const dbUsers = [];
    for (const profile of demoProfiles) {
      let user = await UserModel.findOne({ email: profile.email });
      if (!user) {
        user = new UserModel({
          name: profile.name,
          username: profile.username,
          email: profile.email,
          password: "password123",
          bio: profile.bio,
          profilePicture: profile.profilePicture,
        });
        await user.save();
      }
      dbUsers.push(user);
    }

    const samples = [
      { author: dbUsers[0], image: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=800&q=80", caption: "Sunset walk by the lake 🌅", likes: [dbUsers[1]._id] },
      { author: dbUsers[1], image: "https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=800&q=80", caption: "Morning coffee and a good book ☕📚", likes: [dbUsers[0]._id, dbUsers[2]._id] },
      { author: dbUsers[2], image: "https://images.unsplash.com/photo-1478145046317-39f10e56b5e9?auto=format&fit=crop&w=800&q=80", caption: "Hiking vibes — into the wild 🥾", likes: [dbUsers[3]._id] },
      { author: dbUsers[3], image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=80", caption: "City lights and late-night vibes ✨", likes: [] },
    ];

    const savedPosts = [];
    for (const sample of samples) {
      const post = new PostModel({
        author: sample.author._id,
        image: sample.image,
        caption: sample.caption,
        likes: sample.likes,
      });
      await post.save();
      savedPosts.push(post);
    }

    const commentSamples = [
      { post: savedPosts[0], author: dbUsers[1], text: "Lovely view! 😍" },
      { post: savedPosts[1], author: dbUsers[2], text: "Perfect morning routine." },
      { post: savedPosts[2], author: dbUsers[0], text: "Let's go on a hike!" },
    ];

    for (const commentSample of commentSamples) {
      const comment = new CommentModel({
        post: commentSample.post._id,
        author: commentSample.author._id,
        text: commentSample.text,
      });
      await comment.save();
      commentSample.post.comments.push(comment._id);
      await commentSample.post.save();
    }
  },
};
