const token = localStorage.getItem("jobtrack_token");
if (!token) location.href = "login.html";

let state = { user:null, applications:[], interviews:[], saved:[] };

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[c]));
const authHeaders = () => ({ "Content-Type":"application/json", "Authorization": "Bearer " + localStorage.getItem("jobtrack_token") });

async function api(path, options={}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {...authHeaders(), ...(options.headers || {})}
  });
  if (response.status === 401) {
    localStorage.removeItem("jobtrack_token");
    location.href = "login.html";
    throw new Error("Session expired");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Request failed");
  }
  return response.status === 204 ? null : response.json();
}

async function loadAll() {
  try {
    const [user, applications, interviews, saved] = await Promise.all([
      api("/me"), api("/applications"), api("/interviews"), api("/saved-jobs")
    ]);
    state = {user, applications, interviews, saved};
    render();
  } catch (e) { toast(e.message); }
}

function render() {
  const u = state.user;
  $("userName").textContent = u.name;
  $("userTitle").textContent = u.title || "Candidate";
  $("avatar").textContent = (u.name || "A").charAt(0).toUpperCase();
  $("statApplications").textContent = state.applications.length;
  $("statReview").textContent = state.applications.filter(a => a.status === "Under Review").length;
  $("statInterviews").textContent = state.interviews.length;
  $("statOffers").textContent = state.applications.filter(a => a.status === "Offer").length;

  renderApplications($("dashboardApplications"), state.applications.slice(0,5));
  renderApplications($("applicationsTable"), state.applications);
  renderInterviews();
  renderSaved();
  fillProfile();
}

function statusClass(status) {
  return ({ "Applied":"applied", "Under Review":"review", "Interview":"interview", "Offer":"offer", "Rejected":"rejected" }[status] || "applied");
}

function renderApplications(container, list) {
  if (!container) return;
  if (!list.length) {
    container.innerHTML = `<div class="empty"><strong>No applications yet</strong>Add your first application to start tracking your search.</div>`;
    return;
  }
  container.innerHTML = `<table class="data-table">
    <thead><tr><th>Company</th><th>Role</th><th>Applied</th><th>Status</th><th></th></tr></thead>
    <tbody>${list.map(a => `<tr>
      <td><div class="company">${esc(a.company)}</div><div class="subtext">${esc(a.location || "Location not added")}</div></td>
      <td>${esc(a.role)}</td>
      <td>${esc(a.appliedDate || "-")}</td>
      <td><span class="pill ${statusClass(a.status)}">${esc(a.status)}</span></td>
      <td><div class="actions">
        <button class="icon-btn" onclick="editApplication(${a.id})">Edit</button>
        <button class="icon-btn" onclick="deleteApplication(${a.id})">Delete</button>
      </div></td>
    </tr>`).join("")}</tbody></table>`;
}

function renderInterviews() {
  const el = $("interviewsGrid");
  if (!state.interviews.length) {
    el.innerHTML = `<div class="section-card empty" style="grid-column:1/-1"><strong>No interviews scheduled</strong>Add an interview to keep preparation on track.</div>`;
    return;
  }
  el.innerHTML = state.interviews.map(i => `<article class="mini-card">
    <h3>${esc(i.company)}</h3><div class="meta">${esc(i.role || "")}</div>
    <div class="date">📅 ${esc(formatDateTime(i.interviewDate))} &nbsp; · &nbsp; ${esc(i.type || "Interview")}</div>
    <span class="pill interview">${esc(i.status || "Scheduled")}</span>
    <div class="actions" style="margin-top:16px"><button class="icon-btn" onclick="deleteInterview(${i.id})">Delete</button></div>
  </article>`).join("");
}

