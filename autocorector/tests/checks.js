/* eslint-disable no-invalid-this*/
/* eslint-disable no-undef*/
// IMPORTS
const path = require("path");
const Utils = require("../utils/testutils");
const User = require('../../user.json');
const fs = require("fs");
const {promisify} = require("util");
const readfile = promisify(fs.readFile);

let dbname = "todos_remote";
let nano;
let bbdd;

const T_TEST = 2 * 60; // Time between tests (seconds)
const path_assignment = path.resolve(path.join(__dirname, "../../", "index.html"));
const path_assignment2 = path.resolve(path.join(__dirname, "../../", "/js/app.js"));
let contentindex;
let contentapp;

// CRITICAL ERRORS
let error_critical = null;

let withDebug = true;
const debug = (...args) => {
    if(withDebug){
      console.log(...args);
    }
}

const to = function to(promise) {
    return promise
        .then(data => {
            return [null, data];
        })
        .catch(err => [err]);
};

// TESTS
describe("Sample test", function () {

    this.timeout(T_TEST * 1000);

    before(async function() {
      console.log("COMPROBACIONES PREVIAS")
      console.log("Comprobando que la base de datos está arrancada y acepta conexiones...")

      try {
          nano = require('nano')('http://127.0.0.1:5984');
          console.log("La base de datos está ok, hemos conseguido conectar!");
          console.log("\n\n");
      } catch (err) {
          console.log("ERR", err);
          console.log("No se ha podido conectar al servidor de CouchDB, comprueba que ejecutaste el demonio y que el puerto está libre y la base de datos quedó a la espera de conexiones en el puerto 5984.");
          console.log("Puedes hacer esta comprobación accediendo con tu navegador a http://localhost:5984/_utils");
      }
    });

    it("(Precheck): Comprobando que existe la base de datos en CouchDB...", async function () {
        this.name = "";
        this.score = 0;
        this.msg_ok = `La base de datos "${dbname}" existe.`;
        this.msg_err = `No se encontró la base de datos "${dbname}"`;
        bbdd = await nano.db.get(dbname);
        debug(bbdd);
        should.exist(bbdd);
    });

    it("(Precheck): Comprobando que existe el fichero index.html y js/app.js de la entrega...", async function () {
        this.name = ``;
        this.score = 0;
        this.msg_ok = `Encontrado el fichero '${path_assignment}'`;
        this.msg_err = `No se encontró el fichero '${path_assignment}'`;
        let fileexists = await Utils.checkFileExists(path_assignment);
        if (!fileexists) {
            error_critical = this.msg_err;
        }
        fileexists.should.be.equal(true);

        this.msg_ok = `Encontrado el fichero '${path_assignment2}'`;
        this.msg_err = `No se encontró el fichero '${path_assignment2}'`;
        fileexists = await Utils.checkFileExists(path_assignment2);
        if (!fileexists) {
            error_critical = this.msg_err;
        }
        fileexists.should.be.equal(true);
        //read the two files and store them for futher checks
        contentindex = await readfile(path_assignment, 'utf8');
        contentapp = await readfile(path_assignment2, 'utf8');
    });

    it("1: Comprobando que existe en CouchDB el documento con el email del alumno en el campo title", async function () {
        this.name = "";
        this.score = 1;
        this.msg_ok = `Se ha encontrado el documento correctamente.`;
        this.msg_err = `No se ha encontrado el documento con el email "${User.email}"`;
        debug("USER:", User.email);
        bbdd = nano.use(dbname);
        const q = { selector: { title: {  "$eq": User.email }}};
        const result = await bbdd.find(q);

        debug("Doc encontrado", result);
        result.docs.length.should.be.equal(1);
    });

    it("2: Comprobando que la página carga PouchDB", async function () {
        this.name = "";
        this.score = 1;
        this.msg_ok = `La página carga pouchdb correctamente.`;
        this.msg_err = `La página index.html NO carga pouchdb correctamente.`;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            let regularexp = /pouchdb.js|pouchdb.min.js/;
            regularexp.test(contentindex).should.be.equal(true);
        }
    });

    it("3: Comprobando que la página app.js crea una BBDD PouchDB", async function () {
        this.name = "";
        this.score = 2;
        this.msg_ok = `La página crea una BBDD pouchdb correctamente.`;
        this.msg_err = `La página app.js NO crea una BBDD pouchdb correctamente.`;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            let regularexp = /=\s+new\s+PouchDB/;
            regularexp.test(contentapp).should.be.equal(true);
        }
    });

    it("4: Comprobando que se replica PouchDB local en CouchDB remoto", async function () {
        this.name = "";
        this.score = 2;
        this.msg_ok = `Se replica pouchdb correctamente.`;
        this.msg_err = `NO se replica pouchdb correctamente.`;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            let regularexp = /db.replicate.to/;
            regularexp.test(contentapp).should.be.equal(true);
            regularexp = /db.replicate.from/;
            regularexp.test(contentapp).should.be.equal(true);
        }
    });

    it("5: Comprobando que se inserta y se edita un TODO en pouchdb", async function () {
        this.name = "";
        this.score = 2;
        this.msg_ok = `Se inserta y se edita un TODO correctamente.`;
        this.msg_err = `NO se inserta o edita un TODO con db.put correctamente.`;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            let regularexp = /db.put/g;
            let ocurrencias = contentapp.match(regularexp).length;
            ocurrencias.should.be.above(1);
        }
    });

    it("6: Comprobando que se borra un TODO en pouchdb", async function () {
        this.name = "";
        this.score = 2;
        this.msg_ok = `Se borra un TODO correctamente.`;
        this.msg_err = `NO se borra un TODO con db.remove correctamente.`;
        if (error_critical) {
            this.msg_err = error_critical;
            should.not.exist(error_critical);
        } else {
            let regularexp = /db.remove/;
            regularexp.test(contentapp).should.be.equal(true);
        }
    });

});
