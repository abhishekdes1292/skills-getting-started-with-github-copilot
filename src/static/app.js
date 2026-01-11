document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

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
        const li = document.createElement("li");
        li.textContent = p;
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
          const li = document.createElement("li");
          li.textContent = email;
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
