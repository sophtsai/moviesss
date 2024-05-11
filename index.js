const portNumber = 3000;
const path = require("path");
const express = require("express");
const app = express();
app.set("views", path.resolve(__dirname, "views/templates"));
app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (request, response) => {
  response.render("index");
});

app.get("/movies", (request, response) => {
  response.render("movies");
});

console.log(`Web server started and running at http://localhost:${portNumber}`);
app.listen(portNumber);
