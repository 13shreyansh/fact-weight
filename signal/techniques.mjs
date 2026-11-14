export const techniques = [
  "Fear appeal",
  "Loaded language",
  "False attribution",
  "Fabricated authority",
  "Whataboutism",
  "Claims of inevitable victory",
  "Demonisation",
  "False dilemma",
  "Conspiracy framing",
  "Appeal to authority",
  "Ridicule",
];
export const techniqueName = (name) =>
  techniques.find((t) => t.toLowerCase() === String(name || "").toLowerCase());
