// ---------------------- Helpers ----------------------
function qs(sel){ return document.querySelector(sel); }
function show(id){ qs(id).classList.remove('hidden'); }
function hide(id){ qs(id).classList.add('hidden'); }

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
      try{
        await firebase.auth().signInWithEmailAndPassword(email, pass);
        localStorage.removeItem('pc_guest');
        location.href = 'dashboard.html';
      }catch(e){
        if(e.code === "auth/user-not-found"){
          alert("No account found. Please register.");
        } else if(e.code === "auth/wrong-password"){
          alert("Incorrect password.");
        } else {
          alert(e.message);
        }
      }
    });
  }

  // Register
  const registerBtn = qs('#registerBtn');
  if(registerBtn){
    registerBtn.addEventListener('click', async () => {
      const email = qs('#registerEmail').value.trim();
      const pass  = qs('#registerPassword').value;
      try{
        await firebase.auth().createUserWithEmailAndPassword(email, pass);
        localStorage.removeItem('pc_guest');
        location.href = 'dashboard.html';
      }catch(e){
        if(e.code === "auth/email-already-in-use"){
          if(confirm("Email already registered. Do you want to login instead?")){
            hide('#registerPanel'); show('#loginPanel');
            qs('#loginEmail').value = email;
          }
        } else {
          alert(e.message);
        }
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
async function requireAuthOrGuest(){
  return new Promise(resolve => {
    const isGuest = localStorage.getItem('pc_guest') === '1';
    FB.auth.onAuthStateChanged(user => {
      if(user || isGuest){
        resolve(true); // allow page
      } else {
        location.href = 'index.html';
      }
    });
  });
}
window.requireAuthOrGuest = requireAuthOrGuest;


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

function addVaccine(){
  const name = qs("#vacName").value;
  const given = qs("#vacGiven").value;
  const next = qs("#vacNext").value;
  const notes = qs("#vacNotes").value;
  const user = firebase.auth().currentUser;
  if(!user){ alert("Login first!"); return; }
  if(!name || !given){ alert("Enter vaccine and date"); return; }

  firebase.firestore().collection("vaccines").add({
    uid: user.uid,
    name, given, next, notes,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(()=> { qs("#vacForm").reset(); loadVaccines(); })
    .catch(err=> console.error(err));
}

function loadVaccines(){
  const vacBody = qs("#vacBody");
  if(!vacBody) return;
  vacBody.innerHTML = "";
  const user = firebase.auth().currentUser;
  if(!user) return;

  firebase.firestore().collection("vaccines")
    .where("uid","==",user.uid)
    .orderBy("timestamp","desc")
    .get().then(snapshot=>{
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
    });
}

function deleteVaccine(id){
  if(!confirm("Delete this vaccine?")) return;
  firebase.firestore().collection("vaccines").doc(id).delete().then(loadVaccines);
}



// ---------------------- EXPENSES ----------------------
function addExpense(){
  const title = qs("#exTitle").value;
  const category = qs("#exCategory").value;
  const amount = parseFloat(qs("#exAmount").value);
  const date = qs("#exDate").value;
  const user = firebase.auth().currentUser;
  if(!user){ alert("Login first!"); return; }
  if(!title || !category || !amount || !date){ alert("Complete all fields"); return; }

  firebase.firestore().collection("expenses").add({
    uid:user.uid,
    title, category, amount, date,
    timestamp:firebase.firestore.FieldValue.serverTimestamp()
  }).then(()=>{ qs("#exForm").reset(); loadExpenses(); });
}

function loadExpenses(){
  const exTBody = qs("#exTBody");
  const exTotal = qs("#exTotal");
  if(!exTBody) return;
  exTBody.innerHTML="";
  let total=0;

  const user = firebase.auth().currentUser;
  if(!user) return;

  firebase.firestore().collection("expenses")
    .where("uid","==",user.uid)
    .orderBy("timestamp","desc")
    .get().then(snapshot=>{
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
    });
}

function deleteExpense(id){
  if(!confirm("Delete this expense?")) return;
  firebase.firestore().collection("expenses").doc(id).delete().then(loadExpenses);
}

// ---------------------- PHOTOS ----------------------
function uploadPhoto(){
  const file = qs("#photoFile").files[0];
  const month = qs("#photoMonth").value;
  const caption = qs("#photoCaption").value;
  const user = firebase.auth().currentUser;
  if(!user){ alert("Login first!"); return; }
  if(!file){ alert("Select a file"); return; }

  const storageRef = firebase.storage().ref(`photos/${user.uid}/${Date.now()}_${file.name}`);
  storageRef.put(file).then(snapshot=>{
    snapshot.ref.getDownloadURL().then(url=>{
      firebase.firestore().collection("photos").add({
        uid:user.uid,
        url,
        month,
        caption,
        timestamp:firebase.firestore.FieldValue.serverTimestamp()
      }).then(()=>{
        qs("#photoFile").value="";
        qs("#photoCaption").value="";
        qs("#photoMonth").value="";
        loadPhotos();
      });
    });
  });
}

function loadPhotos(){
  const grid = qs("#photoGrid");
  if(!grid) return;
  grid.innerHTML="";
  const user = firebase.auth().currentUser;
  if(!user) return;

  firebase.firestore().collection("photos")
    .where("uid","==",user.uid)
    .orderBy("timestamp","desc")
    .get().then(snapshot=>{
      snapshot.forEach(doc=>{
        const data = doc.data();
        const div = document.createElement("div");
        div.innerHTML = `<img src="${data.url}" class="w-full rounded shadow"><p class="text-sm">${data.caption||"-"}</p>`;
        grid.appendChild(div);
      });
       });
}

// Save vet info
async function saveVet() {
  const name = document.getElementById('vetName').value.trim();
  const phone = document.getElementById('vetPhone').value.trim();
  if (!name || !phone) return alert('Please fill both fields');

  const userId = FB.auth.currentUser?.uid || 'guest';
  await FB.db.collection('vets').add({
    userId,
    name,
    phone,
    timestamp: Date.now()
  });

  document.getElementById('vetName').value = '';
  document.getElementById('vetPhone').value = '';
  loadVets();
}

// Load and display saved vets
async function loadVets() {
  const vetList = document.getElementById('vetList');
  if (!vetList) return; // exit if element not present
  const userId = FB.auth.currentUser?.uid || 'guest';
  const list = document.getElementById('vetList');
  list.innerHTML = '';
  const snapshot = await FB.db.collection('vets')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement('li');
    li.textContent = `${data.name} — ${data.phone}`;
    list.appendChild(li);
  });
}

// Call on page load
window.addEventListener('DOMContentLoaded', () => {
  requireAuthOrGuest();
  loadVets();
});
// Save diet note
async function saveDietNote() {
  const note = document.getElementById('dietNote').value.trim();
  if (!note) return alert('Enter a note');

  const userId = FB.auth.currentUser?.uid || 'guest';
  await FB.db.collection('dietNotes').add({
    userId,
    note,
    timestamp: Date.now()
  });

  document.getElementById('dietNote').value = '';
  loadDietNotes();
}

// Load and display diet notes
async function loadDietNotes() {
  const dietList = document.getElementById('dietList');
  if (!dietList) return; // exit if element not present
  const userId = FB.auth.currentUser?.uid || 'guest';
  const list = document.getElementById('dietList');
  list.innerHTML = '';
  const snapshot = await FB.db.collection('dietNotes')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .get();
  snapshot.forEach(doc => {
    const data = doc.data();
    const li = document.createElement('li');
    li.textContent = data.note;
    list.appendChild(li);
  });
}

// Call on page load
window.addEventListener('DOMContentLoaded', () => {
  requireAuthOrGuest();
  loadDietNotes();
});


