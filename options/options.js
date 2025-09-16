document.addEventListener("DOMContentLoaded", async () => {
  const webhookInput = document.getElementById("webhook");
  const statusEl = document.getElementById("status");

  // Load saved values
  chrome.storage.sync.get(["webhookUrl"], (data) => {
    webhookInput.value = data.webhookUrl || "";
  });

  document.getElementById("save").addEventListener("click", () => {
    const webhook = webhookInput.value.trim();
    chrome.storage.sync.set(
      { webhookUrl: webhook },
      () => {
        statusEl.textContent = webhook ? "Webhook saved." : "Webhook cleared.";
        setTimeout(() => (statusEl.textContent = ""), 1500);
      }
    );
  });

  document.getElementById("clear").addEventListener("click", () => {
    webhookInput.value = "";
    chrome.storage.sync.set(
      { webhookUrl: "" },
      () => {
        statusEl.textContent = "Webhook cleared.";
        setTimeout(() => (statusEl.textContent = ""), 1500);
      }
    );
  });
});


