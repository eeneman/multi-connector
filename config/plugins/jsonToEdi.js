const edi = require('rdpcrystal-edi-library');
const moment = require('moment')
const jsonToEdi = function (obj) {
  let doc = new edi.EDILightWeightDocument();

  //Set the delimiters
  doc.Delimiters.ElementTerminatorCharacter = 43;// +
  doc.Delimiters.CompositeTerminatorCharacter = 58;// :
  doc.Delimiters.SegmentTerminatorCharacter = 39;// '

  //Write each segment in a new line
  doc.EachSegmentInNewLine = true;

  //UNB+UNOC:1+BOCTOKOVT+003709924664+210812:0921+CTRLREF++++++1'	

  let interchangeLoop = doc.createLoop("Interchange header");
  let isa = interchangeLoop.createSegment("UNB");
  let c1 = new edi.LightWeightElement();
  c1.addCompositeElement("UNOC");
  c1.addCompositeElement("1");
  isa.elements.add(c1);
  isa.addElement("BOCTOKOVT");
  isa.addElement("003709924664");
  let c2 = new edi.LightWeightElement();
  c2.addCompositeElement("210812");
  c2.addCompositeElement("0921");
  isa.elements.add(c2);
  isa.addElement("CTRLREF");
  isa.addElement("");
  isa.addElement("");
  isa.addElement("");
  isa.addElement("");
  isa.addElement("");
  isa.addElement("1");

  //UNH+0062+S009+0068+S010
  //S009->0065:0052:0054:0051:0057
  //S010 ->0070:0073
  //UNH+12345678+ORDERS:1:911:UN'

  let messageLoop = interchangeLoop.createLoop("Message header")
  let msg = messageLoop.createSegment("UNH");
  msg.addElement(obj.idLocal)
  let c3 = new edi.LightWeightElement();
  c3.addCompositeElement("ORDERS");
  c3.addCompositeElement("1");
  c3.addCompositeElement("911");
  c3.addCompositeElement("UN");
  msg.elements.add(c3);

  //BGM+105+12345678+9'	<-- Message (order) number
  //BGM+C002+1004+1225+4343
  //C002->1001:1131:3055:1000
  let orderLoop = messageLoop.createLoop("Order number")
  let ord = orderLoop.createSegment("BGM");
  ord.addElement("105")
  ord.addElement(obj.idLocal);
  ord.addElement("9")

  //DTM+4:20210812:102'		<-- Order date
  //DTM+C507
  //C507->2005:2380:2379
  let orderDateLoop = messageLoop.createLoop("Order date")
  let ordDate = orderDateLoop.createSegment("DTM");
  let c4 = new edi.LightWeightElement();
  c4.addCompositeElement("4");
  c4.addCompositeElement(moment(obj.ordered, 'yyyy-mm-DD').format('YYYYMMDD'));
  c4.addCompositeElement("102");
  ordDate.elements.add(c4)

  //DTM+2:20210828:102'	<-- Requested delivery date
  //DTM+C507
  //C507->2005:2380:2379
  let deliveryDateLoop = messageLoop.createLoop("Delivery date")
  let deliveryDate = deliveryDateLoop.createSegment("DTM");
  let c5 = new edi.LightWeightElement();
  c5.addCompositeElement("2");
  c5.addCompositeElement(moment(obj.processDelivery.deliveryRequired, 'yyyy-mm-DD').format('YYYYMMDD'));
  c5.addCompositeElement("102");
  deliveryDate.elements.add(c5)

  //FTX+AAI+1++Kaikki samassa toimituksessa!'	 <-- Optional freetext
  //FTX+4451+4453+C107+C108+3453
  //C107->4441:1131:3055
  //C108->4440:4440:4440:4440:4440
  let freeTextLoop = messageLoop.createLoop("Free Text")
  let ftxt = freeTextLoop.createSegment("FTX");
  ftxt.addElement("AAI");
  ftxt.addElement("1");
  if (obj.processDelivery.additionalInformation) {
    ftxt.addElement("");
    let ftcomp = new edi.LightWeightElement();
    ftcomp.addCompositeElement(obj.processDelivery.additionalInformation.slice(0, 70));
    if (obj.processDelivery.additionalInformation.length > 70)
      ftcomp.addCompositeElement(obj.processDelivery.additionalInformation.slice(70, 140));
    if (obj.processDelivery.additionalInformation.length > 140)
      ftcomp.addCompositeElement(obj.processDelivery.additionalInformation.slice(140, 210));
    if (obj.processDelivery.additionalInformation.length > 210)
      ftcomp.addCompositeElement(obj.processDelivery.additionalInformation.slice(210, 280));
    if (obj.processDelivery.additionalInformation.length > 280)
      ftcomp.addCompositeElement(obj.processDelivery.additionalInformation.slice(280, 350));
    ftxt.elements.add(ftcomp)
  }
  //NAD+BY+BOCTOKOVT++Boctok Oy'	<-- Buyer OVT/GLN, Buyer name
  //NAD+3035+C082+C058+C080+C059+3164+3229+3251+3207
  //C082->3039:1131:3055
  //C058->3124:3124:3124:3124:3124
  //C080->3036:3036:3036
  //C059->3042:3042:3042
  let buyerNameLoop = messageLoop.createLoop("Buyer Name")
  let bName = buyerNameLoop.createSegment("NAD");
  bName.addElement("BY");
  bName.addElement(obj.buyer.idLocal);
  if (obj.customer.name) {
    bName.addElement("");
    bName.addElement(obj.buyer.name)
  }

  //NAD+SE+003709924664'	<-- Seller OVT, Dahl generic/HQ
  //NAD+3035+C082+C058+C080+C059+3164+3229+3251+3207
  //C082->3039:1131:3055
  //C058->3124:3124:3124:3124:3124
  //C080->3036:3036:3036
  //C059->3042:3042:3042
  let sellerLoop = messageLoop.createLoop("seller")
  let seller = sellerLoop.createSegment("NAD");
  seller.addElement("SE");
  seller.addElement("003709924664");
  seller.addElement("");
  seller.addElement("");
  seller.addElement("");
  seller.addElement("");
  seller.addElement("");
  seller.addElement("");
  seller.addElement(obj.seller.contact.countryCode);


  // NAD+DP  +    +    +Boctok Oy+Perintökuja 1+VANTAA++01510+FI' <-- Delivery address
  //NAD+3035+C082+C058+C080     +C059         +3164  +3229+3251+3207
  //C082->3039:1131:3055
  //C058->3124:3124:3124:3124:3124
  //C080->3036:3036:3036
  //C059->3042:3042:3042
  let DeliveryaddressLoop = messageLoop.createLoop("Delivery address")
  let dAdd = DeliveryaddressLoop.createSegment("NAD");
  dAdd.addElement("DP");
  if (obj.addressShipping.name || obj.addressShipping.streetAddressLine1 || obj.addressShipping.postalArea || obj.addressShipping.postalCode || obj.addressShipping.country) {
    dAdd.addElement("");
    dAdd.addElement("");
    dAdd.addElement(obj.addressShipping.name);
  }
  if (obj.addressShipping.streetAddressLine1 || obj.addressShipping.postalArea || obj.addressShipping.postalCode || obj.addressShipping.country)
    dAdd.addElement(obj.addressShipping.streetAddressLine1);
  if (obj.addressShipping.postalArea || obj.addressShipping.postalCode || obj.addressShipping.country)
    dAdd.addElement(obj.addressShipping.postalArea);
  if (obj.addressShipping.postalCode || obj.addressShipping.country) {
    dAdd.addElement("");
    dAdd.addElement(obj.addressShipping.postalCode);
  }
  if (obj.addressShipping.country)
    dAdd.addElement(obj.addressShipping.country);

  // NAD+IV+++Boctok Oy+PL 908+DOCUSCAN++02066+FI'	<-- Invoicing address (uncertain if this is mandatory on orders, Dahl to confirm)
  let InvoicingaddressLoop = messageLoop.createLoop("Invoicing address")
  let invAdd = InvoicingaddressLoop.createSegment("NAD");
  invAdd.addElement("IV");
  if (obj.addressBilling.name || obj.addressBilling.streetAddressLine1 || obj.addressBilling.postalArea || obj.addressBilling.postalCode || obj.addressBilling.country) {
    invAdd.addElement("");
    invAdd.addElement("");
    invAdd.addElement(obj.addressBilling.name);
  }
  if (obj.addressBilling.streetAddressLine1 || obj.addressBilling.postalArea || obj.addressBilling.postalCode || obj.addressBilling.country)
    invAdd.addElement(obj.addressBilling.streetAddressLine1);
  if (obj.addressBilling.postalArea || obj.addressBilling.postalCode || obj.addressBilling.country)
    invAdd.addElement(obj.addressBilling.postalArea);
  if (obj.addressBilling.postalCode || obj.addressBilling.country) {
    invAdd.addElement("");
    invAdd.addElement(obj.addressBilling.postalCode);

  }
  if (obj.addressBilling.country)
    invAdd.addElement(obj.addressBilling.country);


  //CUX+5:EUR'	<-- Currency
  //CUX+C504+C504+5402+6341
  //C504->6347:6345:6343:6348
  let CurrencyLoop = messageLoop.createLoop("Currency")
  let currency = CurrencyLoop.createSegment("CUX");
  let c6 = new edi.LightWeightElement();
  c6.addCompositeElement("5");
  c6.addCompositeElement("EUR");
  currency.elements.add(c6)

  //TDT+20++Z02'	<-- Transport details, coded. Dahl to confirm codes, assumably Z01=delivery, Z02=pickup, KAU=Kaukokiito
  //TDT+8051+8028+C220+C228+C040+8101+C401
  //C220->8067:8066
  //C228->8179:8178
  //C040->3127:1131:3055:3128
  //C401->8457:8459:7130
  let TransportdetailsLoop = messageLoop.createLoop("Transport details")
  let TDetails = TransportdetailsLoop.createSegment("TDT");
  TDetails.addElement("20");
  TDetails.addElement("");
  TDetails.addElement("Z02");

  //UNS+D'		<-- Header/Detail separator
  //UNS+0081
  let DetailseparatorLoop = messageLoop.createLoop("Detail separator")
  let dSepartor = DetailseparatorLoop.createSegment("UNS");
  dSepartor.addElement("D");

  var itemsLength = obj.orderLine.length
  for (var i = 0; i < itemsLength; i++) {
    //LIN+10++0401138:ZZ5'	<-- Suppliers item ID, NOTE! Our current API requires qualifier ZZ5
    //LIN+1082+1229+C212+5495+1222+7083
    //C212->7140:7143:1131:3055
    let SuppliersitemLoop = messageLoop.createLoop("Suppliers item")
    let sItem = SuppliersitemLoop.createSegment("LIN");
    sItem.addElement(obj.orderLine[i].idLocal);
    sItem.addElement("");
    let c7 = new edi.LightWeightElement();
    c7.addCompositeElement(obj.orderLine[i].product.supplierCode);
    c7.addCompositeElement("ZZ5");
    sItem.elements.add(c7)

    //IMD+    +    +-:::25 / 33,7 FE-KIERREPUTKI  ZN EN1025'	<-- Item description/name
    //IMD+7077+7081+C273+7383
    //C273->7009:1131:3055:7008:7008
    let ItemnameLoop = messageLoop.createLoop("Item name")
    let iName = ItemnameLoop.createSegment("IMD");
    iName.addElement("");
    iName.addElement("");
    let c8 = new edi.LightWeightElement();
    c8.addCompositeElement("-")
    c8.addCompositeElement("");
    c8.addCompositeElement("");
    c8.addCompositeElement(obj.orderLine[i].product.descriptionGeneral.slice(0, 35));//LENGTH 35
    if (obj.descriptionGeneral.length > 35)
      c8.addCompositeElement(obj.orderLine[i].product.descriptionGeneral.slice(35, 70));
    iName.elements.add(c8)

    //QTY+21:60.000:M'    <-- Ordered quantity + unit of measure
    //QTY+C186
    //C186->6063:6060:6411
    let Orderedquantity1Loop = messageLoop.createLoop("Ordered quantity 1")
    let ordQty1 = Orderedquantity1Loop.createSegment("QTY");
    let c9 = new edi.LightWeightElement();
    c9.addCompositeElement("21")
    c9.addCompositeElement(obj.orderLine[i].quantity);
    c9.addCompositeElement(obj.orderLine[i].unit);
    ordQty1.elements.add(c9)

    //DTM+2:20210812:102'	<-- Requested delivery date. NOTE! Dahl to confirm if needed on header level. If it can differ on separate lines, maybe not
    //DTM+C507
    //C507->2005:2380:2379
    let requestedDeliveryDateLoop = messageLoop.createLoop("delivery date")
    let requestedDeliveryDate = requestedDeliveryDateLoop.createSegment("DTM");
    let c10 = new edi.LightWeightElement();
    c10.addCompositeElement("2")
    c10.addCompositeElement(moment(obj.deliveryRequired, 'yyyy-mm-DD').format('YYYYMMDD'));
    c10.addCompositeElement("102");
    requestedDeliveryDate.elements.add(c10)

  }
  //UNS+S'		<-- Detail/summary section separator
  let sectionseparatorLoop = messageLoop.createLoop("section separator")
  let sName = sectionseparatorLoop.createSegment("UNS");
  sName.addElement("S");

  //UNT+27+12345678' <-- Message trailer, segment count and message reference, usually the message number
  //UNT+0074+0062
  let MessagetrailerLoop = messageLoop.createLoop("Message trailer")
  let mEnd = MessagetrailerLoop.createSegment("UNT");
  mEnd.addElement("27");
  mEnd.addElement(obj.idLocal);

  //UNZ+1+CTRLREF'	<-- Interchange trailer, control reference needs to be the same as on UNB
  let InterchangetrailerLoop = interchangeLoop.createLoop("Interchange trailer")
  let isE = InterchangetrailerLoop.createSegment("UNZ");
  isE.addElement("1");
  isE.addElement("CTRLREF");



  //Display the new EDI document
  let edidata = doc.generateEDIData();

  return edidata
}

