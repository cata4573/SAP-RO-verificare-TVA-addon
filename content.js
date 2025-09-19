window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data.type === "ANAF_INVOICE_VERIFY") {
        chrome.runtime.sendMessage(
            { action: "ANAF_checkTVA", cui: event.data.cui, data: event.data.date },
            (response) => {
                // Trimitem răspunsul înapoi la pagina SAP
                window.postMessage({
                    type: "ANAF_INVOICE_VERIFY_RESULT",
                    result: response
                }, "*");
            }
        );
    }
    if (event.data.type === "VIES_INVOICE_VERIFY") {
        chrome.runtime.sendMessage(
            { action: "VIES_checkTVA", cui: event.data.cui, cntry: event.data.cntry },
            (response) => {
                // Trimitem răspunsul înapoi la pagina SAP
                window.postMessage({
                    type: "VIES_INVOICE_VERIFY_RESULT",
                    result: response
                }, "*");
            }
        );
    }
});
