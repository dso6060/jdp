document.addEventListener("DOMContentLoaded", async () => {
  const webhookInput = document.getElementById("webhook");
  const statusEl = document.getElementById("status");

  // Load saved values
  chrome.storage.sync.get(["APPS_SCRIPT_WEBHOOK"], (data) => {
    webhookInput.value = data.APPS_SCRIPT_WEBHOOK || "";
  });

  document.getElementById("save").addEventListener("click", () => {
    const webhook = webhookInput.value.trim();
    chrome.storage.sync.set(
      { APPS_SCRIPT_WEBHOOK: webhook },
      () => {
        statusEl.textContent = webhook ? "Webhook saved." : "Webhook cleared.";
        setTimeout(() => (statusEl.textContent = ""), 1500);
      }
    );
  });

  document.getElementById("clear").addEventListener("click", () => {
    webhookInput.value = "";
    chrome.storage.sync.set(
      { APPS_SCRIPT_WEBHOOK: "" },
      () => {
        statusEl.textContent = "Webhook cleared.";
        setTimeout(() => (statusEl.textContent = ""), 1500);
      }
    );
  });
});


