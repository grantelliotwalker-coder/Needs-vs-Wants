
// skin-modal.js
(function () {
  const STORAGE_KEY = 'budgetSkin';

  const backdrop = document.getElementById('skinModalBackdrop');
  const openBtn  = document.getElementById('skinToggleBtn');
  const closeBtn = document.getElementById('skinModalClose');
  const options  = document.getElementById('skinOptions');

  if (!backdrop || !openBtn || !closeBtn || !options) return;

  function applySkin(skin) {
    if (!skin) return;
    document.documentElement.setAttribute('data-skin', skin);
  }

  function persistSkin(skin) {
    try {
      localStorage.setItem(STORAGE_KEY, skin);
    } catch (e) {}
  }

  function restoreSkin() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) applySkin(saved);
    } catch (e) {}
  }

  function openModal() {
    backdrop.classList.add('open');
  }

  function closeModal() {
    backdrop.classList.remove('open');
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  options.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-skin]');
    if (!btn) return;
    const skin = btn.dataset.skin;
    applySkin(skin);
    persistSkin(skin);
    closeModal();
  });

  restoreSkin();
})();
