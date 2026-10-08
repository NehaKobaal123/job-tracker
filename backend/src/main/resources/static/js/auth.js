function showMessage(text) {
  const el = document.getElementById("message");
  if (el) el.textContent = text;
}

async function submitAuth(url, body) {
  const response = await fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status} ${response.statusText}).`);
  }
  return data;
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    showMessage("");
    try {
      const data = await submitAuth("/auth/login", {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
      });
      localStorage.setItem("jobtrack_token", data.token);
      location.href = "index.html";
    } catch (err) { showMessage(err.message); }
  });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async e => {
    e.preventDefault();
    showMessage("");
    try {
      const data = await submitAuth("/auth/register", {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
      });
      localStorage.setItem("jobtrack_token", data.token);
      location.href = "index.html";
    } catch (err) { showMessage(err.message); }
  });
}
