const http         = require("http");
const Props        = require("properties");
const childProcess = require("child_process");
const fs           = require("fs");
const Url          = require("url");

const filePath = "/synthea/src/main/resources/synthea.properties";

function loadConfig() {
    return Props.parse(
        fs.readFileSync(filePath, "utf8"),
        { namespaces: false }
    );
}

function saveConfig(data) {
    fs.writeFileSync(filePath, Props.stringify(data), "utf8");
}

const server = http.createServer((request, response) => {
    let url = Url.parse(request.url, true);
    if (url.pathname != "/") {
        response.writeHead(404);
        return response.end("Not Found");
    }
    let cfg   = loadConfig();
    let query = url.query;
    let stu   = query.stu == "2" ? 2 : 3;
    let num   = parseInt(query.p || "1", 10);

    if (isNaN(num) || !isFinite(num) || num < 1) {
        response.writeHead(400);
        return response.end("Invalid p parameter");
    }

    if (num > 100000) {
        response.writeHead(400);
        return response.end("Invalid p parameter. We cannot generate more than 100000 patients");
    }

    cfg["exporter.ccda.export"]                    = false;
    cfg["exporter.fhir.use_shr_extensions"]        = false;
    cfg["exporter.csv.export"]                     = false;
    cfg["exporter.text.export"]                    = false;
    cfg["exporter.cost_access_outcomes_report"]    = false;
    cfg["exporter.prevalence_report"]              = false;
    cfg["generate.append_numbers_to_person_names"] = false;
    cfg["exporter.fhir.export"]                    = stu == 3;
    cfg["exporter.fhir_dstu2.export"]              = stu == 2;

    saveConfig(cfg);

    let proc = childProcess.execFile("/synthea/run_synthea", ["-p", num + ""], {
        cwd  : "/synthea/",
        stdio: "inherit"
    });

    proc.stdout.pipe(response);
    proc.stderr.pipe(response);
});

server.listen({ host: '0.0.0.0', port: 80 }, () => {
    console.log(`Synthea server listening on %o`, server.address());
});
