// modal-info.js
function injectInfoModal() {
  if (document.getElementById("commonInfoModal")) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="modal-backdrop" id="commonInfoModal">
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="commonInfoTitle">
        <div class="modal-header">
          <div class="modal-title" id="commonInfoTitle">About these tools</div>
          <button class="modal-close" id="commonInfoClose" aria-label="Close">×</button>
        </div>

        <div class="modal-body">
          <div>
            <div class="field-label">What this is</div>
            <p style="font-size:12px; color:var(--muted);">
              This is a free, client-side budgeting and planning toolkit designed to give you
              a clear, fast view of your money without needing an account or login.
            </p>
          </div>

          <div>
            <div class="field-label">Where your data lives</div>
            <ul style="padding-left:18px; margin-top:4px; font-size:12px; color:var(--muted);">
              <li>All entries you add are saved only in your browser’s local storage.</li>
              <li>No data is sent to a server or synced to an account from these tools.</li>
              <li>If you clear your browser data, you will also clear anything you have saved here.</li>
            </ul>
          </div>

          <div>
            <div class="field-label">How to think about the numbers</div>
            <ul style="padding-left:18px; margin-top:4px; font-size:12px; color:var(--muted);">
              <li>The tools do straightforward maths based on what you enter.</li>
              <li>They do not know your personal situation, bank products, or local tax and lending rules.</li>
              <li>Treat results as a guide only and cross-check before making big decisions.</li>
            </ul>
          </div>

          <div>
            <div class="field-label">Privacy & confidence</div>
            <p style="font-size:12px; color:var(--muted);">
              Because everything runs in your browser, you can experiment freely: adjust amounts,
              add and remove items, and explore scenarios knowing the data stays on your device.
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrapper.firstElementChild);

  const backdrop = document.getElementById("commonInfoModal");
  const closeBtn = document.getElementById("commonInfoClose");

  closeBtn.addEventListener("click", () => {
    backdrop.classList.remove("open");
  });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      backdrop.classList.remove("open");
    }
  });
}

function openInfoModal() {
  const el = document.getElementById("commonInfoModal");
  if (el) {
    el.classList.add("open");
  }
}
