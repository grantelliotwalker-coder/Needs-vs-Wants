// modal-info.js
function injectInfoModal() {
  if (document.getElementById("commonInfoModal")) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="modal-backdrop" id="commonInfoModal">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">About these tools</div>
          <button id="commonInfoClose">×</button>
        </div>
        <div class="modal-body">
          <p>Global disclaimer / info shared across all pages.</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);

  const closeBtn = document.getElementById("commonInfoClose");
  const backdrop = document.getElementById("commonInfoModal");
  closeBtn.addEventListener("click", () => (backdrop.style.display = "none"));
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.style.display = "none";
  });
}

function openInfoModal() {
  const el = document.getElementById("commonInfoModal");
  if (el) el.style.display = "flex";
}
