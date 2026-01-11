

// Simple client script to render activities with participants and handle signups

function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])
  );
}

function showMessage(msg, type = "info") {
  const el = document.getElementById("message");
  el.textContent = msg;
  el.className = `message ${type}`;
  el.classList.remove("hidden");
  clearTimeout(el._hideTimeout);
  el._hideTimeout = setTimeout(() => el.classList.add("hidden"), 4000);
}

// Create a participant list item with a remove button and attach handler
function createParticipantListItem(email, activityName, card) {
  const li = document.createElement("li");
  const span = document.createElement("span");
  span.textContent = email;

  const btn = document.createElement("button");
  btn.className = "remove-btn";
  btn.title = "Remove participant";
  btn.innerHTML = "🗑️";
  btn.addEventListener("click", async (e) => {
    e.stopPropagation();
    try {
      const endpoint = `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`;
      const res = await fetch(endpoint, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMessage(payload.detail || "Failed to remove participant.", "error");
        return;
      }

      // remove element from UI
      li.remove();

      // update count
      const countEl = card.querySelector(".participant-count");
      const newCount = Math.max(0, (parseInt(countEl.textContent || "0", 10) - 1));
      countEl.textContent = String(newCount);

      // if no participants left, show placeholder
      const ul = card.querySelector(".participants-list");
      if (ul.children.length === 0) {
        const placeholder = document.createElement("li");
        placeholder.className = "no-participants";
        placeholder.textContent = "No participants yet";
        ul.appendChild(placeholder);
      }

      showMessage(payload.message || "Participant removed.", "success");
    } catch (err) {
      showMessage("Network error. Please try again.", "error");
    }
  });

  li.appendChild(span);
  li.appendChild(btn);
  return li;
}

async function loadActivities() {
  const res = await fetch("/activities");
  const data = await res.json();
  const list = document.getElementById("activities-list");
  list.innerHTML = "";

  const names = Object.keys(data);
  if (names.length === 0) {
    list.innerHTML = "<p>No activities available.</p>";
    return;
  }

  names.forEach(name => {
    const activity = data[name];

    const card = document.createElement("div");
    card.className = "activity-card";

    const title = document.createElement("h4");
    title.textContent = name;
    card.appendChild(title);

    const desc = document.createElement("p");
    desc.textContent = activity.description;
    card.appendChild(desc);

    const schedule = document.createElement("p");
    schedule.innerHTML = `<strong>Schedule:</strong> ${escapeHtml(activity.schedule)}`;
    card.appendChild(schedule);

    const participantsWrap = document.createElement("div");
    participantsWrap.className = "participants";
    participantsWrap.innerHTML = `<h5>Participants <span class="participant-count">${activity.participants.length}</span></h5>`;

    const ul = document.createElement("ul");
    ul.className = "participants-list";
    if (!activity.participants || activity.participants.length === 0) {
      const li = document.createElement("li");
      li.className = "no-participants";
      li.textContent = "No participants yet";
      ul.appendChild(li);
    } else {
      activity.participants.forEach(p => {
        const li = createParticipantListItem(p, name, card);
        ul.appendChild(li);
      });
    }

    participantsWrap.appendChild(ul);
    card.appendChild(participantsWrap);
    list.appendChild(card);
  });

  // populate select
  const select = document.getElementById("activity");
  select.innerHTML = '<option value="">-- Select an activity --</option>';
  names.forEach(n => {
    const opt = document.createElement("option");
    opt.value = n;
    opt.textContent = n;
    select.appendChild(opt);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadActivities();

  const form = document.getElementById("signup-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activity = document.getElementById("activity").value;

    if (!email || !activity) {
      showMessage("Please enter an email and select an activity.", "error");
      return;
    }

    try {
      const endpoint = `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(endpoint, { method: "POST" });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMessage(payload.detail || "Failed to sign up.", "error");
        return;
      }

      showMessage(payload.message || "Signed up successfully.", "success");

      // update UI: find matching card and append participant
      const cards = document.querySelectorAll(".activity-card");
      for (const card of cards) {
        const h4 = card.querySelector("h4");
        if (h4 && h4.textContent === activity) {
          const ul = card.querySelector(".participants-list");
          const no = ul.querySelector(".no-participants");
          if (no) no.remove();
          const li = createParticipantListItem(email, activity, card);
          ul.appendChild(li);

          const countEl = card.querySelector(".participant-count");
          countEl.textContent = String(parseInt(countEl.textContent || "0", 10) + 1);
          break;
        }
      }

      document.getElementById("email").value = "";
    } catch (err) {
      showMessage("Network error. Please try again.", "error");
    }
  });
});
