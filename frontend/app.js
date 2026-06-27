// const API_URL = "/api";
const API_URL = "http://localhost:5000/api";
const DEFAULT_AVATAR = "https://i.pravatar.cc/150";
const DEFAULT_POST_IMAGE = "https://picsum.photos/800/600";
const DEFAULT_STORY_IMAGE = "https://i.pravatar.cc/64";

// State
let currentUser = null;
let token = localStorage.getItem("token");
let currentUserId = localStorage.getItem("userId");
let selectedFileDataUrl = null;
let selectedProfilePicDataUrl = null;

function setImageFallback(img, fallback = DEFAULT_POST_IMAGE) {
  if (!img) return;
  img.onerror = () => {
    img.onerror = null;
    img.src = fallback;
  };
}

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  if (token) {
    currentUser = JSON.parse(localStorage.getItem("currentUser"));
    currentUserId = localStorage.getItem("userId");
    showMainApp();
  } else {
    showAuthPage();
  }
});

// Auth Functions
function showRegister() {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("registerForm").style.display = "flex";
}

function showLogin() {
  document.getElementById("registerForm").style.display = "none";
  document.getElementById("loginForm").style.display = "flex";
}

async function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (res.ok) {
      token = data.token;
      currentUser = data.user;
    //   currentUserId = data.user.id;
    currentUserId = data.user._id || data.user.id;
      
      localStorage.setItem("token", token);
    //   localStorage.setItem("userId", data.user.id);
    localStorage.setItem("userId", currentUserId);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      
      showMainApp();
    } else {
      alert(data.message || "Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    alert("Server error. Please try again.");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  
  const name = document.getElementById("regName").value;
  const username = document.getElementById("regUsername").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const bio = document.getElementById("regBio").value;

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, email, password, bio }),
    });

    const data = await res.json();

    if (res.ok) {
      token = data.token;
    //   currentUser = data.user;
    currentUserId = data.user._id || data.user.id;
      currentUserId = data.user.id;
      
      localStorage.setItem("token", token);
    //   localStorage.setItem("userId", data.user.id);
    localStorage.setItem("userId", currentUserId);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      
      showMainApp();
    } else {
      alert(data.message || "Registration failed");
    }
  } catch (error) {
    console.error("Registration error:", error);
    alert("Server error. Please try again.");
  }
}

function logout() {
  localStorage.clear();
  token = null;
  currentUser = null;
  currentUserId = null;
  showAuthPage();
}

function showAuthPage() {
  document.getElementById("authPage").style.display = "block";
  document.getElementById("feedPage").style.display = "none";
  document.getElementById("searchPage").style.display = "none";
  document.getElementById("createPage").style.display = "none";
  document.getElementById("profilePage").style.display = "none";
  document.getElementById("navLinks").style.display = "none";
}

function showMainApp() {
  document.getElementById("authPage").style.display = "none";
  document.getElementById("navLinks").style.display = "inline";
  showPage("feed");
  loadFeed();
}

// Page Navigation
function showPage(pageName) {
  const pages = ["feed", "search", "create", "profile"];
  
  pages.forEach(page => {
    document.getElementById(`${page}Page`).style.display = "none";
  });
  
  const targetPage = document.getElementById(`${pageName}Page`);
  targetPage.style.display = "block";
  targetPage.classList.remove('page-animate');
  void targetPage.offsetWidth;
  targetPage.classList.add('page-animate');

  if (pageName === "feed") { loadFeed(); renderStories(); }
  if (pageName === "profile") loadProfile();
  if (pageName === "search") document.getElementById("searchInput").focus();

  const bn = ['bn-home','bn-search','bn-create','bn-profile'];
  bn.forEach(id => document.getElementById(id)?.classList.remove('active'));
  const map = { feed: 'bn-home', search: 'bn-search', create: 'bn-create', profile: 'bn-profile' };
  document.getElementById(map[pageName])?.classList.add('active');
}

