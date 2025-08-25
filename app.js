// ---------------------- Helpers ----------------------
const qs = sel => document.querySelector(sel);
const show = id => qs(id).classList.remove('hidden');
const hide = id => qs(id).classList.add('hidden');

// ---------------------- AUTH UI ----------------------
window.addEventListener('DOMContentLoaded', () => {
  const toLogin = qs('#toLogin');
  const toRegister = qs('#toRegister');
  const loginPanel = qs('#loginPanel');
  const registerPanel = qs('#registerPanel');

  if(toLogin && toRegister && loginPanel && registerPanel){
    toRegister.addEventListener('click', () => { hide('#loginPanel'); show('#registerPanel'); });
    toLogin.addEventListener('click', () => { hide('#registerPanel'); show('#loginPanel'); });
  }

  // Login
  const loginBtn = qs('#loginBtn');
  if(loginBtn){
    loginBtn.addEventListener('click', async () => {
      const email = qs('#loginEmail').value.trim();
      const pass  = qs('#loginPassword').value;
      try {
        await firebase.auth().signInWithEmailAndPassword(email, pass);
        localStorage.removeItem('pc_guest');
        location.href = 'dashboard.html';
      } catch(e){
        alert(e.message);
      }
    });
  }

  // Register
  const registerBtn = qs('#registerBtn');
  if(registerBtn){
    registerBtn.addEventListener('click', async () => {
      const email = qs('#registerEmail').value.trim();
      const pass  = qs('#registerPassword').value;
      try {
        await firebase.auth().createUserWithEmailAndPassword(email, pass);
        localStorage.removeItem('pc_guest');
        location.href = 'dashboard.html';
      } catch(e){
        alert(e.message);
      }
    });
  }

  // Continue as Guest
  const guestBtn = qs('#guestBtn');
  if(guestBtn){
    guestBtn.addEventListener('click', () => {
      localStorage.setItem('pc_guest','1');
      location.href = 'dashboard.html';
    });
  }
});

// ---------------------- Gate Pages ----------------------
async function requireAuthOrGuest() {
  return new Promise(resolve => {
    const isGuest = localStorage.getItem('pc_guest') === '1';
    firebase.auth().onAuthStateChanged(user => {
      const onDashboard = window.location.pathname.endsWith('dashboard.html');
      if(user || isGuest){
        resolve(true); // allowed
      } else if (onDashboard){
        // redirect only from protected page
        location.href = 'index.html';
        resolve(false);
      } else {
        resolve(false); // do not redirect from public pages
      }
    });
  });
}


// ---------------------- Logout ----------------------
window.doLogout = async function(){
  localStorage.removeItem('pc_guest');
  await firebase.auth().signOut();
  location.href = 'index.html';
};

// ---------------------- Page Init ----------------------
function initPage(){
  const page = document.body.dataset.page;
  if(page === "vaccine") { initVaccine(); loadVaccines(); }
  if(page === "care") { loadVets(); }
  if(page === "diet") { loadDietNotes(); }
  if(page === "expenses") { loadExpenses(); }
  if(page === "photos") { loadPhotos(); }
}

// ---------------------- VACCINES ----------------------
function initVaccine(){
  const vacForm = qs("#vacForm");
  if(!vacForm) return;
  vacForm.addEventListener('submit', event=>{
    event.preventDefault();
    addVaccine();
  });
}

