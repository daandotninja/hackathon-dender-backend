const functions = require('firebase-functions');
const app = require('express')();

const _ = require('lodash');
const path = require('path');

const hummus = require('hummus');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');
admin.initializeApp();

const fieldTypes = {
  FREE_TEXT: 'FREE_TEXT',
  IMAGE: 'IMAGE',
  GA_FIELD: 'GA_FIELD',
};

const generateDocs = (req, res) => {
  // Get doc from the database
  const { id: docId, bearer } = req.params;

  // Get a database reference to our posts
  const db = admin.database();
  const ref = db.ref('documents/' + docId);

  const fetchOptions = {
    'credentials': 'include',
    'headers': {
      'authorization': 'Bearer ' + bearer,
      'content-type': 'application/json;charset=UTF-8',
    },
    'mode': 'cors',
  };

  const buildPDFs = (ledenlijst) => {
    console.log(ledenlijst);

    // Loop members and generate PDF for each one
    ledenlijst.leden.slice(0,3).forEach(lid => {
      // Customize PDF
      const pdfWriter = hummus.createWriterToModify(document.path, {
        modifiedFilePath: path.join(__dirname, 'output', docId, lid.id + '.pdf')
      });

      const pageModifier = new hummus.PDFPageModifier(pdfWriter,0);

      document.fields.forEach(f => {
        let text;

        switch(type) {
          case fieldTypes.GA_FIELD:
            text = lid.waarden[f.ga_property];
            break;

          case fieldTypes.FREE_TEXT:
            text = f.value;
            break;
        }

        pageModifier.startContext().getContext().writeText(
          text,
          f.x, f.y,
          {
            //font: pdfWriter.getFontForFile(path.join(__dirname, 'Couri.ttf')),
            size: 14,
            colorspace: 'gray',
            color: 0x00,
          }
        );
      });

      pageModifier.endContext().writePage();
      pdfWriter.end();

      // Store on Firebase

      // Extend doc with generated URL
    });

    // Return full doc
    return res.send(document);
  };

  const callGroepsadmin = filterResult => {

    console.log(filterResult);

    // Fetch all members with filter applied
    fetch('https://groepsadmin.scoutsengidsenvlaanderen.be/groepsadmin/rest-ga/ledenlijst?aantal=&offset=0', _.assign({}, fetchOptions, {
      'body': null,
      'method': 'GET',
    }))
      .then((response) => {
        return response.json();
      })
      .then(buildPDFs)
      .catch(error => {
        console.log(error)
      });

    return filterResult;
  };

  // Attach an asynchronous callback to read the data at our posts reference
  ref.on("value", (snapshot) => {
    const document = snapshot.val();

    console.log(document);

    // Get members from GA based on filter
    const body = {
      criteria: document.criteria,
      //'kolommen': ['be.vvksm.groepsadmin.model.column.VoornaamColumn', 'be.vvksm.groepsadmin.model.column.AchternaamColumn', 'be.vvksm.groepsadmin.model.column.EmailColumn', 'be.vvksm.groepsadmin.model.column.GeboorteDatumColumn', 'be.vvksm.groepsadmin.model.column.VVKSMTakkenColumn', 'd5f75e2339b51fa00139bbd5f9a15a7e', 'be.vvksm.groepsadmin.model.column.StraatnaamColumn', 'be.vvksm.groepsadmin.model.column.StraatnummerColumn', 'be.vvksm.groepsadmin.model.column.BusColumn', 'be.vvksm.groepsadmin.model.column.GemeenteColumn', 'be.vvksm.groepsadmin.model.column.PostcodeColumn', 'be.vvksm.groepsadmin.model.column.GsmColumn', 'be.vvksm.groepsadmin.model.column.TelefoonColumn'],
      //'groepen': [],
      //'sortering': ['be.vvksm.groepsadmin.model.column.VoornaamColumn', 'be.vvksm.groepsadmin.model.column.AchternaamColumn', 'be.vvksm.groepsadmin.model.column.EmailColumn'],
      //'type': 'groep',
      //'links': [{
      //  'rel': 'self',
      //  'href': 'https://groepsadmin.scoutsengidsenvlaanderen.be/groepsadmin/rest-ga/ledenlijst/filter/39a96d045d6c34dc015d80aecb4a5b1f',
      //  'method': 'GET',
      //  'secties': [],
      //}],
    };

    // Update current filter
    fetch('https://groepsadmin.scoutsengidsenvlaanderen.be/groepsadmin/rest-ga/ledenlijst/filter/huidige', _.assign({}, fetchOptions, {
      body,
      'method': 'PATCH',
    })).then(callGroepsadmin).catch(error => {
      console.log(error);
    });

  }, (errorObject) => {
    console.log("The read failed: " + errorObject.code);
  });
};

app.get('/:id/generateDocs', generateDocs);

app.get('/:id/sendMails', (req, res) => {
  res.send('TODO');
});

// We name this function "route", which you can see is
// still surfaced in the HTTP URLs below.
exports.documents = functions.https.onRequest(app);
