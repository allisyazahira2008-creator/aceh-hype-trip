import { SEED_DEMO_USERS, persistKey, setCurrentUser, state } from '../state/store.js';
import { escapeHtml } from '../utils/escapeHtml.js';
import { STORAGE_KEYS } from '../utils/storage.js';
import { closeModal, openModal } from './modal.js';
import { showToast } from './toast.js';

let authChangeCallback = null;

function formatRoleLabel(role, lang) {
  if (role === 'admin') {
    return lang === 'en' ? 'Manager (Demo)' : 'Pengelola (Demo)';
  }
  return lang === 'en' ? 'Traveler (Demo)' : 'Wisatawan (Demo)';
}

export function updateAuthUI() {
  const authBtn = document.getElementById('authHeaderBtn');
  const mobileAuthBtn = document.getElementById('mobileAuthBtn');
  const isEn = state.language === 'en';
  const user = state.currentUser;

  const label = user
    ? user.name.split(' ')[0]
    : isEn
    ? 'Sign In'
    : 'Masuk';

  if (authBtn) {
    authBtn.textContent = label;
    authBtn.setAttribute(
      'aria-label',
      user
        ? isEn
          ? `Signed in as ${user.name}`
          : `Masuk sebagai ${user.name}`
        : isEn
        ? 'Sign in with demo account'
        : 'Masuk dengan akun demo'
    );
  }

  if (mobileAuthBtn) {
    mobileAuthBtn.textContent = user
      ? `${user.name} (${formatRoleLabel(user.role, state.language)})`
      : isEn
      ? 'Sign In (Demo)'
      : 'Masuk Akun Demo';
  }
}

function handleLoginSuccess(user) {
  setCurrentUser(user);
  updateAuthUI();
  closeModal();
  authChangeCallback?.();
  showToast(
    state.language === 'en'
      ? `Signed in as ${user.name}`
      : `Berhasil masuk sebagai ${user.name}`
  );
}

export function openAccountModal() {
  const user = state.currentUser;
  if (!user) {
    openAuthModal('login');
    return;
  }

  const isEn = state.language === 'en';
  openModal({
    title: isEn ? 'Demo Account Profile' : 'Profil Akun Demo',
    bodyHtml: `
      <div class="modal-meta-box">
        <div><strong>${isEn ? 'Name' : 'Nama'}:</strong> ${escapeHtml(user.name)}</div>
        <div><strong>Email:</strong> ${escapeHtml(user.email)}</div>
        <div><strong>${isEn ? 'Role' : 'Peran'}:</strong> ${escapeHtml(formatRoleLabel(user.role, state.language))}</div>
        <div><strong>${isEn ? 'Saved Favorites' : 'Destinasi Favorit'}:</strong> <span class="tabular-nums">${state.favorites.length}</span></div>
      </div>
      <p class="helper-text" style="margin:0">
        ${
          user.role === 'admin'
            ? isEn
              ? 'Manager access is active. You can add, edit, and delete catalog entries in the Management Dashboard.'
              : 'Akses Pengelola aktif. Anda dapat menambah, mengubah, dan menghapus data di Dashboard Pengelola.'
            : isEn
            ? 'Traveler access is active. Switch to the Manager demo account to edit catalog entries.'
            : 'Akses Wisatawan aktif. Masuk dengan akun Pengelola Demo untuk mengedit data katalog.'
        }
      </p>
    `,
    actions: [
      {
        label: isEn ? 'Switch Account' : 'Ganti Akun',
        variant: 'btn-secondary',
        closeOnClick: false,
        onClick: () => openAuthModal('login'),
      },
      {
        label: isEn ? 'Sign Out' : 'Keluar',
        variant: 'btn-danger',
        onClick: () => {
          setCurrentUser(null);
          updateAuthUI();
          authChangeCallback?.();
          showToast(isEn ? 'Signed out' : 'Anda telah keluar');
        },
      },
    ],
  });
}