function getSeenStories() {
  const raw = localStorage.getItem('miniInstaSeenStories');
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markStorySeen(authorId) {
  const seen = getSeenStories();
  seen[authorId] = true;
  localStorage.setItem('miniInstaSeenStories', JSON.stringify(seen));
}

function handleImageUrlInput() {
  const url = document.getElementById("postImage").value.trim();
  if (url) {
    selectedFileDataUrl = null;
    updateImagePreview(url);
  } else if (!selectedFileDataUrl) {
    updateImagePreview();
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    selectedFileDataUrl = null;
    updateImagePreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    selectedFileDataUrl = reader.result;
    updateImagePreview(selectedFileDataUrl);
  };
  reader.readAsDataURL(file);
}

function updateImagePreview(src) {
  const preview = document.getElementById("imagePreview");
  if (!preview) return;

  if (src) {
    preview.innerHTML = `<img src="${src}" alt="Selected preview" onerror="this.onerror=null;this.src='${DEFAULT_POST_IMAGE}'">`;
    preview.classList.add("has-image");
  } else {
    preview.classList.remove("has-image");
    preview.innerHTML = '<span>No image selected</span>';
  }
}

async function renderStories() {
  try {
    const res = await fetch(`${API_URL}/posts/`);
    const posts = await res.json();
    const authors = {};
    posts.forEach(p => {
      const author = p.author && typeof p.author === 'object' ? p.author : null;
      const aid = author?.id || author?._id || p.author || 'unknown';
      if (!authors[aid]) authors[aid] = p;
    });

    const seen = getSeenStories();
    const container = document.getElementById('storiesContainer');
    if (!container) return;
    container.innerHTML = Object.values(authors).map(p => {
      const author = p.author && typeof p.author === 'object' ? p.author : null;
      const pic = author?.profilePicture || p.image || DEFAULT_STORY_IMAGE;
      const name = author?.username || 'user';
      const pid = p.id || p._id;
      const aid = author?.id || author?._id || pid;
      const stateClass = seen[aid] ? 'read' : 'new';
      return `
        <div class="story-item ${stateClass}" onclick="openStory('${pid}','${aid}')">
          <img src="${pic}" alt="${name}" onerror="this.onerror=null;this.src='${DEFAULT_STORY_IMAGE}'">
          <span>${name}</span>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('renderStories error', err);
  }
}

function openStory(postId, authorId) {
  markStorySeen(authorId);
  renderStories();
  openPostModal(postId);
}

async function loadFeed() {
  const container = document.getElementById("postsContainer");
  container.innerHTML = '<div class="loading">Loading posts...</div>';

  try {
    let url = `${API_URL}/posts/feed`;
    if (!token) url = `${API_URL}/posts/`;

    const res = await fetch(url, {
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });

    // const posts = await res.json();
    const data = await res.json();

const posts = Array.isArray(data)
    ? data
    : [];

    if (posts.length === 0) {
      container.innerHTML = '<p style="text-align:center;padding:40px;">No posts yet. Create your first post!</p>';
      return;
    }

    container.innerHTML = posts.map(post => createPostCard(post)).join("");
    
    // Add event listeners for like buttons
    attachLikeListeners();
  } catch (error) {
    console.error("Error loading feed:", error);
    container.innerHTML = '<p style="text-align:center;padding:40px;">Error loading posts. Try again later.</p>';
  }
}

function createPostCard(post) {
  const postId = post.id || post._id;
  const isLiked = post.likes?.includes(currentUserId);
  const comments = post.comments || [];
  const moodBadge = post.mood ? `<div class="post-mood">${post.mood}</div>` : "";
  const authorPic = post.author?.profilePicture || DEFAULT_AVATAR;
  const postImage = post.image || DEFAULT_POST_IMAGE;
  
  return `
    <div class="post animate-in" data-post-id="${postId}" style="position:relative;">
      <div class="post-header">
        <img src="${authorPic}" alt="${post.author?.username}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
        <div class="user-info">
          <strong>${post.author?.username || "user"}</strong>
          <span>${new Date(post.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
      <img src="${postImage}" alt="Post" class="post-image" onclick="openPostModal('${postId}')" ondblclick="doubleClickLike('${postId}')" onerror="this.onerror=null;this.src='${DEFAULT_POST_IMAGE}'">
      <div class="heart-overlay" id="heart-${postId}">❤</div>
      <div class="post-actions">
        <i class="fas fa-heart ${isLiked ? "liked" : ""}" onclick="toggleLike('${postId}', ${isLiked})"></i>
        <i class="fas fa-comment" onclick="openPostModal('${postId}')"></i>
        <i class="fas fa-share-alt" onclick="copyPostLink('${postId}')" title="Copy post link"></i>
      </div>
      <div class="post-likes">${post.likes?.length || 0} likes</div>
      ${moodBadge}
      ${post.caption ? `<div class="post-caption"><strong>${post.author?.username || "user"}</strong> ${post.caption}</div>` : ""}
      <div class="post-comments">
        ${comments.length > 3 ? `<div class="view-comments" onclick="toggleComments('${postId}')">View all ${comments.length} comments</div>` : ""}
        ${comments.slice(-3).map(comment => `
          <div class="comment">
            <strong>${comment.author?.username || "user"}</strong> ${comment.text} <small>${timeAgo(comment.createdAt)}</small>
            ${comment.author?.id === currentUserId || comment.author?._id === currentUserId ? `<button class="comment-delete" onclick="deleteComment('${comment.id || comment._id}','${postId}')">&times;</button>` : ''}
          </div>
        `).join("")}
      </div>
      <div class="post-time">${timeAgo(post.createdAt)}</div>
      <div class="add-comment">
        <input type="text" placeholder="Add a comment..." id="input-${postId}" onkeypress="addComment(event, '${postId}')">
        <button class="post-btn" onclick="submitComment('${postId}')">Post</button>
      </div>
    </div>
  `;
}

// Double-click image to like with overlay
function doubleClickLike(postId) {
  const overlay = document.getElementById(`heart-${postId}`);
  if (overlay) {
    overlay.classList.add('show');
    setTimeout(() => overlay.classList.remove('show'), 700);
  }

  // fetch current state to decide whether to like or unlike
  const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);
  const heart = postEl?.querySelector('.fa-heart');
  const isLiked = heart?.classList.contains('liked');
  toggleLike(postId, isLiked);
}

// Toggle view all comments by fetching full post
async function toggleComments(postId) {
  try {
    const res = await fetch(`${API_URL}/posts/${postId}`);
    if (!res.ok) return;
    const post = await res.json();
    const comments = post.comments || [];
    const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);
    const commentsContainer = postEl?.querySelector('.post-comments');
    if (!commentsContainer) return;

    // if already showing all comments, collapse to preview
    if (commentsContainer.dataset.full === 'true') {
      commentsContainer.dataset.full = 'false';
      commentsContainer.innerHTML = `${comments.length > 3 ? `<div class="view-comments" onclick="toggleComments('${postId}')">View all ${comments.length} comments</div>` : ""}` +
        comments.slice(-3).map(c => `<div class="comment"><strong>${c.author?.username || 'user'}</strong> ${c.text} <small>${timeAgo(c.createdAt)}</small></div>`).join('');
      return;
    }

    commentsContainer.dataset.full = 'true';
    commentsContainer.innerHTML = `<div class="view-comments" onclick="toggleComments('${postId}')">Hide comments</div>` +
      comments.map(c => `<div class="comment"><strong>${c.author?.username || 'user'}</strong> ${c.text} <small>${timeAgo(c.createdAt)}</small></div>`).join('');
  } catch (err) {
    console.error('toggleComments error', err);
  }
}

// Submit comment via Post button
function submitComment(postId) {
  const input = document.getElementById(`input-${postId}`);
  if (!input) return;
  const fakeEvent = { key: 'Enter', target: input };
  addComment(fakeEvent, postId);
}

async function deleteComment(commentId, postId) {
  if (!token) {
    alert("Please login to delete comments.");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/comments/${commentId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (res.ok) {
      loadFeed();
      if (postId) {
        const commentSection = document.querySelector(`.post[data-post-id="${postId}"] .post-comments`);
        if (commentSection) toggleComments(postId);
      }
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Unable to delete comment.");
    }
  } catch (error) {
    console.error("Delete comment error:", error);
  }
}

function copyPostLink(postId) {
  const url = `${window.location.origin}/?post=${postId}`;
  navigator.clipboard.writeText(url).then(() => {
    alert("Post link copied to clipboard!");
  }).catch(() => {
    alert("Could not copy link. Try again.");
  });
}

function attachLikeListeners() {
  // Event delegation handles dynamic elements
}

async function toggleLike(postId, isLiked) {
  if (!token) {
    alert("Please login to like posts");
    return;
  }
  // Optimistic UI update
  try {
    const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);
    const heart = postEl?.querySelector('.fa-heart');
    const likesEl = postEl?.querySelector('.post-likes');

    if (heart) heart.classList.toggle('liked', !isLiked);
    if (heart) {
      heart.classList.add('animate-like');
      setTimeout(() => heart.classList.remove('animate-like'), 450);
    }
    if (likesEl) {
      const current = parseInt(likesEl.textContent) || 0;
      likesEl.textContent = `${isLiked ? current - 1 : current + 1} likes`;
    }

    // update modal UI if open
    const modalPost = document.getElementById('modalPost');
    if (modalPost && modalPost.dataset.postId === postId) {
      const modalHeart = modalPost.querySelector('.fa-heart');
      const modalLikesEl = modalPost.querySelector('.post-likes');
      if (modalHeart) modalHeart.classList.toggle('liked', !isLiked);
      if (modalHeart) {
        modalHeart.classList.add('animate-like');
        setTimeout(() => modalHeart.classList.remove('animate-like'), 450);
      }
      if (modalLikesEl) {
        const current = parseInt(modalLikesEl.textContent) || 0;
        modalLikesEl.textContent = `${isLiked ? current - 1 : current + 1} likes`;
      }
    }

    const url = isLiked ? `${API_URL}/posts/${postId}/unlike` : `${API_URL}/posts/${postId}/like`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) {
      // Revert on failure
      loadFeed();
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Error toggling like");
    }
  } catch (error) {
    console.error("Like error:", error);
    loadFeed();
  }
}

async function addComment(event, postId) {
  if (event.key !== "Enter" || !token) return;

  const input = event.target;
  const text = input.value.trim();

  if (!text) return;
  // Optimistic add comment to UI
  const postEl = document.querySelector(`.post[data-post-id="${postId}"]`);
  const commentsContainer = postEl?.querySelector('.post-comments');

  const username = currentUser?.username || 'you';
  const commentHtml = `\n    <div class="comment"><strong>${username}</strong> ${escapeHtml(text)}</div>`;

  if (commentsContainer) commentsContainer.innerHTML += commentHtml;
  // animate the newly added comment in feed
  if (commentsContainer) {
    const nodes = commentsContainer.querySelectorAll('.comment');
    const last = nodes[nodes.length - 1];
    if (last) last.classList.add('comment-added');
    setTimeout(() => last && last.classList.remove('comment-added'), 800);
  }
  input.value = "";

  try {
    const res = await fetch(`${API_URL}/comments/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ post: postId, text }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Error adding comment");
      loadFeed();
    }
  } catch (error) {
    console.error("Comment error:", error);
    loadFeed();
  }
}

// small helper to avoid injecting HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Create Post
async function handleCreatePost(event) {
  event.preventDefault();

  if (!token) {
    alert("Please login first");
    return;
  }

  const imageUrl = document.getElementById("postImage").value.trim();
  const caption = document.getElementById("postCaption").value.trim();
  const mood = document.getElementById("postMood").value;
  const image = selectedFileDataUrl || imageUrl;

  if (!image) {
    alert("Please choose a photo from your gallery or enter an image URL.");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/posts/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ image, caption, mood }),
    });

    if (res.ok) {
      alert("Post created successfully!");
      document.getElementById("postImage").value = "";
      document.getElementById("postCaption").value = "";
      document.getElementById("postMood").value = "";
      document.getElementById("postFile").value = "";
      selectedFileDataUrl = null;
      updateImagePreview();
      showPage("feed");
    } else {
      const data = await res.json();
      alert(data.message || "Error creating post");
    }
  } catch (error) {
    console.error("Create post error:", error);
    alert("Server error. Please try again.");
  }
}