async function addVaccine(){
  const name = qs("#vacName").value;
  const given = qs("#vacGiven").value;
  const next = qs("#vacNext").value;
  const notes = qs("#vacNotes").value;
  const user = firebase.auth().currentUser;

  if(!user){ alert("Login first!"); return; }
  if(!name || !given){ alert("Enter vaccine and date"); return; }

  try{
    await firebase.firestore().collection("vaccines").add({
      uid: user.uid,
      name, given, next, notes,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    qs("#vacForm").reset();
    loadVaccines();
  } catch(err){
    console.error(err);
    alert("Error adding vaccine. Check permissions.");
  }
}

async function loadVaccines(){
  const vacBody = qs("#vacBody");
  if(!vacBody) return;
  vacBody.innerHTML = "";
  const user = firebase.auth().currentUser;
  if(!user) return;

  try{
    const snapshot = await firebase.firestore().collection("vaccines")
      .where("uid","==",user.uid)
      .orderBy("timestamp","desc")
      .get();
    snapshot.forEach(doc=>{
      const data = doc.data();
      let nextClass = "";
      if(data.next){
        const today = new Date(), due = new Date(data.next);
        if(due <= today) nextClass = "text-red-600 font-bold";
      }
      vacBody.innerHTML += `
        <tr>
          <td class="p-2">${data.name}</td>
          <td class="p-2">${data.given}</td>
          <td class="p-2 ${nextClass}">${data.next||"-"}</td>
          <td class="p-2">${data.notes||"-"}</td>
          <td class="p-2 text-right"><button onclick="deleteVaccine('${doc.id}')" class="text-red-500">Delete</button></td>
        </tr>
      `;
    });
  } catch(err){
    console.error(err);
    alert("Error loading vaccines.");
  }
}

async function deleteVaccine(id){
  if(!confirm("Delete this vaccine?")) return;
  try{
    await firebase.firestore().collection("vaccines").doc(id).delete();
    loadVaccines();
  } catch(err){
    console.error(err);
    alert("Error deleting vaccine.");
  }
}

// ---------------------- EXPENSES ----------------------
async function addExpense(){
  const title = qs("#exTitle").value;
  const category = qs("#exCategory").value;
  const amount = parseFloat(qs("#exAmount").value);
  const date = qs("#exDate").value;
  const user = firebase.auth().currentUser;
  if(!user){ alert("Login first!"); return; }
  if(!title || !category || !amount || !date){ alert("Complete all fields"); return; }

  try{
    await firebase.firestore().collection("expenses").add({
      uid:user.uid,
      title, category, amount, date,
      timestamp:firebase.firestore.FieldValue.serverTimestamp()
    });
    qs("#exForm").reset();
    loadExpenses();
  } catch(err){
    console.error(err);
    alert("Error adding expense.");
  }
}

async function loadExpenses(){
  const exTBody = qs("#exTBody");
  const exTotal = qs("#exTotal");
  if(!exTBody) return;
  exTBody.innerHTML="";
  let total=0;

  const user = firebase.auth().currentUser;
  if(!user) return;

  try{
    const snapshot = await firebase.firestore().collection("expenses")
      .where("uid","==",user.uid)
      .orderBy("timestamp","desc")
      .get();
    snapshot.forEach(doc=>{
      const data = doc.data();
      total += data.amount;
      exTBody.innerHTML += `<tr>
        <td class="p-2">${data.title}</td>
        <td class="p-2">${data.category}</td>
        <td class="p-2">₹${data.amount.toFixed(2)}</td>
        <td class="p-2">${data.date}</td>
        <td class="p-2 text-right"><button onclick="deleteExpense('${doc.id}')" class="text-red-500">Delete</button></td>
      </tr>`;
    });
    if(exTotal) exTotal.textContent = `₹${total.toFixed(2)}`;
  } catch(err){
    console.error(err);
    alert("Error loading expenses.");
  }
}

async function deleteExpense(id){
  if(!confirm("Delete this expense?")) return;
  try{
    await firebase.firestore().collection("expenses").doc(id).delete();
    loadExpenses();
  } catch(err){
    console.error(err);
    alert("Error deleting expense.");
  }
}

// ---------------------- PHOTOS ----------------------
async function uploadPhoto(){
  const file = qs("#photoFile").files[0];
  const month = qs("#photoMonth").value;
  const caption = qs("#photoCaption").value;
  const user = firebase.auth().currentUser;
  if(!user){ alert("Login first!"); return; }
  if(!file){ alert("Select a file"); return; }

  try{
    const storageRef = firebase.storage().ref(`photos/${user.uid}/${Date.now()}_${file.name}`);
    const snapshot = await storageRef.put(file);
    const url = await snapshot.ref.getDownloadURL();
    await firebase.firestore().collection("photos").add({
      uid:user.uid,
      url,
      month,
      caption,
      timestamp:firebase.firestore.FieldValue.serverTimestamp()
    });
    qs("#photoFile").value="";
    qs("#photoCaption").value="";
    qs("#photoMonth").value="";
    loadPhotos();
  } catch(err){
    console.error(err);
    alert("Error uploading photo. Check CORS and permissions.");
  }
}

async function loadPhotos(){
  const grid = qs("#photoGrid");
  if(!grid) return;
  grid.innerHTML="";
  const user = firebase.auth().currentUser;
  if(!user) return;

  try{
    const snapshot = await firebase.firestore().collection("photos")
      .where("uid","==",user.uid)
      .orderBy("timestamp","desc")
      .get();
    snapshot.forEach(doc=>{
      const data = doc.data();
      const div = document.createElement("div");
      div.innerHTML = `<img src="${data.url}" class="w-full rounded shadow"><p class="text-sm">${data.caption||"-"}</p>`;
      grid.appendChild(div);
    });
  } catch(err){
    console.error(err);
    alert("Error loading photos.");
  }
}

// ---------------------- INIT ----------------------
window.addEventListener('DOMContentLoaded', async () => {
  // Ensure Firebase is initialized
  if(!firebase.apps.length){
    console.error("Firebase not initialized!");
    return;
  }

  // Wait for auth or guest check
  const allowed = await requireAuthOrGuest();
  if(!allowed){
    console.log("User not allowed, redirecting handled in requireAuthOrGuest.");
    return;
  }

  // Only now load page content
  initPage();
});