export function openAuthModal(initialTab = 'login') {
  const isEn = state.language === 'en';
  let activeTab = initialTab;

  const renderModalContent = () => {
    const demoRowsHtml = SEED_DEMO_USERS.map(
      (u) => `
        <div class="demo-account-row">
          <div>
            <div class="demo-account-title">${escapeHtml(u.name)} · ${escapeHtml(formatRoleLabel(u.role, state.language))}</div>
            <div class="demo-account-creds tabular-nums">
              ${escapeHtml(u.email)} / ${escapeHtml(u.password)}
            </div>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-inline"
            data-action="use-demo"
            data-email="${escapeHtml(u.email)}"
          >
            ${isEn ? 'Use Account' : 'Pakai Akun'}
          </button>
        </div>
      `
    ).join('');

    openModal({
      title: isEn ? 'Demo Account Sign In' : 'Masuk Akun Demo',
      bodyHtml: `
        <div class="segmented-tabs" role="tablist" aria-label="${isEn ? 'Authentication mode' : 'Mode autentikasi'}" style="margin-bottom:4px">
          <button
            type="button"
            role="tab"
            aria-selected="${activeTab === 'login'}"
            class="tab-btn${activeTab === 'login' ? ' is-active' : ''}"
            data-auth-tab="login"
          >
            ${isEn ? 'Sign In' : 'Masuk'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="${activeTab === 'register'}"
            class="tab-btn${activeTab === 'register' ? ' is-active' : ''}"
            data-auth-tab="register"
          >
            ${isEn ? 'Create Demo Account' : 'Buat Akun Demo'}
          </button>
        </div>

        ${
          activeTab === 'login'
            ? `
          <form id="demoLoginForm" class="auth-form" novalidate>
            <label>
              <span>Email</span>
              <input id="loginEmail" type="text" autocomplete="username" required placeholder="wisatawan@acehhypetrip.demo" />
            </label>
            <label>
              <span>${isEn ? 'Password' : 'Kata Sandi'}</span>
              <div class="password-field">
                <input id="loginPassword" type="password" autocomplete="current-password" required placeholder="••••••••" />
                <button type="button" class="btn btn-sm btn-secondary" data-action="toggle-pw" data-target="loginPassword">
                  ${isEn ? 'Show' : 'Lihat'}
                </button>
              </div>
            </label>
            <p class="helper-text is-error" id="authError" role="alert" hidden></p>
            <button type="submit" class="btn btn-primary" style="width:100%">
              ${isEn ? 'Sign In' : 'Masuk Sekarang'}
            </button>
          </form>

          <div class="demo-accounts-box">
            <div class="demo-accounts-heading">${
              isEn ? 'Ready-to-Use Dummy Accounts' : 'Akun Dummy Siap Pakai'
            }</div>
            ${demoRowsHtml}
          </div>
        `
            : `
          <form id="demoRegisterForm" class="auth-form" novalidate>
            <label>
              <span>${isEn ? 'Full Name' : 'Nama Lengkap'}</span>
              <input id="regName" type="text" required placeholder="${isEn ? 'Example: Cut Meutia' : 'Contoh: Cut Meutia'}" />
            </label>
            <label>
              <span>Email</span>
              <input id="regEmail" type="text" required placeholder="nama@aceh.demo" />
            </label>
            <label>
              <span>${isEn ? 'Password (min. 4 chars)' : 'Kata Sandi (min. 4 karakter)'}</span>
              <div class="password-field">
                <input id="regPassword" type="password" required placeholder="••••" />
                <button type="button" class="btn btn-sm btn-secondary" data-action="toggle-pw" data-target="regPassword">
                  ${isEn ? 'Show' : 'Lihat'}
                </button>
              </div>
            </label>
            <label>
              <span>${isEn ? 'Demo Role' : 'Peran Akun Demo'}</span>
              <select id="regRole">
                <option value="traveler">${isEn ? 'Traveler' : 'Wisatawan'}</option>
                <option value="admin">${isEn ? 'Manager (CRUD Access)' : 'Pengelola (Akses CRUD)'}</option>
              </select>
            </label>
            <p class="helper-text is-error" id="authError" role="alert" hidden></p>
            <button type="submit" class="btn btn-primary" style="width:100%">
              ${isEn ? 'Create & Sign In' : 'Buat Akun & Masuk'}
            </button>
          </form>
        `
        }
        <p class="helper-text" style="margin:0">
          ${
            isEn
              ? 'Simulated local authentication stored in browser storage for demonstration.'
              : 'Autentikasi simulasi lokal yang disimpan di browser untuk keperluan demonstrasi.'
          }
        </p>
      `,
      actions: [
        {
          label: isEn ? 'Close' : 'Tutup',
          variant: 'btn-secondary',
        },
      ],
    });

    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;

    modalBody.querySelectorAll('button[data-auth-tab]').forEach((tabBtn) => {
      tabBtn.addEventListener('click', () => {
        activeTab = tabBtn.dataset.authTab;
        renderModalContent();
      });
    });

    modalBody.querySelectorAll('button[data-action="toggle-pw"]').forEach((toggleBtn) => {
      toggleBtn.addEventListener('click', () => {
        const input = document.getElementById(toggleBtn.dataset.target);
        if (!input) return;
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        toggleBtn.textContent = showing
          ? isEn
            ? 'Show'
            : 'Lihat'
          : isEn
          ? 'Hide'
          : 'Tutup';
      });
    });

    modalBody.querySelectorAll('button[data-action="use-demo"]').forEach((useBtn) => {
      useBtn.addEventListener('click', () => {
        const demoUser = state.users.find((u) => u.email === useBtn.dataset.email);
        if (demoUser) {
          handleLoginSuccess(demoUser);
        }
      });
    });

    const loginForm = document.getElementById('demoLoginForm');
    loginForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const email = document.getElementById('loginEmail')?.value.trim().toLowerCase();
      const password = document.getElementById('loginPassword')?.value || '';
      const errorEl = document.getElementById('authError');

      const matched = state.users.find(
        (u) => u.email.toLowerCase() === email && u.password === password
      );

      if (!matched) {
        if (errorEl) {
          errorEl.textContent = isEn
            ? 'Invalid email or password. Try one of the dummy accounts below.'
            : 'Email atau kata sandi tidak cocok. Gunakan salah satu akun dummy di bawah.';
          errorEl.hidden = false;
        }
        return;
      }

      handleLoginSuccess(matched);
    });

    const registerForm = document.getElementById('demoRegisterForm');
    registerForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = document.getElementById('regName')?.value.trim();
      const email = document.getElementById('regEmail')?.value.trim().toLowerCase();
      const password = document.getElementById('regPassword')?.value || '';
      const role = document.getElementById('regRole')?.value === 'admin' ? 'admin' : 'traveler';
      const errorEl = document.getElementById('authError');

      if (!name || !email.includes('@') || password.length < 4) {
        if (errorEl) {
          errorEl.textContent = isEn
            ? 'Enter a valid name, email address, and password (at least 4 characters).'
            : 'Isi nama, format email yang valid, dan kata sandi minimal 4 karakter.';
          errorEl.hidden = false;
        }
        return;
      }

      if (state.users.some((u) => u.email.toLowerCase() === email)) {
        if (errorEl) {
          errorEl.textContent = isEn
            ? 'An account with this email already exists.'
            : 'Email tersebut sudah terdaftar pada daftar akun demo.';
          errorEl.hidden = false;
        }
        return;
      }

      const newUser = {
        id: `u_${Date.now()}`,
        name,
        email,
        password,
        role,
      };
      state.users = [...state.users, newUser];
      persistKey(STORAGE_KEYS.users, state.users);
      handleLoginSuccess(newUser);
    });
  };

  renderModalContent();
}

export function initAuthModule({ onAuthChanged }) {
  authChangeCallback = onAuthChanged;

  document.getElementById('authHeaderBtn')?.addEventListener('click', openAccountModal);
  document.getElementById('mobileAuthBtn')?.addEventListener('click', () => {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const drawer = document.getElementById('mobileDrawer');
    if (menuBtn && drawer) {
      menuBtn.setAttribute('aria-expanded', 'false');
      drawer.hidden = true;
    }
    openAccountModal();
  });

  updateAuthUI();
}