function renderSaved() {
  const el = $("savedGrid");
  if (!state.saved.length) {
    el.innerHTML = `<div class="section-card empty" style="grid-column:1/-1"><strong>No saved jobs</strong>Save interesting roles here before you apply.</div>`;
    return;
  }
  el.innerHTML = state.saved.map(s => `<article class="mini-card">
    <h3>${esc(s.role)}</h3><div class="meta">${esc(s.company)} · ${esc(s.location || "Remote / location not added")}</div>
    <div class="date">☆ Saved ${esc(s.savedAt ? new Date(s.savedAt).toLocaleDateString() : "")}</div>
    <div class="actions">
      ${s.jobUrl ? `<a class="secondary-btn" href="${esc(s.jobUrl)}" target="_blank" rel="noopener">Open job</a>` : ""}
      <button class="icon-btn" onclick="deleteSaved(${s.id})">Delete</button>
    </div>
  </article>`).join("");
}

function fillProfile() {
  const u = state.user;
  $("profileName").value = u.name || "";
  $("profileTitle").value = u.title || "";
  $("profileEmail").value = u.email || "";
  $("profilePhone").value = u.phone || "";
  $("profileLocation").value = u.location || "";
  $("profileBio").value = u.bio || "";
  renderResume();
  updateProfilePreview();
  updateProfileCompletion();
}

function renderResume() {
  const hasResume = Boolean(state.user && state.user.hasResume);
  $("profileResumeName").textContent = hasResume ? state.user.resume : "No resume attached";
  $("profileResumeButton").textContent = hasResume ? "Replace resume" : "Add resume";
  $("profileResumeDownload").hidden = !hasResume;
  $("profileResumeRemove").hidden = !hasResume;
}

async function uploadResume(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/profile/resume`, {
    method: "POST",
    headers: {"Authorization": "Bearer " + localStorage.getItem("jobtrack_token")},
    body: formData
  });
  if (response.status === 401) {
    localStorage.removeItem("jobtrack_token");
    location.href = "login.html";
    throw new Error("Session expired");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Resume upload failed (${response.status}).`);
  state.user = data;
  renderResume();
  toast("Resume uploaded");
}

async function downloadResume() {
  const response = await fetch(`${API_BASE}/profile/resume`, {
    headers: {"Authorization": "Bearer " + localStorage.getItem("jobtrack_token")}
  });
  if (response.status === 401) {
    localStorage.removeItem("jobtrack_token");
    location.href = "login.html";
    throw new Error("Session expired");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Resume download failed (${response.status}).`);
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = state.user.resume;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function removeResume() {
  const response = await fetch(`${API_BASE}/profile/resume`, {
    method: "DELETE",
    headers: {"Authorization": "Bearer " + localStorage.getItem("jobtrack_token")}
  });
  if (response.status === 401) {
    localStorage.removeItem("jobtrack_token");
    location.href = "login.html";
    throw new Error("Session expired");
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Resume removal failed (${response.status}).`);
  }
  state.user = await response.json();
  renderResume();
  toast("Resume removed");
}

function updateProfilePreview() {
  const name = $("profileName").value.trim();
  const title = $("profileTitle").value.trim();
  $("profilePreviewName").textContent = name || "Your name";
  $("profilePreviewTitle").textContent = title || "Add a professional headline";
  $("profileAvatar").textContent = (name || "A").charAt(0).toUpperCase();
  $("profileBioCount").textContent = $("profileBio").value.length;
}

function updateProfileCompletion() {
  const fields = ["profileName", "profileEmail", "profileTitle", "profilePhone", "profileLocation", "profileBio"];
  const completed = fields.filter(id => $(id).value.trim()).length;
  const percentage = Math.round(completed / fields.length * 100);
  const progress = document.querySelector(".profile-progress");

  $("profileCompletion").textContent = `${percentage}%`;
  $("profileProgress").style.width = `${percentage}%`;
  progress.setAttribute("aria-valuenow", String(percentage));

  const remaining = [
    ["profileTitle", "a professional headline"],
    ["profilePhone", "your phone number"],
    ["profileLocation", "your location"],
    ["profileBio", "a professional summary"]
  ].find(([id]) => !$(id).value.trim());

  $("profileCompletionHint").textContent = remaining
    ? `Add ${remaining[1]} to make your profile more complete.`
    : "Great work — your profile is complete.";
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString([], {dateStyle:"medium", timeStyle:"short"});
}

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}

