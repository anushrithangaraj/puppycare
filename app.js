// Simple helpers
function qs(sel){ return document.querySelector(sel); }
function show(id){ qs(id).classList.remove('hidden'); }
function hide(id){ qs(id).classList.add('hidden'); }

// Handle auth UI on index
window.addEventListener('DOMContentLoaded', () => {
  // Toggle between login/register views
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
        await FB.auth.signInWithEmailAndPassword(email, pass);
        localStorage.removeItem('pc_guest');
        location.href = 'dashboard.html';
      }catch(e){
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
      try{
        await FB.auth.createUserWithEmailAndPassword(email, pass);
        localStorage.removeItem('pc_guest');
        location.href = 'dashboard.html';
      }catch(e){
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

// Gate dashboard and other pages
function requireAuthOrGuest(){
  const isGuest = localStorage.getItem('pc_guest') === '1';
  FB.auth.onAuthStateChanged(user => {
    if(user || isGuest){
      // ok
    }else{
      location.href = 'index.html';
    }
  });
}

// Expose for pages to call
window.requireAuthOrGuest = requireAuthOrGuest;

// Logout (on dashboard)
window.doLogout = async function(){
  localStorage.removeItem('pc_guest');
  await FB.auth.signOut();
  location.href = 'index.html';
};