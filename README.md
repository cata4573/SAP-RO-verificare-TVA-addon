
    ![Screenshot 2025-09-19 161830](https://github.com/user-attachments/assets/9b7fa534-d5f7-4cf0-8fd0-ddce0b76dd08)

![Screenshot 2025-09-19 161830](https://github.com/user-attachments/assets/bc117092-e5c0-43eb-bc04-8381ded20774)

Addon-ul verifica partenerii si afiseaza rezultatul in pagina "Create supplier invoice" din SAP Fiori 

Modificati in manifest.json mySite:myPort (in 3 locuri)

Aplicatia verifica in 2 pasi:
1. Citeste codul fiscal si Tara partenerului
2. pe baza codului fiscal, se interogheaza ANAF pentru tara RO si Data documentului
     sau VIES-ul pentru tarile din EU (cu exceptia RO) 

in SAP, tipul Codului fiscal principal este important sa fie de forma Tara+0 (BPTaxType:  RO0, DE0 ... ca exemple)
Daca aveti alte setari in SAP va trebui sa modificati in Page.js in getBPData, aici : ..... (countryCode + "0") .....

in rest, in principiu, ar trebui sa mearga out of box dupa instalare.

Testat pe Chrome, Edge si Brave

Daca nu merge, ar trebui verificat daca ID-urile din Page.js se regasesc in pagina web. Posibil sa nu fie ca mai jos, dar destul de putin probabil
    var CONTAINER_ID = "application-SupplierInvoice-create-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.ObjectPageLayoutMain-OPHeaderContent";
    var INPUT_BP_ID = "application-SupplierInvoice-create-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.TextInvoicingParty"; 
    var INPUT_DATE_ID = "application-SupplierInvoice-create-component---MMIV_HEADER_ID_S1--idS2P.MM.MSI.CEDatePickerDocumentDate-datePicker";

 Daca tot nu merge si stiti ca ANAF-ul chiar merge, dati un mesaj aici.
 Eventual dati un ochi si in consola

 
Daca vreti mai multe informatii de la ANAF, modificati background.js




