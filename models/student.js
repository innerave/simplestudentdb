const mongoose = require("mongoose");
var Schema = mongoose.Schema;

let studentScheme = new mongoose.Schema({
  name: String,
  institute: String,
  department: String,
  group: String,
  filesid: [Schema.Types.ObjectId],
});

module.exports = mongoose.model("Student", studentScheme);