const ediToJson = function (data) {

  const tempObj = {
    "@type": "OrderConfirmation",
    "idLocal": "",
    "ordered": "",
    "orderLine": [],
    "buyer": {
      "@type": "Organization",
      "name": "",
      "idLocal": "",
      "contact": {
        "@type": "ContactInformation",
        "postalArea": "",
        "postalCode": "",
        "countryCode": "",
        "streetAddressLine1": ""
      }
    },
    "seller": {
      "@type": "Organization",
      "idLocal": "",
      "contact": {
        "@type": "ContactInformation",
        "postalArea": "",
        "postalCode": "",
        "countryCode": "",
        "streetAddressLine1": ""
      }
    },
    "processBilling": {
      "@type": "Organization",
      "name": "",
      "contact": {
        "@type": "ContactInformation",
        "postalArea": "",
        "postalCode": "",
        "countryCode": "",
        "streetAddressLine1": "",
      }
    },
    "processDelivery": {
      "@type": "ProcessDelivery",
      "deliveryRequired": "",
      "additionalInformation": "",
      "addressShipping": {
        "@type": "Organization",
        "name": "",
        "contact": {
          "@type": "ContactInformation",
          "postalArea": "",
          "postalCode": "",
          "countryCode": "",
          "streetAddressLine1": ""
        }
      }
    },
    "sender": {
      "@type": "DataProduct",
      "productCode": ""
    }
  }
  let fileLoader = new edi.EDIFileLoader();
  fileLoader.EDIDataString = data;

  let flatDoc = fileLoader.load();
  let arr = flatDoc.Loops.getItem(0)
  let segments = arr.segments;
  if (segments.Count) {
    for (let i = 0; i < segments.Count; i++) {
      let segment = segments.getItem(i)

      switch (segment.name) {
        case "UNB":
          // code block
          break;
        case "UNH":
          // code block
          break;
        case "BGM":
          // code block
          
          for (let i = 0; i < segment.elements.Count; i++) {
            switch (i) {
              case 1:
                let value = segment.elements.getItem(1)
                tempObj.idLocal = value.dataValue
                break;
            }
          }
          break;
        case "DTM":
          for (let j = 0; j < segment.elements.Count; j++) {
            switch (j) {
              case 0:
                let value = segment.elements.getItem(0)
                if (value.Composite) {
                  for (let k = 0; k < value.elements.Count; k++) {
                    let compositeValue = value.elements.getItem(k)
                    if (compositeValue.dataValue == 4) {
                      k = k + 1;
                      let orderedDate = value.elements.getItem(k)
                      tempObj.ordered = moment(orderedDate.dataValue, 'YYYYMMDD').format('YYYY-MM-DDTHH:mm:ss')
                    }
                    else if (compositeValue.dataValue == 2) {
                      k = k + 1;
                      let deliveryDate = value.elements.getItem(k)
                      tempObj.processDelivery.deliveryRequired = moment(deliveryDate.dataValue, 'YYYYMMDD').format('YYYY-MM-DDTHH:mm:ss')
                    }
                  }
                }
                break;
            }
          }

          break;
        case "FTX":
          for (let j = 0; j < segment.elements.Count; j++) {
            switch (j) {
              case 3:
                let value = segment.elements.getItem(3)
                if (value.Composite) {
                  for (let k = 0; k < value.elements.Count; k++) {
                    let compositeValue = value.elements.getItem(k)
                    tempObj.processDelivery.additionalInformation = tempObj.processDelivery.additionalInformation.concat(compositeValue.dataValue)
                  }
                }
                break;
            }
          }
          break;
        case "NAD":
          if (segment.elements.Count > 0) {
            let value = segment.elements.getItem(0)
            switch (value.dataValue) {
              case 'BY':
                if (segment.elements.Count > 0) {
                  let idLocalBY = segment.elements.getItem(1)
                  tempObj.buyer.idLocal = idLocalBY.dataValue
                }
                if (segment.elements.Count > 3) {
                  let buyerBY = segment.elements.getItem(3)
                  tempObj.buyer.name = buyerBY.dataValue
                }
                if (segment.elements.Count > 4) {

                  let streetAddressLine1BY = segment.elements.getItem(4)
                  tempObj.buyer.contact.streetAddressLine1 = streetAddressLine1BY.dataValue
                }
                if (segment.elements.Count > 5) {
                  let postalAreaBY = segment.elements.getItem(5)
                  tempObj.buyer.contact.postalArea = postalAreaBY.dataValue
                }
                if (segment.elements.Count > 7) {
                  let postalCodeBY = segment.elements.getItem(7)
                  tempObj.buyer.contact.postalCode = postalCodeBY.dataValue
                }
                if (segment.elements.Count > 8) {
                  let countryBY = segment.elements.getItem(8)
                  tempObj.buyer.contact.countryCode = countryBY.dataValue
                }
                break;
              case 'SE':
                if (segment.elements.Count > 0) {
                  let idLocalSE = segment.elements.getItem(1)
                  tempObj.seller.idLocal = idLocalSE.dataValue
                }
                if (segment.elements.Count > 3) {
                  let sellerSE = segment.elements.getItem(3)
                  tempObj.seller.name = sellerSE.dataValue
                }
                if (segment.elements.Count > 4) {

                  let streetAddressLine1SE = segment.elements.getItem(4)
                  tempObj.seller.contact.streetAddressLine1 = streetAddressLine1SE.dataValue
                }
                if (segment.elements.Count > 5) {
                  let postalAreaSE = segment.elements.getItem(5)
                  tempObj.seller.contact.postalArea = postalAreaSE.dataValue
                }
                if (segment.elements.Count > 7) {
                  let postalCodeSE = segment.elements.getItem(7)
                  tempObj.seller.contact.postalCode = postalCodeSE.dataValue
                }
                if (segment.elements.Count > 8) {
                  let countrySE = segment.elements.getItem(8)
                  tempObj.seller.contact.countryCode = countrySE.dataValue
                }
                break;
              case 'DP':
                if (segment.elements.Count > 0) {
                  let idLocalDP = segment.elements.getItem(1)
                  tempObj.processDelivery.idLocal = idLocalDP.dataValue
                }
                if (segment.elements.Count > 3) {
                  let nameDP = segment.elements.getItem(3)
                  tempObj.processDelivery.addressShipping.name = nameDP.dataValue
                }
                if (segment.elements.Count > 4) {
                  let streetAddressLine1DP = segment.elements.getItem(4)
                  tempObj.processDelivery.addressShipping.contact.streetAddressLine1 = streetAddressLine1DP.dataValue
                }
                if (segment.elements.Count > 5) {
                  let postalAreaDP = segment.elements.getItem(5)
                  tempObj.processDelivery.addressShipping.contact.postalArea = postalAreaDP.dataValue
                }
                if (segment.elements.Count > 7) {
                  let postalCodeDP = segment.elements.getItem(7)
                  tempObj.processDelivery.addressShipping.contact.postalCode = postalCodeDP.dataValue
                }
                if (segment.elements.Count > 8) {
                  let countryDP = segment.elements.getItem(8)
                  tempObj.processDelivery.addressShipping.contact.countryCode = countryDP.dataValue
                }
                break;
              case 'IV':
                if (segment.elements.Count > 0) {
                  let idLocalIV = segment.elements.getItem(1)
                  tempObj.processBilling.idLocal = idLocalIV.dataValue
                }
                if (segment.elements.Count > 3) {
                  let nameIV = segment.elements.getItem(3)
                  tempObj.processBilling.name = nameIV.dataValue
                }
                if (segment.elements.Count > 4) {
                  let streetAddressLine1IV = segment.elements.getItem(4)
                  tempObj.processBilling.contact.streetAddressLine1 = streetAddressLine1IV.dataValue
                }
                if (segment.elements.Count > 5) {
                  let postalAreaIV = segment.elements.getItem(5)
                  tempObj.processBilling.contact.postalArea = postalAreaIV.dataValue
                }
                if (segment.elements.Count > 7) {
                  let postalCodeIV = segment.elements.getItem(7)
                  tempObj.processBilling.contact.postalCode = postalCodeIV.dataValue
                }
                if (segment.elements.Count > 8) {
                  let countryIV = segment.elements.getItem(8)
                  tempObj.processBilling.contact.countryCode = countryIV.dataValue
                }
                break;
            }
          }
          break;
        case "CUX":
          // code block
          break;
        case "TDT":
          // code block
          break;
        case "UNS":
          // code block
          break;
        case "LIN":
          // code block
          let item = {
						"@type": "OrderLine",
						"idLocal": "",
						"quantity": null,
						"unit": "",
						"pricePerUnit": "",
						"price": "",
						"deliveryPlanned": "",
						"product": {
							"@type": "Product",
							"idLocal": "",
							"name": "",
							"codeProduct": "",
							"descriptionGeneral": ""
						}
					}
          for (let j = 0; j < segment.elements.Count; j++) {
            switch (j) {
              // case 0:
              //   let linItem = segment.elements.getItem(0)
              //   item.idLocal = linItem.dataValue
              //   break;
              case 2:
                let value = segment.elements.getItem(2)
                if (value.Composite) {
                  let compositeValue = value.elements.getItem(0)
                  item.product.codeProduct = compositeValue.dataValue
                }
                break;
            }
          }
          i = i + 1;
          let itemImd = segments.getItem(i)
          while (itemImd.name == 'IMD' || itemImd.name == 'QTY' || itemImd.name == 'DTM' || itemImd.name == 'MOA' ||
            itemImd.name == 'PRI' || itemImd.name == 'RFF' || itemImd.name == 'ALC') {
            switch (itemImd.name) {
              case "IMD":
                // code block
                for (let k = 0; k < itemImd.elements.Count; k++) {
                  switch (k) {
                    case 2:
                      let value = itemImd.elements.getItem(2)
                      if (value.Composite) {
                        let compositeValue = value.elements.getItem(3)
                        item.product.name = compositeValue.dataValue
                        if (value.elements.Count == 5) {
                          let compositeValue = value.elements.getItem(4)
                          item.product.name = item.product.name.concat(compositeValue.dataValue)
                        }
                      }
                      break;
                  }
                }
                break;
              case "QTY":
                // code block
                for (let k = 0; k < itemImd.elements.Count; k++) {
                  switch (k) {
                    case 0:
                      let value = itemImd.elements.getItem(0)
                      if (value.Composite) {
                        let compositeValue1 = value.elements.getItem(1)
                        item.quantity = parseInt(compositeValue1.dataValue)
                        let compositeValue2 = value.elements.getItem(2)
                        item.unit = compositeValue2.dataValue
                      }
                      break;
                  }
                }
                break;
              case "DTM":
                for (let j = 0; j < itemImd.elements.Count; j++) {
                  switch (j) {
                    case 0:
                      let value = itemImd.elements.getItem(0)
                      if (value.Composite) {
                        if(value.elements.Count>1){
                          let deliveryDate = value.elements.getItem(1)
                          item.deliveryPlanned = moment(deliveryDate.dataValue, 'YYYYMMDD').format('YYYY-MM-DDTHH:mm:ss')
                        }
                        // for (let k = 0; k < value.elements.Count; k++) {
                        //   let compositeValue = value.elements.getItem(k)
                        //   if (compositeValue.dataValue == 69) {
                        //     k = k + 1;
                        //     let deliveryDate = value.elements.getItem(k)
                        //     item.deliveryPlanned = moment(deliveryDate.dataValue, 'YYYYMMDD').format('YYYY-MM-DDTHH:mm:ss')
                        //   }
                        // }
                      }
                      break;
                  }
                }
                break;
              case "MOA":
                for (let j = 0; j < itemImd.elements.Count; j++) {
                  switch (j) {
                    case 0:
                      let value = itemImd.elements.getItem(0)
                      if (value.Composite) {
                        if(value.elements.Count>1){
                        let compositeValue = value.elements.getItem(1)
                        item.price = compositeValue.dataValue
                        }
                      }
                      break;
                  }
                }
                break;
              case "PRI":
                for (let k = 0; k < itemImd.elements.Count; k++) {
                  switch (k) {
                    case 0:
                      let value = itemImd.elements.getItem(0)
                      if (value.Composite) {
                        let compositeValue1 = value.elements.getItem(1)
                        item.pricePerUnit = compositeValue1.dataValue
                        // let compositeValue2 = value.elements.getItem(4)
                        // item.unit = compositeValue2.dataValue == 1 ? 'KPL' : compositeValue2.dataValue + ' KPL'
                      }
                      break;
                  }
                }
                break;

              // case 'RFF':
              //   for (let k = 0; k < itemImd.elements.Count; k++) {
              //     switch (k) {
              //       case 0:
              //         let value = itemImd.elements.getItem(0)
              //         if (value.Composite) {
              //           let compositeValue1 = value.elements.getItem(1)
              //           item.order = compositeValue1.dataValue
              //           let compositeValue2 = value.elements.getItem(2)
              //           item.orderLine = compositeValue2.dataValue
              //         }
              //         break;
              //     }
              //   }
              //   break;
              // case "ALC":
              //   // code block

              //   i = i + 1;
              //   let alcValue = segments.getItem(i)
              //   if (alcValue.name == 'PCD') {
              //     for (let k = 0; k < alcValue.elements.Count; k++) {
              //       switch (k) {
              //         case 0:
              //           let value = alcValue.elements.getItem(0)
              //           if (value.Composite) {
              //             // let compositeValue1 = value.elements.getItem(1)
              //             // item.price = compositeValue1.dataValue
              //             let compositeValue2 = value.elements.getItem(1)
              //             item.discount = compositeValue2.dataValue
              //           }
              //           break;
              //       }
              //     }
              //   } else {
              //     i = i - 1;
              //   }
              //  break;
            }
            i = i + 1;
            itemImd = segments.getItem(i)

          }

          i = i - 1;
          tempObj.orderLine.push(item)
          break;
        // case "IMD":
        //   // code block
        //   break;
        // case "QTY":
        //   // code block
        //   break;
        case "MOA":
          // for (let j = 0; j < segment.elements.Count; j++) {
          //   switch (j) {
          //     case 0:
          //       let value = segment.elements.getItem(0)
          //       if (value.Composite) {
          //         let compositeValue = value.elements.getItem(1)
          //         tempObj.totalAmount = compositeValue.dataValue
          //       }
          //       break;
          //   }
          // }
          break;
        case "UNT":
          // code block
          break;
        case "UNZ":
          // code block
          break;


      }
    }
  }
  //console.log(tempObj)
  return tempObj
}
module.exports = { jsonToEdi, ediToJson }