function ensureModalStyles() {
  if (document.getElementById("jobtrack-modal-styles")) return;
  const style = document.createElement("style");
  style.id = "jobtrack-modal-styles";
  style.textContent = `
    .modal-card {
      position: relative;
      z-index: 1;
      width: min(680px, calc(100vw - 28px));
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid rgba(225, 226, 235, 0.9);
      border-radius: 28px;
      padding: 28px 28px 22px;
      box-shadow: 0 28px 80px rgba(30, 22, 60, 0.2);
      backdrop-filter: blur(12px);
    }
    .modal-close {
      position: absolute;
      top: 18px;
      right: 18px;
      width: 36px;
      height: 36px;
      border: 0;
      border-radius: 50%;
      background: #f5f4f9;
      color: #302d3a;
      font-size: 28px;
      line-height: 1;
      display: grid;
      place-items: center;
      cursor: pointer;
      transition: background 0.2s ease, transform 0.2s ease;
    }
    .modal-close:hover {
      background: #ece9f6;
      transform: rotate(90deg);
    }
    .modal-card .eyebrow {
      margin: 0 0 10px;
      letter-spacing: 0.18em;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #8a84a3;
    }
    .modal-card h2 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 2.8vw, 2.5rem);
      line-height: 1.08;
      letter-spacing: -0.06em;
      color: #171826;
    }
    .modal-card .muted {
      margin: 0 0 22px;
      font-size: 1rem;
      line-height: 1.6;
      color: #6f6b7e;
    }
    .modal-card .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px 20px;
      margin-top: 12px;
    }
    .modal-card .form-grid label {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #2e2d3a;
    }
    .modal-card .form-grid .full-width {
      grid-column: 1 / -1;
    }
    .modal-card .form-grid input,
    .modal-card .form-grid select,
    .modal-card .form-grid textarea {
      width: 100%;
      min-height: 46px;
      border: 1px solid #d5d7e2;
      border-radius: 12px;
      background: #fff;
      color: #1d1e2b;
      padding: 11px 12px;
      font: 500 14px Inter, Arial, sans-serif;
      transition: border-color 0.18s ease, box-shadow 0.18s ease;
    }
    .modal-card .form-grid textarea {
      min-height: 110px;
      resize: vertical;
      padding-top: 12px;
    }
    .autocomplete-control {
      position: relative;
      display: block;
      width: 100%;
    }
    .autocomplete-options {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      left: 0;
      z-index: 120;
      display: grid;
      max-height: 230px;
      overflow-y: auto;
      padding: 5px;
      border: 1px solid #e3e1ec;
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 12px 30px rgba(30, 22, 60, 0.16);
    }
    .autocomplete-options[hidden] {
      display: none;
    }
    .autocomplete-option {
      border: 0;
      border-radius: 8px;
      padding: 10px 11px;
      background: transparent;
      color: #292738;
      font: 500 13px Inter, Arial, sans-serif;
      text-align: left;
      cursor: pointer;
    }
    .autocomplete-option:hover,
    .autocomplete-option[aria-selected="true"] {
      background: #f1eeff;
      color: #563dd1;
    }
    .modal-card .form-grid input:focus,
    .modal-card .form-grid select:focus,
    .modal-card .form-grid textarea:focus {
      outline: none;
      border-color: #6854de;
      box-shadow: 0 0 0 4px rgba(104, 84, 222, 0.12);
    }
    .modal-card .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 22px;
    }
    .modal-card .secondary-btn,
    .modal-card .primary-btn {
      min-width: 128px;
      min-height: 44px;
      padding: 10px 18px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
    }
    .modal-card .secondary-btn {
      background: #fff;
      border: 1px solid #d9d9e5;
      color: #3d3a4b;
    }
    @media (max-width: 640px) {
      .modal-card {
        padding: 22px 18px 18px;
        border-radius: 22px;
      }
      .modal-card .form-grid {
        grid-template-columns: 1fr;
        gap: 14px;
      }
      .modal-card .modal-actions {
        flex-direction: column-reverse;
      }
      .modal-card .secondary-btn,
      .modal-card .primary-btn {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(style);
}

function openModal(html) {
  ensureModalStyles();
  $("modalContent").innerHTML = html;
  $("modal").classList.remove("hidden");
}
function closeModal() { $("modal").classList.add("hidden"); $("modalContent").innerHTML=""; }
document.addEventListener("click", e => {
  if (e.target.matches("[data-close-modal]")) closeModal();
});

const commonCompanySuggestions = [
  "Accenture", "Adobe", "Airbnb", "American Express", "Amazon", "Apple", "Atlassian",
  "BCG", "Barclays", "Birlasoft", "Bloomberg", "Bosch", "Capgemini", "Cisco",
  "Citibank", "Cognizant", "Deloitte", "Deutsche Bank", "Dell", "EY", "Flipkart",
  "Ford", "GE", "Goldman Sachs", "Google", "HCLTech", "HSBC", "IBM", "Infosys",
  "Intel", "JP Morgan", "JPMorgan Chase", "KPMG", "LinkedIn", "LTI Mindtree",
  "Mahindra", "Meta", "Microsoft", "Morgan Stanley", "Netflix", "Oracle", "PayPal",
  "Paytm", "PhonePe", "PwC", "Qualcomm", "Reliance", "Salesforce",
  "Samsung", "ServiceNow", "Siemens", "Sony", "Spotify", "Stripe",
  "Swiggy", "TCS", "Tech Mahindra", "Tesla", "Uber", "Walmart", "Wipro",
  "Yahoo", "Zomato", "Zoho"
];

const commonRoleSuggestions = [
  "Accountant", "Accounting Analyst", "Administrative Assistant", "Android Developer",
  "Application Developer", "Architect", "Automation Engineer", "Backend Developer",
  "Business Analyst", "Business Development Associate", "Business Development Manager",
  "Cloud Engineer", "Cloud Architect", "Data Analyst", "Data Engineer", "Data Scientist",
  "Database Administrator", "DevOps Engineer", "Digital Marketing Executive",
  "Electrical Engineer", "Embedded Software Engineer", "Engineering Manager",
  "Finance Analyst", "Financial Analyst", "Flutter Developer",
  "Frontend Developer", "Full Stack Developer", "Game Developer", "Graphic Designer",
  "HR Executive", "HR Manager", "IT Administrator", "IT Support Engineer",
  "iOS Developer", "Java Developer", "JavaScript Developer",
  "Machine Learning Engineer", "Manual Tester", "Marketing Associate", "Marketing Manager",
  "Network Engineer", "Operations Analyst", "Operations Manager", "Product Analyst",
  "Product Designer", "Product Manager", "Program Manager", "Project Coordinator",
  "Project Manager", "Python Developer", "QA Analyst", "QA Engineer", "QA Tester",
  "React Developer", "Recruiter", "Research Analyst",
  "Sales Associate", "Sales Executive", "Sales Manager", "Scrum Master",
  "Security Analyst", "Security Engineer", "SEO Specialist", "Site Reliability Engineer",
  "Software Developer", "Software Development Engineer", "Software Engineer",
  "Software Engineer Intern", "Solutions Architect", "Systems Analyst",
  "Systems Engineer", "Technical Lead", "Technical Support Engineer", "Technical Writer",
  "Tester", "UI Designer", "UI/UX Designer", "UX Designer", "Web Developer"
];

const commonLocationSuggestions = [
  "Ahmedabad, India", "Amritsar, India", "Aurangabad, India", "Bengaluru, India",
  "Bhopal, India", "Bhubaneswar, India", "Chandigarh, India", "Chennai, India",
  "Coimbatore, India", "Dehradun, India", "Delhi, India", "Faridabad, India",
  "Ghaziabad, India", "Gurugram, India", "Guwahati, India", "Gwalior, India",
  "Hyderabad, India", "Indore, India", "Jaipur, India", "Jamshedpur, India",
  "Kanpur, India", "Kochi, India", "Kolkata, India", "Lucknow, India",
  "Madurai, India", "Mangaluru, India", "Mumbai, India", "Mysuru, India",
  "Nagpur, India", "Nashik, India", "Noida, India", "Patna, India",
  "Puducherry, India", "Pune, India", "Raipur, India", "Rajkot, India",
  "Ranchi, India", "Surat, India", "Thane, India", "Thiruvananthapuram, India",
  "Tiruchirappalli, India", "Udaipur, India", "Vadodara, India", "Vijayawada, India",
  "Visakhapatnam, India", "New York, NY, USA", "San Francisco, CA, USA",
  "Seattle, WA, USA", "Austin, TX, USA", "Boston, MA, USA", "Chicago, IL, USA",
  "Los Angeles, CA, USA", "Toronto, Canada", "Vancouver, Canada", "London, UK",
  "Manchester, UK", "Dublin, Ireland", "Berlin, Germany", "Munich, Germany",
  "Amsterdam, Netherlands", "Paris, France", "Singapore", "Sydney, Australia",
  "Melbourne, Australia", "Tokyo, Japan", "Dubai, UAE", "Remote"
];

function jobSuggestions(field, defaults=[]) {
  const jobs = [...state.applications, ...state.interviews, ...state.saved];
  const values = [...defaults, ...jobs.map(job => job[field])]
    .map(value => String(value || "").trim())
    .filter(Boolean);
  return [...new Map(values.map(value => [value.toLocaleLowerCase(), value])).values()]
    .sort((a, b) => a.localeCompare(b));
}

function autocompleteField(label, id, value, suggestions, required=false) {
  return `<label class="autocomplete-label">${label}
    <span class="autocomplete-control">
      <input id="${id}" data-suggestions="${esc(JSON.stringify(suggestions))}" autocomplete="off" aria-autocomplete="list" aria-expanded="false"${required ? " required" : ""} value="${esc(value)}">
      <span class="autocomplete-options" role="listbox" aria-label="${esc(label)} suggestions" hidden></span>
    </span>
  </label>`;
}

function bindAutocomplete(container) {
  container.querySelectorAll(".autocomplete-control input").forEach(input => {
    const options = [...new Set(JSON.parse(input.dataset.suggestions || "[]"))];
    const list = input.parentElement.querySelector(".autocomplete-options");
    let activeIndex = -1;

    function hideSuggestions() {
      list.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
      activeIndex = -1;
    }

    function renderSuggestions() {
      const query = input.value.trim().toLocaleLowerCase();
      const matches = options.filter(option => !query || option.toLocaleLowerCase().includes(query)).slice(0, 10);
      list.replaceChildren();
      activeIndex = -1;
      matches.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "autocomplete-option";
        button.id = `${input.id}-suggestion-${index}`;
        button.setAttribute("role", "option");
        button.textContent = option;
        button.addEventListener("mousedown", event => event.preventDefault());
        button.addEventListener("click", () => {
          input.value = option;
          input.dispatchEvent(new Event("input", {bubbles:true}));
          hideSuggestions();
          input.focus();
        });
        list.appendChild(button);
      });
      list.hidden = matches.length === 0;
      input.setAttribute("aria-expanded", String(matches.length > 0));
    }

    input.addEventListener("focus", renderSuggestions);
    input.addEventListener("click", renderSuggestions);
    input.addEventListener("input", renderSuggestions);
    input.addEventListener("blur", () => setTimeout(hideSuggestions, 120));
    input.addEventListener("keydown", event => {
      const buttons = list.querySelectorAll(".autocomplete-option");
      if (event.key === "Escape") {
        hideSuggestions();
      } else if (!list.hidden && buttons.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
        event.preventDefault();
        activeIndex = (activeIndex + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
        buttons.forEach((button, index) => button.setAttribute("aria-selected", String(index === activeIndex)));
        input.setAttribute("aria-activedescendant", buttons[activeIndex].id);
        buttons[activeIndex].scrollIntoView({block:"nearest"});
      } else if (!list.hidden && event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        buttons[activeIndex].click();
      }
    });
  });
}

function applicationForm(item={}) {
  const companies = jobSuggestions("company", commonCompanySuggestions);
  const roles = jobSuggestions("role", commonRoleSuggestions);
  const locations = jobSuggestions("location", commonLocationSuggestions);
  openModal(`<p class="eyebrow">${item.id ? "UPDATE APPLICATION" : "NEW APPLICATION"}</p>
    <h2>${item.id ? "Edit application" : "Add application"}</h2>
    <p class="muted">Keep the details simple. You can update the status later.</p>
    <form id="applicationForm">
      <div class="form-grid">
        ${autocompleteField("Company", "fCompany", item.company, companies, true)}
        ${autocompleteField("Role", "fRole", item.role, roles, true)}
        ${autocompleteField("Location", "fLocation", item.location, locations)}
        <label>Source<input id="fSource" placeholder="LinkedIn, referral..." value="${esc(item.source)}"></label>
        <label>Applied date<input id="fDate" type="date" value="${esc(item.appliedDate || new Date().toISOString().slice(0,10))}"></label>
        <label>Status<select id="fStatus">
          ${["Applied","Under Review","Interview","Offer","Rejected"].map(s=>`<option ${s===item.status?"selected":""}>${s}</option>`).join("")}
        </select></label>
        <label class="full-width">Job URL<input id="fUrl" type="url" placeholder="https://..." value="${esc(item.jobUrl)}"></label>
        <label class="full-width">Notes<textarea id="fNotes" rows="3">${esc(item.notes)}</textarea></label>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-btn" data-close-modal>Cancel</button><button class="primary-btn">${item.id?"Save changes":"Add application"}</button></div>
    </form>`);
  bindAutocomplete($("applicationForm"));
  $("applicationForm").addEventListener("submit", async e => {
    e.preventDefault();
    const body = {company:$("fCompany").value,role:$("fRole").value,location:$("fLocation").value,source:$("fSource").value,appliedDate:$("fDate").value,status:$("fStatus").value,jobUrl:$("fUrl").value,notes:$("fNotes").value};
    try {
      await api(item.id ? `/applications/${item.id}` : "/applications", {method:item.id?"PUT":"POST",body:JSON.stringify(body)});
      closeModal(); await loadAll(); toast(item.id ? "Application updated" : "Application added");
    } catch(e){toast(e.message);}
  });
}

function interviewForm() {
  const companies = jobSuggestions("company", commonCompanySuggestions);
  const roles = jobSuggestions("role", commonRoleSuggestions);
  openModal(`<p class="eyebrow">PREPARE AHEAD</p><h2>Add interview</h2><p class="muted">Put the conversation on your calendar.</p>
    <form id="interviewForm">
      <div class="form-grid">
        ${autocompleteField("Company", "iCompany", "", companies, true)}
        ${autocompleteField("Role", "iRole", "", roles, true)}
        <label>Date & time<input id="iDate" type="datetime-local" required></label>
        <label>Type<input id="iType" placeholder="HR / Technical / Manager"></label>
        <label class="full-width">Notes<textarea id="iNotes" rows="3"></textarea></label>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-btn" data-close-modal>Cancel</button><button class="primary-btn">Add interview</button></div>
    </form>`);
  bindAutocomplete($("interviewForm"));
  $("interviewForm").addEventListener("submit", async e=>{
    e.preventDefault();
    try {
      await api("/interviews",{method:"POST",body:JSON.stringify({company:$("iCompany").value,role:$("iRole").value,interviewDate:$("iDate").value,type:$("iType").value,status:"Scheduled",notes:$("iNotes").value})});
      closeModal(); await loadAll(); toast("Interview added");
    } catch(e){toast(e.message);}
  });
}

function savedForm() {
  const companies = jobSuggestions("company", commonCompanySuggestions);
  const roles = jobSuggestions("role", commonRoleSuggestions);
  const locations = jobSuggestions("location", commonLocationSuggestions);
  openModal(`<p class="eyebrow">SAVE FOR LATER</p><h2>Save a job</h2><p class="muted">Store a role you may want to apply to.</p>
    <form id="savedForm">
      <div class="form-grid">
        ${autocompleteField("Company", "sCompany", "", companies, true)}
        ${autocompleteField("Role", "sRole", "", roles, true)}
        ${autocompleteField("Location", "sLocation", "", locations)}
        <label>Job URL<input id="sUrl" type="url" placeholder="https://..."></label>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-btn" data-close-modal>Cancel</button><button class="primary-btn">Save job</button></div>
    </form>`);
  bindAutocomplete($("savedForm"));
  $("savedForm").addEventListener("submit", async e=>{
    e.preventDefault();
    try {
      await api("/saved-jobs",{method:"POST",body:JSON.stringify({company:$("sCompany").value,role:$("sRole").value,location:$("sLocation").value,jobUrl:$("sUrl").value})});
      closeModal(); await loadAll(); toast("Job saved");
    } catch(e){toast(e.message);}
  });
}

window.editApplication = id => applicationForm(state.applications.find(a=>a.id===id));
window.deleteApplication = async id => {
  if(!confirm("Delete this application?")) return;
  try { await api(`/applications/${id}`,{method:"DELETE"}); await loadAll(); toast("Application deleted"); } catch(e){toast(e.message);}
};
window.deleteInterview = async id => {
  if(!confirm("Delete this interview?")) return;
  try { await api(`/interviews/${id}`,{method:"DELETE"}); await loadAll(); toast("Interview deleted"); } catch(e){toast(e.message);}
};
window.deleteSaved = async id => {
  if(!confirm("Remove this saved job?")) return;
  try { await api(`/saved-jobs/${id}`,{method:"DELETE"}); await loadAll(); toast("Saved job removed"); } catch(e){toast(e.message);}
};

document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  btn.classList.add("active");
  $(`page-${btn.dataset.page}`).classList.add("active");
  $("sidebar").classList.remove("open");
}));

document.addEventListener("click", e=>{
  const action = e.target.dataset.action;
  if(action==="add-application") applicationForm();
  if(action==="add-interview") interviewForm();
  if(action==="add-saved") savedForm();
});
$("mobileMenu").addEventListener("click",()=> $("sidebar").classList.toggle("open"));
$("logoutBtn").addEventListener("click",()=>{localStorage.removeItem("jobtrack_token");location.href="login.html";});

$("profileForm").addEventListener("input", () => {
  updateProfilePreview();
  updateProfileCompletion();
  $("profileMessage").textContent = "";
});

$("profileResumeButton").addEventListener("click", () => $("profileResumeFile").click());
$("profileResumeFile").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  try { await uploadResume(file); }
  catch(err) { toast(err.message); }
  finally { e.target.value = ""; }
});
$("profileResumeDownload").addEventListener("click", async () => {
  try { await downloadResume(); }
  catch(err) { toast(err.message); }
});
$("profileResumeRemove").addEventListener("click", async () => {
  if (!confirm("Remove your attached resume?")) return;
  try { await removeResume(); }
  catch(err) { toast(err.message); }
});

$("profileForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const saveButton = $("profileSaveButton");
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";
  try {
    state.user = await api("/profile",{method:"PUT",body:JSON.stringify({
      name:$("profileName").value,title:$("profileTitle").value,phone:$("profilePhone").value,
      location:$("profileLocation").value,bio:$("profileBio").value
    })});
    render(); $("profileMessage").textContent="Profile saved successfully.";
    toast("Profile saved");
  } catch(err){$("profileMessage").textContent=err.message;}
  finally {
    saveButton.disabled = false;
    saveButton.innerHTML = 'Save profile <span aria-hidden="true">→</span>';
  }
});

loadAll();
