let express = require("express");
let app = express();
app.use(express.json());
let { open } = require("sqlite");
let sqlite3 = require("sqlite3");
let path = require("path");
let dbpath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
let jwt = require("jsonwebtoken");
let bcrypt = require("bcrypt");

const initializServerAndDb = async () => {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server linitialized at 3000");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

initializServerAndDb();

app.post("/login", async (request, response) => {
  let { username, password } = request.body;
  let que = `SELECT * FROM user WHERE username = '${username}';`;
  let res = await db.get(que);
  if (res === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    let pass = await bcrypt.compare(password, res.password);
    if (pass === true) {
      let payload = {
        username: username,
      };
      let jsToken = jwt.sign(payload, "My_secret_token");
      response.send({ jsToken });
      console.log(jsToken);
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const Autentication = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "My_secret_token", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

let converSankeToCamel = (object) => {
  return {
    stateId: object.state_id,
    stateName: object.state_name,
    population: object.population,
  };
};

let disconverSankeToCamel = (object) => {
  return {
    districtId: object.district_id,
    districtName: object.district_name,
    stateId: object.state_id,
    cases: object.cases,
    cured: object.cured,
    active: object.active,
    deaths: object.deaths,
  };
};

//get1
app.get("/states/", Autentication, async (request, Response) => {
  let getQueury = `
        SELECT 
            *
        FROM 
            state;
    `;
  let resultpromise = await db.all(getQueury);
  let result = [];
  for (let item of resultpromise) {
    let converted = converSankeToCamel(item);
    result.push(converted);
  }
  Response.send(result);
});

//getone2
app.get("/states/:stateId/", Autentication, async (request, Response) => {
  let { stateId } = request.params;
  let getQueury = `
        SELECT 
            *
        FROM 
            state
        WHERE
            state_id = ${stateId};    
    `;
  let resultpromise = await db.get(getQueury);
  let result = converSankeToCamel(resultpromise);

  Response.send(result);
});
//post3
app.post("/districts/", Autentication, async (request, Response) => {
  let { districtName, stateId, cases, cured, active, deaths } = request.body;
  let postQuery = `
        INSERT INTO district
            (district_name, state_id, cases, cured,active,deaths)
            VALUES('${districtName}','${stateId}','${cases}','${cured}','${active}','${deaths}');
    `;
  await db.run(postQuery);
  Response.send("District Successfully Added");
});

//getdisone4
app.get("/districts/:districtId/", Autentication, async (request, Response) => {
  let { districtId } = request.params;
  let getQueury = `
        SELECT 
            *
        FROM 
            district
        WHERE
            district_id = ${districtId};    
    `;
  let resultpromise = await db.get(getQueury);

  Response.send(disconverSankeToCamel(resultpromise));
});
//delete5
app.delete(
  "/districts/:districtId/",
  Autentication,
  async (request, Response) => {
    let { districtId } = request.params;
    let deleteQuery = `
        DELETE FROM district WHERE district_id = ${districtId};
    `;
    await db.run(deleteQuery);
    Response.send("District Removed");
  }
);
//put6

app.put("/districts/:districtId/", Autentication, async (request, Response) => {
  let { districtName, stateId, cases, cured, active, deaths } = request.body;
  let { districtId } = request.params;
  let updateQuery = `
       UPDATE district
       SET
            district_name = '${districtName}',
            state_id = '${stateId}',
            cases = '${cases}',
            cured = '${cured}',
            active = '${active}',
            deaths = '${deaths}'
        WHERE district_id = ${districtId};
    `;
  await db.run(updateQuery);
  Response.send("District Details Updated");
});

//get7
app.get("/states/:stateId/stats/", Autentication, async (request, Response) => {
  let { stateId } = request.params;
  let getQueury = `
        SELECT 
            SUM(cases) AS totalCases,
           SUM(cured) AS totalCured,
            SUM(active) AS totalActive,
            SUM(deaths) AS totalDeaths
        FROM 
            district
        WHERE
            state_id = ${stateId};    
    `;
  let resultpromise = await db.get(getQueury);
  Response.send(resultpromise);
});

module.exports = app;
