// skin-modal.js
(function () {
  const STORAGE_KEY = 'budgetSkin';

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

  function createSkinModal() {
    const backdrop = document.createElement('div');
    backdrop.id = 'skinModalBackdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="skinModalTitle">
        <div class="modal-header">
          <div class="modal-title" id="skinModalTitle">Choose a skin</div>
          <button class="modal-close" id="skinModalClose" aria-label="Close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="color-row" id="skinOptions">
            <button class="color-dot" data-skin="blue"   title="Blue"></button>
            <button class="color-dot" data-skin="purple" title="Purple"></button>
            <button class="color-dot" data-skin="pink"   title="Pink"></button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function init() {
    const openBtn = document.getElementById('skinToggleBtn');
    if (!openBtn) return;

    const backdrop = createSkinModal();
    const closeBtn = backdrop.querySelector('#skinModalClose');
    const options  = backdrop.querySelector('#skinOptions');

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

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    restoreSkin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
