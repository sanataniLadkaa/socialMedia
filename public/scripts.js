const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    const createPostForm = document.getElementById('create-post-form');
    const logoutBtn = document.getElementById('logout-btn');
    const createPostSection = document.getElementById('create-post-section');
    const postsContainer = document.getElementById('posts');

    const fetchPosts = async () => {
        const res = await fetch(`${API_URL}/posts`, { credentials: 'include' });
        const posts = await res.json();
        postsContainer.innerHTML = '';
        posts.forEach(post => {
            const postDiv = document.createElement('div');
            postDiv.className = 'post';
            postDiv.innerHTML = `
                <h3>${post.title}</h3>
                <p>${post.content}</p>
                <p><strong>Author:</strong> ${post.author}</p>
                <p><strong>Likes:</strong> ${post.likes}</p>
                <button onclick="likePost('${post._id}')">Like</button>
                <form onsubmit="commentPost(event, '${post._id}')">
                    <input type="text" placeholder="Add a comment" required />
                    <button type="submit">Comment</button>
                </form>
                <div class="comments">
                    ${post.comments.map(comment => `<p><strong>${comment.author}:</strong> ${comment.text}</p>`).join('')}
                </div>
            `;
            postsContainer.appendChild(postDiv);
        });
    };

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const password = document.getElementById('register-password').value;
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            alert(data.message);
            registerForm.reset();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            alert(data.message);
            createPostSection.style.display = 'block';
            logoutBtn.style.display = 'block';
            loginForm.style.display = 'none';
            registerForm.style.display = 'none';
            fetchPosts();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    logoutBtn.addEventListener('click', async () => {
        const res = await fetch(`${API_URL}/logout`, {
            method: 'POST',
            credentials: 'include',
        });
        const data = await res.json();
        alert(data.message);
        createPostSection.style.display = 'none';
        logoutBtn.style.display = 'none';
        loginForm.style.display = 'block';
        registerForm.style.display = 'block';
    });

    createPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        try {
            const res = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content }),
                credentials: 'include',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            alert(data.message);
            createPostForm.reset();
            fetchPosts();
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });
});

async function likePost(postId) {
    const res = await fetch(`${API_URL}/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
    });
    const data = await res.json();
    alert(data.message);
    fetchPosts();
}

async function commentPost(event, postId) {
    event.preventDefault();
    const text = event.target.querySelector('input').value;
    const res = await fetch(`${API_URL}/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        credentials: 'include',
    });
    const data = await res.json();
    alert(data.message);
    fetchPosts();
}
