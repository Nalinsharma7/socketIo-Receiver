const net = require("net");
const fs = require("fs");
const msilparser = require("./msilparser-s");
require("winston-daily-rotate-file");

var winston = require("winston");

winston.loggers.add("logger", {
  transports: [
    //new files will be generated each day, the date patter indicates the frequency of creating a file.
    new winston.transports.DailyRotateFile({
      name: "info-log",
      filename: "Reqlogs",
      dirname: "./log",
      //level: '<level>',
      prepend: true,
      maxSize: "2mb",
      //datePattern: '<pattern>',
      // maxFiles: 100,
    }),
  ],
});

// const data =
//   "$,NR,01,L,2.8,358943052850277,1,13062023,015423,12.956027,N,077.637123,E,05,20,001.7,1,C,12.5,1,00.3,0000.0,00.0,0107080000010000,NA,0001020000010000,NA,NA,NA,0202030000040000,0405060000070000,NA,NA,0507080000140000,NA,NA,0007080000010000,NA,NA,NA,NA,NA,NA,NA,NA,NA,NA,080808080808080808,NA,000000000,NA, 0043 0043 0043 0043 0044 0043 0042 0042 0043 0043, 0014 0014 0013 0014 0014 0012 0013 0014 0014 0013, 0111 0112 0111 0111 0112 0112 0111 0111 0112 0111,0003000000000004001500000000003900000000,0000000000460000000000370006002500240000,0000000000000003004700040019002800000000,2,BSNL MO,0,0,028145,86,* ";
// var response = msilparser.parser(data);

// console.log("--------------------------", response);

const server = net.createServer((socket) => {
  try {
    console.log("Client connected");

    socket.on("data", (data) => {
      server.timeout = 0;

      // let strin = data[data];
      console.log(`Received data: ${data}`);
      // fs.appendFileSync("file.txt", "\n" + data);
      var logger = winston.loggers.get("logger");
      // var response = msilparser.parser(data);
      // console.log(response);
      // logger.info(JSON.stringify(data));
      // console.log(data);
      let entry = data.toString();
      logger.info(JSON.stringify(entry));
      // logger.info(JSON.stringify(response));
    });

    socket.on("end", () => {
      console.log("Client disconnected");
    });
    socket.end();
  } catch (err) {
    console.log("ERROR-->", err);
  }
});

server.listen(3000, () => {
  console.log("Server listening on port 3000");
});
