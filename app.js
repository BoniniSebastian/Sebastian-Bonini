import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// USER
function getUserId() {
  let id = localStorage.getItem("userId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("userId", id);
  }
  return id;
}

// POPUP
window.openPopup = (type) => {
  document.getElementById(type + "-popup").classList.remove("hidden");
};

window.closePopup = () => {
  document.querySelectorAll(".popup").forEach(p => p.classList.add("hidden"));
};

// BLUEWALL
window.addPost = async () => {
  const input = document.getElementById("postInput");
  if (!input.value) return;

  await addDoc(collection(db, "posts"), {
    text: input.value,
    createdAt: Date.now()
  });

  input.value = "";
};

// RULLANDE TEXT
let posts = [];
let index = 0;

onSnapshot(
  query(collection(db, "posts"), orderBy("createdAt", "desc")),
  (snap) => {
    posts = [];
    snap.forEach(doc => posts.push(doc.data().text));
  }
);

setInterval(() => {
  if (posts.length === 0) return;
  document.getElementById("bluewallPreview").innerText = posts[index];
  index = (index + 1) % posts.length;
}, 3000);

// MATCH TOGGLE
window.toggleAttend = async (matchId, btn) => {
  const userId = getUserId();
  const ref = doc(db, "matches", matchId, "attendees", userId);

  window.myStatus = window.myStatus || {};

  if (window.myStatus[matchId]) {
    await deleteDoc(ref);
    window.myStatus[matchId] = false;
    btn.style.opacity = 0.5;
  } else {
    await setDoc(ref, { going: true });
    window.myStatus[matchId] = true;
    btn.style.opacity = 1;
  }
};

// DAG
function formatDay(day) {
  return day.toUpperCase();
}

// AUTO IMPORT MATCHER (körs bara om tomt)
async function seedMatchesIfEmpty() {
  const snap = await getDocs(collection(db, "matches"));
  if (!snap.empty) return;

  const matches = [
    { team:"Värmdö IF", opponent:"Vaksala SK", time:"17:00", location:"Plan 2", day:"fredag" },
    { team:"Värmdö IF", opponent:"IBK Köping", time:"18:30", location:"Emausskolan", day:"fredag" },

    { team:"Värmdö IF", opponent:"Falun", time:"09:45", location:"Cernohallen", day:"lördag" },
    { team:"Värmdö IF", opponent:"Runsten", time:"14:45", location:"Cernohallen", day:"lördag" },

    { team:"Värmdö IF", opponent:"Rönnby", time:"09:15", location:"Cernohallen", day:"söndag" },
    { team:"Värmdö IF", opponent:"Järfälla", time:"15:15", location:"Cernohallen", day:"söndag" }
  ];

  for (let m of matches) {
    await addDoc(collection(db, "matches"), m);
  }
}

// HÄMTA MATCHER
onSnapshot(collection(db, "matches"), (snap) => {
  const container = document.getElementById("timeline");
  container.innerHTML = "";

  let matches = [];

  snap.forEach(docSnap => {
    matches.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  const grouped = {};

  matches.forEach(m => {
    if (!grouped[m.day]) grouped[m.day] = [];
    grouped[m.day].push(m);
  });

  Object.keys(grouped).forEach(day => {

    const dayEl = document.createElement("div");
    dayEl.innerHTML = `<div class="day">${formatDay(day)}</div>`;
    container.appendChild(dayEl);

    grouped[day].forEach(m => {

      const el = document.createElement("div");
      el.className = "match-card";

      el.innerHTML = `
        <div>
          <div class="time">${m.time}</div>
          <div>${m.team}</div>
          <div>vs ${m.opponent}</div>
          <div class="location">${m.location}</div>
        </div>

        <div class="attend-box">
          <button class="attend-btn" onclick="toggleAttend('${m.id}', this)">✔</button>
          <div class="attend-count">
            <span id="count-${m.id}">0</span>
            <div class="attend-label">Ska se matchen live</div>
          </div>
        </div>
      `;

      container.appendChild(el);

      onSnapshot(
        collection(db, "matches", m.id, "attendees"),
        (s) => {
          document.getElementById("count-" + m.id).innerText = s.size;
        }
      );
    });
  });
});

// kör auto-import
seedMatchesIfEmpty();