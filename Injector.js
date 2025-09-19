(() => {
  try {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("page.js"); // page.js trebuie să fie în același folder
    script.onload = () => {
      console.log("[InvoiceVerify] page.js loaded in MAIN world");
      script.remove();
    };
    document.documentElement.appendChild(script);
  } catch (err) {
    console.error("[InvoiceVerify] Failed to inject page.js:", err);
  }
})();
