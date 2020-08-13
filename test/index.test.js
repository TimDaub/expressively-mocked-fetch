// @format
const { existsSync } = require("fs");
const spawnSync = require("child_process").spawnSync;

const test = require("ava");
const fetch = require("cross-fetch");

const createWorker = require("../src/index.js");

test("if module is loaded and executed", async t => {
  const worker = await createWorker(`
app.get('/', function (req, res) {
  res.send("OK");
});
  `);

  const res = await fetch(`http://localhost:${worker.port}`);
  const text = await res.text();

  t.assert(text === "OK");
  t.assert(res.status === 200);
  t.assert(!existsSync(worker.fileName));
  const processes = spawnSync("ps", ["-ax"]);
  t.assert(!processes.stdout.toString().includes(worker.fileName));
});

test("if server remains up with overwritten defaultCount option", async t => {
  const counts = 3;
  const worker = await createWorker(
    `
app.get('/', function (req, res) {
  res.send("OK");
});
  `,
    counts
  );

  const requests = await Promise.all([
    fetch(`http://localhost:${worker.port}`),
    fetch(`http://localhost:${worker.port}`),
    fetch(`http://localhost:${worker.port}`)
  ]);
  t.assert(requests[0].status === 200);
  t.assert(requests[1].status === 200);
  t.assert(requests[2].status === 200);
  t.assert(!existsSync(worker.fileName));
  const processes = spawnSync("ps", ["-ax"]);
  t.assert(!processes.stdout.toString().includes(worker.fileName));
});

test("reacting to a response text body", async t => {
  const worker = await createWorker(
    `
app.post('/', function (req, res) {
  res.send(req.body);
});
  `
  );
  const body = JSON.stringify({ hello: "world" });
  const res = await fetch(`http://localhost:${worker.port}`, {
    method: "POST",
    body
  });
  const text = await res.text();
  t.assert(text === body);
});

test("reacting to a response json body", async t => {
  const worker = await createWorker(
    `
  app.post('/', function (req, res, next) {
      res.json(req.body)
  })
`
  );
  const body = { hello: "world" };
  const res = await fetch(`http://localhost:${worker.port}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const obj = await res.json();
  t.deepEqual(obj, body);
});