function handleProfilePicUrlInput() {
  const url = document.getElementById("profilePicUrl").value.trim();
  if (url) {
    selectedProfilePicDataUrl = null;
    updateProfilePicPreview(url);
  } else if (!selectedProfilePicDataUrl) {
    updateProfilePicPreview();
  }
}

function handleProfilePicFileSelect(event) {
  const file = event.target.files[0];
  if (!file) {
    selectedProfilePicDataUrl = null;
    updateProfilePicPreview();
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    selectedProfilePicDataUrl = reader.result;
    updateProfilePicPreview(selectedProfilePicDataUrl);
  };
  reader.readAsDataURL(file);
}

function updateProfilePicPreview(src) {
  const preview = document.getElementById("profilePicPreview");
  if (!preview) return;

  if (src) {
    preview.innerHTML = `<img src="${src}" alt="Profile preview" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">`;
    preview.classList.add("has-image");
  } else {
    preview.classList.remove("has-image");
    preview.innerHTML = '<span>No preview</span>';
  }
}

async function handleChangeProfilePicture(event) {
  event.preventDefault();

  if (!token) {
    alert("Please login first");
    return;
  }

  const url = document.getElementById("profilePicUrl").value.trim();
  const profilePicture = selectedProfilePicDataUrl || url;

  if (!profilePicture) {
    alert("Please choose a profile image file or enter an image URL.");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ profilePicture }),
    });

    if (res.ok) {
      const data = await res.json();
      currentUser = data;
      localStorage.setItem("currentUser", JSON.stringify(data));
      document.getElementById("profilePicUrl").value = "";
      document.getElementById("profilePicFile").value = "";
      selectedProfilePicDataUrl = null;
      updateProfilePicPreview();
      alert("Profile picture updated successfully!");
      loadProfile();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Error updating profile picture.");
    }
  } catch (error) {
    console.error("Profile picture update error:", error);
    alert("Server error. Please try again.");
  }
}

