document.addEventListener("DOMContentLoaded", async () => {
  const webhookInput = document.getElementById("webhook");
  const tokenInput = document.getElementById("token");
  const statusEl = document.getElementById("status");

  // Load saved values
  chrome.storage.sync.get(["APPS_SCRIPT_WEBHOOK", "APPS_SCRIPT_TOKEN"], (data) => {
    webhookInput.value = data.APPS_SCRIPT_WEBHOOK || "";
    tokenInput.value = data.APPS_SCRIPT_TOKEN || "";
  });

  document.getElementById("save").addEventListener("click", () => {
    const webhook = webhookInput.value.trim();
    const token = tokenInput.value.trim();
    chrome.storage.sync.set(
      { APPS_SCRIPT_WEBHOOK: webhook, APPS_SCRIPT_TOKEN: token },
      () => {
        statusEl.textContent = "Saved.";
        setTimeout(() => (statusEl.textContent = ""), 1500);
      }
    );
  });
});


