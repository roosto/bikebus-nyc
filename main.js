const server = require('./server.js')

// Run the server and report out to the logs
server.listen(
  { port: process.env.PORT, host: "0.0.0.0" },
  function (err, address) {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
    console.log(`Your app is listening on ${address}`);
    server.log.info(`server listening on ${address}`);
  }
);