// Profile Functions
async function loadProfile() {
  if (!token) return;

  const header = document.getElementById("profileHeader");
  const postsContainer = document.getElementById("userPosts");

  try {
    const res = await fetch(`${API_URL}/users/profile`, {
      headers: { "Authorization": `Bearer ${token}` },
    });

    const user = await res.json();

    const profilePic = document.getElementById("profilePic");
    profilePic.src = user.profilePicture || DEFAULT_AVATAR;
    profilePic.onerror = () => { profilePic.onerror = null; profilePic.src = DEFAULT_AVATAR; };
    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileUsername").textContent = `@${user.username}`;
    document.getElementById("profileBio").textContent = user.bio || "No bio yet";
    document.getElementById("followersCount").textContent = user.followers?.length || 0;
    document.getElementById("followingCount").textContent = user.following?.length || 0;

    // Load user posts
    // const postsRes = await fetch(`${API_URL}/posts/user/${user.id}`);
    const userId = user._id || user.id;

const postsRes = await fetch(`${API_URL}/posts/user/${userId}`);
    // const posts = await postsRes.json();
    const data = await postsRes.json();

const posts = Array.isArray(data)
    ? data
    : [];
    document.getElementById("postsCount").textContent = posts.length;

    if (posts.length === 0) {
      postsContainer.innerHTML = '<p style="text-align:center;padding:40px;">No posts yet</p>';
    } else {
      postsContainer.innerHTML = `
        <div class="profile-posts-grid">
          ${posts.map(post => `
            <img src="${post.image || DEFAULT_POST_IMAGE}" alt="Post" onclick="openPostModal('${post.id || post._id}')" onerror="this.onerror=null;this.src='${DEFAULT_POST_IMAGE}'">
          `).join("")}
        </div>
      `;
    }
  } catch (error) {
    console.error("Profile error:", error);
  }
}

