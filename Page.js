(async function () {
    var CONTAINER_ID = "application-SupplierInvoice-create-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.ObjectPageLayoutMain-OPHeaderContent";
	var INPUT_BP_ID = "application-SupplierInvoice-create-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.TextInvoicingParty"; 
    var INPUT_DATE_ID = "application-SupplierInvoice-create-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.CEDatePickerDocumentDate-datePicker";

    // --- Helpers -------------------------------------------------------------

    function getControl(id) {
        try { return sap.ui.getCore().byId(id); } catch (e) { return null; }
    }

    function waitForContainer() {
        return new Promise(function (resolve) {
            function check() {
                var c = getControl(CONTAINER_ID);
                if (c) resolve(c); else setTimeout(check, 250);
            }
            check();
        });
    }

    function ensureUi5Ready(cb) {
        if (typeof sap !== "undefined" && sap.ui && sap.ui.getCore && sap.ui.getCore().isInitialized()) {
            cb();
			console.log("[VIES Response]", "Ui5Ready is ready");
        } else {
            var tries = 40;
            (function tick() {
                if (tries-- <= 0) return;
                if (typeof sap !== "undefined" && sap.ui && sap.ui.getCore && sap.ui.getCore().isInitialized()) cb();
                else setTimeout(tick, 250);
            })();
        }
    }

    function formatDateYYYYMMDD(d) {
        if (!(d instanceof Date)) return "";
        var y = d.getFullYear();
        var m = String(d.getMonth() + 1).padStart(2, "0");
        var day = String(d.getDate()).padStart(2, "0");
        return y + "-" + m + "-" + day;
    }

    function firstToken(str) {
        if (!str) return "";
        var m = String(str).trim().match(/^\S+/);
        return m ? m[0] : "";
    }

    // --- UI: create + display -----------------------------------------------

    async function createDisplayControls() {
        var container = await waitForContainer();

        await new Promise(function (resolve) {
            sap.ui.require(['sap/m/Label', 'sap/m/Button', 'sap/m/FlexItemData'], function (Label, Button, FlexItemData) {
                window.sapMLabel = Label;
                window.sapMButton = Button;
                window.sapMFlexItemData = FlexItemData;
                resolve();
            });
        });

        // Label principal
        if (!window._invoiceVerifyResultLabel || container.indexOfContent(window._invoiceVerifyResultLabel) === -1) {
            var resultLabel = new window.sapMLabel({
                text: "Apasă butonul refresh",
                design: "Bold",
                wrapping: true,
                wrappingType: sap.m.WrappingType.Hyphenated,
                layoutData: new window.sapMFlexItemData({ growFactor: 1 })
            });
            window._invoiceVerifyResultLabel = resultLabel;
            container.addContent(resultLabel);
        }

        // Label secundar (între labelul principal și buton)
        if (!window._extraLabel || container.indexOfContent(window._extraLabel) === -1) {
            var extraLabel = new window.sapMLabel({
                text: "",
                design: "Bold",
                wrapping: true,
                wrappingType: sap.m.WrappingType.Hyphenated,
                layoutData: new window.sapMFlexItemData({ growFactor: 1 })
            });
            window._extraLabel = extraLabel;
            container.addContent(extraLabel);
        }

        // Buton Refresh
        if (!window._refreshButton || container.indexOfContent(window._refreshButton) === -1) {
            var refreshButton = new window.sapMButton({
                icon: "sap-icon://refresh",
                type: "Transparent",
                tooltip: "Verifica partenerul",
                enabled: false,
                press: function () {console.log("[InvoiceVerify] runVerification from refreshButton");  runVerification(undefined, undefined); },
                layoutData: new window.sapMFlexItemData({ styleClass: "sapUiTinyMarginBegin" })
            });
            window._refreshButton = refreshButton;
            container.addContent(refreshButton);
        }
    }

    function setResultText(text) {
        var container = getControl(CONTAINER_ID);

        // dacă lipsesc controalele, recreează și apoi setează textul
        if (!container || !window._invoiceVerifyResultLabel || container.indexOfContent(window._invoiceVerifyResultLabel) === -1) {
            window._pendingResultText = text;
            createDisplayControls().then(function () {
                if (window._invoiceVerifyResultLabel) {
                    var c = getControl(CONTAINER_ID);
                    if (c && c.indexOfContent(window._invoiceVerifyResultLabel) === -1) {
                        c.addContent(window._invoiceVerifyResultLabel);
                    }
                    window._invoiceVerifyResultLabel.setText(window._pendingResultText || "");
                    delete window._pendingResultText;
                }
            });
            return;
        }
        window._invoiceVerifyResultLabel.setText(text);
    }


    function setExtraLabelText(text) {
        var container = getControl(CONTAINER_ID);

        if (!container || !window._extraLabel || container.indexOfContent(window._extraLabel) === -1) {
            window._pendingExtraText = text;
            createDisplayControls().then(function () {
                if (window._extraLabel) {
                    var c = getControl(CONTAINER_ID);
                    if (c && c.indexOfContent(window._extraLabel) === -1) {
                        c.addContent(window._extraLabel);
                    }
                    window._extraLabel.setText(window._pendingExtraText || "");
                    delete window._pendingExtraText;
                }
            });
            return;
        }
        window._extraLabel.setText(text);
    }

    // --- Data: OData BP ------------------------------------------------------

    async function getBPData(bpId) {
        return new Promise(function (resolve, reject) {
            try {
                var sServiceUrl = "/sap/opu/odata/SAP/MD_BUSINESSPARTNER_SRV/";
                var oModel = new sap.ui.model.odata.v2.ODataModel(sServiceUrl, { json: true, useBatch: false });

                var sEntityPath = "/C_BusinessPartner(BusinessPartner='" + bpId + "',DraftUUID=guid'00000000-0000-0000-0000-000000000000',IsActiveEntity=true)";

                oModel.read(sEntityPath, {
                    urlParameters: {
                        "$select": "CountryName,to_BusinessPartnerTaxNumber/BPTaxNumber,to_BusinessPartnerTaxNumber/BPTaxType",
                        "$expand": "to_BusinessPartnerTaxNumber"
                    },
                    success: function (data) {
                        var taxNumber = null;
                        var countryCode = (data.CountryName || "").trim().toUpperCase();
                        var desiredType = countryCode ? (countryCode + "0") : null;
						console.log("[InvoiceVerify] OData success:", data);
                        if (data.to_BusinessPartnerTaxNumber && data.to_BusinessPartnerTaxNumber.results && desiredType) {
                            var found = data.to_BusinessPartnerTaxNumber.results.find(function (t) {
                                return t.BPTaxType === desiredType;
                            });
                            if (found) taxNumber = found.BPTaxNumber;
                        }

                        resolve({
                            country: data.CountryName || "",
                            //countryCode: countryCode,
                            bpTaxNumber: taxNumber
                        });
                    },
                    error: function (err) { 
						console.error("[InvoiceVerify] OData error:", err);
						reject(err); 
					}
                });
            } catch (e) { reject(e); }
        });
    }

    // --- Verification --------------------------------------------------------

    async function runVerification(newPart, newDate) {
        try {
            var bpInput = getControl(INPUT_BP_ID);
            var dateInput = getControl(INPUT_DATE_ID);

            // Citește valorile: dacă primesc parametri îi folosesc, altfel din componente
//            var bpRaw = (typeof newPart !== "undefined" && newPart !== null) ? newPart : (bpInput ? bpInput.getValue() : "");
            var bpRaw = (typeof newPart !== "undefined" && newPart !== null) ? newPart : (bpInput ? bpInput.getText() : "");
            var bpId = firstToken(bpRaw);
            if (!bpId) { setResultText("Lipseste partener"); return; }

            var dateObj;
            if (newDate instanceof Date) {
                dateObj = newDate;
            } else if (typeof newDate === "string" && newDate.trim() !== "") {
                var d = new Date(newDate);
                if (!isNaN(d.getTime())) dateObj = d;
            } else if (dateInput && typeof dateInput.getDateValue === "function") {
                dateObj = dateInput.getDateValue();
            }

            if (!(dateObj instanceof Date)) { setResultText("Lipseste data facturii"); return; }

            var invDate = formatDateYYYYMMDD(dateObj);

            if (window._refreshButton) window._refreshButton.setEnabled(false);
            setResultText(`⏳ Verific funizorul ${bpRaw} la data ${invDate}`);

            var data = await getBPData(bpId);

            if (data.bpTaxNumber) {
                setResultText(`Cod TVA:  ${data.bpTaxNumber} (${data.country}) \u200B la data ${invDate}`);
            } else {
                setResultText(`Nu am gasit cod TVA pentru furnizorul ${bpRaw} (${data.country}0) \u200B la data ${invDate}`);
				return;
            }
			
			const strCntry=data.country.trim().toUpperCase();
			if (strCntry == "RO") {
				setExtraLabelText('Verific la ANAF...' + data.bpTaxNumber)
				window.postMessage({ //apel catre content.js
					type: "ANAF_INVOICE_VERIFY",
					cui: data.bpTaxNumber,
					date: invDate
				}, "*");
				return;
			}
			// Lista codurilor de țări UE valide
			const validCountries = [
				"AT","BE","BG","CY","CZ","DE","DK","EE","ES","FI","FR",
				"GR","HR","HU","IE","IT","LT","LU","LV","MT","NL","PL",
				"PT","SE","SI","SK"
			];
			
			if (validCountries.includes(strCntry)){ //isUE
				setExtraLabelText('Verific in VIES...' + data.bpTaxNumber)
				window.postMessage({ //apel catre content.js
					type: "VIES_INVOICE_VERIFY",
					cui: data.bpTaxNumber,
					cntry: strCntry
				}, "*");
				return;
			}
			

        } catch (e) {
            console.error("[InvoiceVerify] runVerification failed:", e);
            setResultText("⚠️ Eroare! Ceva a mers prost!");
        } finally {
            if (window._refreshButton) window._refreshButton.setEnabled(true);
        }
    }

	function boolText(value) {
		return String(value).trim().toLowerCase() === "true" ? "DA" : "NU";
	}
	
	// Raspuns de la content.js
	window.addEventListener("message", (event) => {
		if (event.source !== window) return;
		if (event.data.type === "ANAF_INVOICE_VERIFY_RESULT") {
			const response = event.data.result;
			if (response.success) {
				console.log("[InvoiceVerify] ANAF Response: ", response.result);
				const { StatusInactivi, PlatitorTVA, StatusTvaIncasare } = response.result;

				let output = "";
				output += `Platitor TVA: ${boolText(PlatitorTVA)}\n`;
				output += `\u200B TVA la încasare: ${boolText(StatusTvaIncasare)}\n`;
				output += `\u200B Inactiv: ${boolText(StatusInactivi)}\n`;	
				setExtraLabelText(`${output}`);
			} else {
				console.error("Eroare ANAF:", response.error);
				setExtraLabelText("Eroare la verificare ANAF: " + response.error);
			}
		}
		if (event.data.type === "VIES_INVOICE_VERIFY_RESULT") {
			const response = event.data.result;
			if (response.success) {
				console.log("[InvoiceVerify] VIES Response:", response.valid);
				
				setExtraLabelText(response.valid ? ": ✅ VIES: TVA valid" : "❌ VIES: TVA invalid");
			} else {
				console.error("Eroare VIES:", response.error);
				setExtraLabelText("Eroare la verificare VIES: " + response.error);
			}
		}
	});

    // --- Event listeners pe câmpuri -----------------------------------------

    function attachFieldListenersOnce() {
		console.log("[InvoiceVerify] attachFieldListenersOnce start ");
        if (window._ivHandlersAttached) return;

        var bpInput = getControl(INPUT_BP_ID);
        var dateInput = getControl(INPUT_DATE_ID);

		
        function updateButtonStateFromValues(partVal, dateValObj) {
            var hasPart = String(partVal || "").trim().length > 0;
            var hasDate = (dateValObj instanceof Date);
            var enabled = hasPart && hasDate;
            if (window._refreshButton) window._refreshButton.setEnabled(enabled);
            if (!enabled) {
				setResultText("Lipsește furnizorul sau data doc");
				setExtraLabelText("");
			}
        }

        if (dateInput && typeof dateInput.attachChange === "function") {
            dateInput.attachChange(function (oEvent) {
                // Pentru sap.m.DatePicker, citim data ca Date din control
                var newDate = dateInput.getDateValue();

                var bpInputNow = getControl(INPUT_BP_ID);
//                var partVal = bpInputNow ? bpInputNow.getValue() : "";
                var partVal = bpInputNow ? bpInputNow.getText() : "";

                updateButtonStateFromValues(partVal, newDate);
                // verificam automat dacă ambele sunt setate
                if (String(partVal || "").trim() && (newDate instanceof Date)) {
					console.log("[InvoiceVerify] runVerification from Date attachChange ");
					runVerification(partVal, newDate);
				}
            });
        }


		// verific daca are binding pe "text"
		if (!bpInput._isSetValueHooked) {
			const oBinding = bpInput.getBinding("text");
			if (oBinding && oBinding.aBindings && oBinding.aBindings[0]) {
				const firstPartBinding = oBinding.aBindings[0]; // doar OData part1
				firstPartBinding.attachChange((oEvent) => {
					//oEvent.oSource ( oValue = newValue; vOriginalValue = oldValue )
					const partVal = firstPartBinding.getValue(); //newValue
					const hasValues = partVal && partVal.trim() !== ""; //&& partVal.includes("(");
					if (!hasValues) {
						setResultText("Lipsește furnizorul");
						setExtraLabelText("");
						return this; 
					}
					var dateInputNow = getControl(INPUT_DATE_ID);
					var dateVal = dateInputNow && typeof dateInputNow.getDateValue === "function" ? dateInputNow.getDateValue() : null;
					updateButtonStateFromValues(partVal, dateVal);
					// verificam automat dacă ambele sunt setate
					if (String(partVal || "").trim() && (dateVal instanceof Date)) {
						console.log("[InvoiceVerify] runVerification from Part model binding. Part: " + partVal);
						runVerification(partVal, dateVal);
					}
				});
			}
			bpInput._isSetValueHooked = true; // flag ca sa nu rescriem
		}	

	
        window._ivHandlersAttached = true;
    }

    // --- Wait for controls to be rendered ---
    const waitForControls = async (view) => {
        const controlIds = [
            INPUT_BP_ID,
            INPUT_DATE_ID
        ];

        return new Promise((resolve) => {
            const checkControls = () => {
                const allExist = controlIds.every(id => sap.ui.getCore().byId(id));
                if (allExist) {
                    resolve(controlIds.map(id => sap.ui.getCore().byId(id)));
                } else {
                    setTimeout(checkControls, 250);
                }
            };
            checkControls();
        });
    };

    // --- Retry helper to get main view ---
    const getMainView = (retries = 30, delay = 250) => {
        return new Promise((resolve, reject) => {
            const tryGetView = (remaining) => {
                const viewId = "application-SupplierInvoice-create-component---MMIV_HEADER_ID_S1";
                const view = sap.ui.getCore().byId(viewId);
                if (view) {
                    resolve(view);
                } else if (remaining > 0) {
                    setTimeout(() => tryGetView(remaining - 1), delay);
                } else {
                    reject(new Error("Main view not found: " + viewId));
                }
            };
            tryGetView(retries);
        });
    };

    // --- Init pe ruta / schimbare URL ----------------------------------------

    async function initCustomComponents() {

		console.log("[InvoiceVerify] initCustomComponents start ");
		const view = await getMainView();
		if (!view) throw new Error("[InvoiceVerify] Main view not found");

		const [bpInput, dateInput] = await waitForControls(view);
		
        await createDisplayControls();
        attachFieldListenersOnce();

        // stare inițială buton
        //var bpInput = getControl(INPUT_BP_ID);
        //var dateInput = getControl(INPUT_DATE_ID);
        var partVal = bpInput ? bpInput.getText() : "";
        var dateVal = dateInput && typeof dateInput.getDateValue === "function" ? dateInput.getDateValue() : null;
        var enabled = String(partVal || "").trim().length > 0 && (dateVal instanceof Date);
		console.log("[InvoiceVerify] _refreshButton enabled = ", enabled, " Part: ",partVal, "Date: ",dateVal);
        //if (!enabled) setResultText("Apasă butonul refresh");
        if (window._refreshButton) window._refreshButton.setEnabled(enabled);
    }

    function setupUrlObserverOnce() {
        if (window._invoiceUrlObserver) return;

        var lastUrl = location.href;

        function maybeInitOnInvoicePage() {
            if (lastUrl.indexOf("SupplierInvoice-create") !== -1) {
                if (!window._invoicePageInitialized) {
                    window._invoicePageInitialized = true;
                    initCustomComponents().catch(function (e) {
                        console.warn("[InvoiceVerify] initCustomComponents error:", e);
                    });
                }
            } else {
                window._invoicePageInitialized = false;
            }
        }

        // init imediat daca suntem deja pe pagina corecta
        maybeInitOnInvoicePage();

        var observer = new MutationObserver(function () {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
				window._ivHandlersAttached=false;
                maybeInitOnInvoicePage();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        window._invoiceUrlObserver = observer;
    }

    // --- Bootstrap -----------------------------------------------------------

    function start() {
        setupUrlObserverOnce();
    }

    if (document.readyState === "complete" || document.readyState === "interactive") {
		console.log("[InvoiceVerify] document.readyState: "+document.readyState);
        ensureUi5Ready(start);
    } else {
        window.addEventListener("load", function () { console.log("[InvoiceVerify] Load event"); ensureUi5Ready(start); }, { once: true });
    }

    // expunem pentru folosire externă (opțional)
    window.setResultText = setResultText;
    window.setExtraLabelText = setExtraLabelText;
    window.runVerification = runVerification;

})();
