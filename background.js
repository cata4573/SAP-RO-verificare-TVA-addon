chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ANAF_checkTVA") {
        const url = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";
        // Dacă cui începe cu RO, păstrează doar restul caracterelor
        var cui_ = message.cui;
		if (cui_.startsWith("RO")) {
            cui_ = cui_.slice(2);
        }
        const payload = [
            {
                cui: Number(cui_),
                data: message.data
            }
        ];
		const dbg=JSON.stringify(payload);
        fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        })
        .then(resp => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
        })
        .then(json => {
            const result = parseAnafResponse(json);
            sendResponse({ success: true, result });
        })
        .catch(err => {
            sendResponse({ success: false, error: err.message });
        });

        return true;
    }

    if (message.action === "VIES_checkTVA") {
        let { cui, cntry } = message;

        if (!cui || !cntry) {
            sendResponse({ success: false, error: "Missing parameters 'cui' or 'cntry'" });
            return true;
        }

        // Dacă cui începe cu cntry, păstrează doar restul caracterelor
        if (cui.startsWith(cntry)) {
            cui = cui.slice(cntry.length);
        }

        callCheckVatSoap(cntry, cui)
            .then(xmlText => {
				if (checkMaxConcurrentReq(xmlText)) //MS_MAX_CONCURRENT_REQ
				{
					throw new Error("VIES nu e disponibil (MS_MAX_CONCURRENT_REQ)");
				}
				// Extrage checkVatResponse
				const matchResponse = xmlText.match(/<\w+:checkVatResponse[\s\S]*?<\/\w+:checkVatResponse>/);
				if (!matchResponse) throw new Error("checkVatResponse not found: "+xmlText);

				// Extrage <valid>
				const validMatch = matchResponse[0].match(/<\w+:valid>(true|false)<\/\w+:valid>/i);
				const valid = validMatch ? validMatch[1] === "true" : false;

				sendResponse({ success: true, valid });
            })
            .catch(err => sendResponse({ success: false, error: err.message }));

        return true; // indicate async response
    }


});

	function checkMaxConcurrentReq(xmlText) {
			// cauta continutul faultstring
			const match = xmlText.match(/<faultstring>([\s\S]*?)<\/faultstring>/i);
			if (match && match[1].trim() === "MS_MAX_CONCURRENT_REQ") {
				return true;
			}
			return false;
	}

	function parseAnafResponse(response) {
		if (!response || !Array.isArray(response.found) || response.found.length === 0) {
			return {
				StatusInactivi: null,
				PlatitorTVA: null,
				StatusTvaIncasare: null
			};
		}

		const item = response.found[0];

		return {
			StatusInactivi: item.stare_inactiv?.statusInactivi ?? null,
			PlatitorTVA: item.inregistrare_scop_Tva?.scpTVA ?? null,
			StatusTvaIncasare: item.inregistrare_RTVAI?.statusTvaIncasare ?? null
		};
	}


// --- SOAP call ---
	async function callCheckVatSoap(countryCode, vatNumber) {
		const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
		<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
		   <soapenv:Header/>
		   <soapenv:Body>
			  <urn:checkVat>
				 <urn:countryCode>${countryCode}</urn:countryCode>
				 <urn:vatNumber>${vatNumber}</urn:vatNumber>
			  </urn:checkVat>
		   </soapenv:Body>
		</soapenv:Envelope>`;

		const response = await fetch("https://ec.europa.eu/taxation_customs/vies/services/checkVatService", {
			method: "POST",
			headers: {
				"Content-Type": "text/xml; charset=utf-8",
				"SOAPAction": "\"urn:ec.europa.eu:taxud:vies:services:checkVat/checkVat\""
			},
			body: soapEnvelope
		});

		if (!response.ok) throw new Error(`SOAP request failed: ${response.statusText}`);
		return await response.text();
	}