// Search Functions
async function searchUsers() {
  const query = document.getElementById("searchInput").value.trim();
  const resultsContainer = document.getElementById("searchResults");

  if (query.length < 2) {
    resultsContainer.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/users/search/${encodeURIComponent(query)}`);
    const users = await res.json();

    if (users.length === 0) {
      resultsContainer.innerHTML = '<p style="text-align:center;padding:20px;">No users found</p>';
      return;
    }

    resultsContainer.innerHTML = users.map(user => `
      <div class="search-result">
        <img src="${user.profilePicture || DEFAULT_AVATAR}" alt="${user.username}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
        <div class="search-result-info">
          <strong>${user.username}</strong>
          <span>${user.name}</span>
        </div>
        <button class="btn-follow" onclick="followUser('${user._id}', this)">Follow</button>
      </div>
    `).join("");
  } catch (error) {
    console.error("Search error:", error);
  }
}

async function followUser(userId, button) {
  if (!token) {
    alert("Please login first");
    return;
  }

  const isFollowing = button.classList.contains("following");

  try {
    const url = isFollowing 
      ? `${API_URL}/follows/${userId}/unfollow`
      : `${API_URL}/follows/${userId}/follow`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (res.ok) {
      button.classList.toggle("following");
      button.textContent = isFollowing ? "Follow" : "Following";
    } else {
      const data = await res.json();
      alert(data.message || "Error following user");
    }
  } catch (error) {
    console.error("Follow error:", error);
  }
}

// Modal Functions
function openPostModal(postId) {
  document.getElementById("postModal").style.display = "block";
  loadPostDetail(postId);
}

function closeModal() {
  document.getElementById("postModal").style.display = "none";
}

async function loadPostDetail(postId) {
  try {
    const res = await fetch(`${API_URL}/posts/${postId}`);
    const post = await res.json();

    const comments = post.comments || [];
    
    const detailPostId = post.id || post._id;

    const modal = document.getElementById("modalPost");
    modal.dataset.postId = postId;

    document.getElementById("modalPost").innerHTML = `
      <div class="post">
        <div class="post-header">
          <img src="${post.author?.profilePicture || DEFAULT_AVATAR}" alt="${post.author?.username}" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}'">
          <div class="user-info">
            <strong>${post.author?.username}</strong>
          </div>
        </div>
        <img src="${post.image || DEFAULT_POST_IMAGE}" alt="Post" class="post-image" onerror="this.onerror=null;this.src='${DEFAULT_POST_IMAGE}'">
        <div class="post-actions">
          <i class="fas fa-heart ${post.likes?.includes(currentUserId) ? 'liked' : ''}" onclick="toggleLike('${postId}', ${post.likes?.includes(currentUserId)})"></i>
          <i class="fas fa-comment"></i>
        </div>
        <div class="post-likes">${post.likes?.length} likes</div>
        ${post.caption ? `<div class="post-caption"><strong>${post.author?.username}</strong> ${post.caption}</div>` : ""}
        <div class="post-comments">
          ${comments.map(comment => `
            <div class="comment">
              <strong>${comment.author?.username}</strong> ${comment.text}
              ${comment.author?.id === currentUserId || comment.author?._id === currentUserId ? `<button class="comment-delete" onclick="deleteComment('${comment.id || comment._id}','${postId}')">&times;</button>` : ''}
            </div>
          `).join("")}
        </div>
        <div class="add-comment">
          <input type="text" placeholder="Add a comment..." onkeypress="addComment(event, '${postId}')">
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Post detail error:", error);
  }
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById("postModal");
  if (event.target === modal) {
    closeModal();
  }
}

// Utility Functions
function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
}
