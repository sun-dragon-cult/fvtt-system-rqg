import { Actors, Items } from "./dist/template.js";
import fs from "fs";

const template = {
  Actor: {
    types: Object.keys(Actors),
    ...Actors,
  },
  Item: {
    types: Object.keys(Items),
    ...Items,
  },
};

fs.writeFile("./dist/template.json", JSON.stringify(template), (err) => {
  if (err) return console.log(err);
  console.log("Converted template.js -> template.json");
  fs.rm("./dist/template.js", (err) => { if (err) return console.log(err)});
});
